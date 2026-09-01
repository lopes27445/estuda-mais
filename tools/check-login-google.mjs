/* ============================================================
   check-login-google.mjs — "o login com Google está liberado neste domínio?"

   Um domínio só funciona se estiver em DUAS listas, em consoles diferentes
   (ver o comentário em public/app/firebase-config.js). Esquecer a segunda já
   quebrou o login duas vezes, e o sintoma é uma tela do Google — o app nem
   chega a ser avisado, então não há erro no console do navegador para achar.

   Esta ferramenta pergunta ao próprio Google, sem login e sem credencial:
   monta a MESMA URL de autorização que o app monta e vê se o Google devolve
   a tela de entrar (registrado) ou a de erro (faltando).

   Uso:  node tools/check-login-google.mjs [dominio ...]
   ============================================================ */
const API_KEY = "AIzaSyD-nMbBNsHCr2nBq5hJrGcUqarLh9xtJxg";

const DOMINIOS = process.argv.slice(2).length ? process.argv.slice(2) : [
  "painel-e5373-lab2.web.app",   // beta — onde este repo publica
  "painel-e5373.web.app",        // produção
  "painel-e5373.firebaseapp.com" // domínio padrão do projeto (fallback do config)
];

/* Lista 1 — Firebase Console → Authentication → Authorized domains.
   Se faltar aqui, o erro que chega ao app é auth/unauthorized-domain. */
async function lista1() {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${API_KEY}`);
  if (!r.ok) throw new Error(`getProjectConfig HTTP ${r.status}`);
  return (await r.json()).authorizedDomains || [];
}

/* Lista 2 — Google Cloud Console → Credenciais → cliente OAuth 2.0 →
   "URIs de redirecionamento autorizados". Se faltar aqui, o usuário vê
   "Erro 400: redirect_uri_mismatch" numa página do Google e nunca volta. */
async function lista2(dominio) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ providerId: "google.com", continueUri: `https://${dominio}/__/auth/handler` })
  });
  if (!r.ok) throw new Error(`createAuthUri HTTP ${r.status}`);
  const { authUri } = await r.json();

  const g = await fetch(authUri, { redirect: "follow" });
  // O Google recusa antes de pedir senha, então dá pra ver sem estar logado:
  // recusou => cai em /signin/oauth/error com o motivo em base64 no authError.
  if (!/\/signin\/oauth\/error/.test(g.url)) return { ok: true };
  const b64 = new URL(g.url).searchParams.get("authError") || "";
  const cru = Buffer.from(b64, "base64").toString("utf8");
  return { ok: false, motivo: (cru.match(/[a-z_]{6,}/) || ["motivo desconhecido"])[0] };
}

const autorizados = await lista1();
let falhas = 0;

for (const d of DOMINIOS) {
  const l1 = autorizados.includes(d);
  let l2;
  try { l2 = await lista2(d); } catch (e) { l2 = { ok: false, motivo: e.message }; }
  const ok = l1 && l2.ok;
  if (!ok) falhas++;
  console.log(`${ok ? "OK  " : "FALHA"} ${d}`);
  if (!l1) console.log(`      lista 1 (Firebase → Authentication → Authorized domains): adicionar ${d}`);
  if (!l2.ok) console.log(`      lista 2 (Cloud Console → cliente OAuth 2.0): adicionar https://${d}/__/auth/handler  [${l2.motivo}]`);
}

if (falhas) {
  console.log(`\n${falhas} domínio(s) com problema. Quem abrir o app por eles não entra com Google.`);
  console.log("Cuidado ao editar a lista 2: SOMAR o URI novo, não substituir o que já está lá.");
  process.exitCode = 1;
} else {
  console.log("\nTodos os domínios liberados nas duas listas.");
}
