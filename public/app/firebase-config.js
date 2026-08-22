/* ============================================================
   firebase-config.js — chaves do projeto Firebase "painel-e5373".
   (Chaves web do Firebase são públicas por design; a segurança
   real está nas regras do Firestore em ../firestore.rules.)
   ============================================================ */
// Obs.: o app usa só Auth + Firestore (nenhuma página carrega o SDK do Realtime
// Database e nada chama .database()), por isso não há databaseURL aqui.
/* authDomain = o MESMO domínio em que o app está aberto.
   Por quê: se o handler do login mora em outro domínio (o padrão
   painel-e5373.firebaseapp.com), o Safari/iOS trata os dados dele como
   "cookie de terceiro" e bloqueia (ITP) — o signInWithRedirect não volta.
   E no app instalado na tela de início do iPhone o popup nem abre, então
   o login com Google ficava impossível lá. Todo site do Firebase Hosting
   já serve /__/auth/* sozinho, então usar o hostname atual resolve.
   IMPORTANTE: cada domínio precisa estar em Authentication → Settings →
   Authorized domains no console do Firebase. */
(function () {
  var padrao = "painel-e5373.firebaseapp.com";
  var h = (typeof location !== "undefined" && location.hostname) || "";
  // só confia em domínios do próprio Firebase Hosting; qualquer outro usa o padrão
  var proprio = /\.web\.app$/.test(h) || /\.firebaseapp\.com$/.test(h);
  window._authDomain = proprio ? h : padrao;
})();
window.firebaseConfig = {
  apiKey: "AIzaSyD-nMbBNsHCr2nBq5hJrGcUqarLh9xtJxg",
  authDomain: window._authDomain,
  projectId: "painel-e5373",
  storageBucket: "painel-e5373.firebasestorage.app",
  messagingSenderId: "846328530027",
  appId: "1:846328530027:web:9fa49346a4e8ad5e7b1d2e"
};
