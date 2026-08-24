/* Service Worker — offline + atualização automática.
   - HTML e JS do app (conteúdo que muda): NETWORK-FIRST (sempre pega o novo
     quando tem internet; cai pro cache se estiver offline).
   - Ícones/manifest e o SDK do Firebase (gstatic): cache-first (são estáveis).
   - NÃO intercepta chamadas do Firestore/Auth (googleapis) — o SDK cuida do offline. */
const CACHE = "painel-lab-v15";
const SHELL = [
  "./",
  "./index.html",
  "./notas.html",
  "./estudos.html",
  "./admin.html",
  "./vestibular.html",
  "./manifest.webmanifest",
  "./app/cloud.js",
  "./app/firebase-config.js",
  "./app/notas.app.js",
  "./app/estudos.app.js",
  "./app/admin.app.js",
  "./app/calparse.js",
  "./app/theme.js",
  "./app/vendor/jspdf.umd.min.js",
  "./app/vendor/pdf.min.mjs",
  "./app/vendor/pdf.worker.min.mjs",
  "./app/vendor/mammoth.browser.min.js",
  "./app/vestibular.app.js",
  "./app/gabaritos.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function putCache(req, res) {
  if (res && res.status === 200) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Deixa passar direto: APIs do Firebase (dados/auth em tempo real)
  const bypass = /googleapis|firebaseio|identitytoolkit|firestore|firebaseinstallations/;
  if (bypass.test(url.hostname) || bypass.test(url.pathname)) return;

  const sameOrigin = url.origin === self.location.origin;
  const isSDK = url.hostname === "www.gstatic.com";
  if (!sameOrigin && !isSDK) return;

  // conteúdo que muda (HTML + JS do app) → network-first.
  // /app/vendor/ fica de fora: são bibliotecas de terceiros com versão fixa no
  // nome do diretório, nunca mudam sem troca de arquivo, e são grandes demais
  // (o worker do PDF.js sozinho passa de 1 MB) pra revalidar a cada carga.
  const isVendor = url.pathname.startsWith("/app/vendor/");
  const isAppCode = sameOrigin && !isVendor && (req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.startsWith("/app/"));
  if (isAppCode) {
    e.respondWith(fetch(req).then((res) => putCache(req, res)).catch(() => caches.match(req)));
    return;
  }

  // estáticos estáveis (ícones, manifest, SDK) → cache-first
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => putCache(req, res))));
});
