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

   IMPORTANTE — cada domínio novo precisa ser registrado em DOIS lugares
   diferentes, em consoles diferentes. Só um não basta:

   1. Firebase Console → Authentication → Settings → Authorized domains
      Adicionar o domínio. Se faltar, o erro é `auth/unauthorized-domain`.

   2. Google Cloud Console → APIs e serviços → Credenciais → cliente OAuth 2.0
      Adicionar `https://<domínio>/__/auth/handler` em "URIs de redirecionamento
      autorizados", e `https://<domínio>` em "Origens JavaScript autorizadas".
      Se faltar, o erro é `Erro 400: redirect_uri_mismatch`.

   O Firebase registra automaticamente só o domínio PADRÃO do projeto. Site
   secundário de Hosting (o beta, por exemplo) NÃO entra sozinho na lista 2 —
   e foi exatamente isso que quebrou o login com Google no beta em 26/08/2026,
   quando este arquivo (com o authDomain dinâmico) chegou lá. Antes disso o beta
   usava o domínio padrão, que já estava registrado, e por isso funcionava. */
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
