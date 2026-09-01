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

   O Firebase registra sozinho só o domínio PADRÃO do projeto. Site secundário
   de Hosting (o lab2) NÃO entra sozinho na lista 2 — foi isso que quebrou o
   login no beta em 26/08/2026.

   NÃO confie na memória sobre o que está registrado: as duas listas mudam por
   fora do repositório. Rode `node tools/check-login-google.mjs`, que pergunta
   ao próprio Google, domínio por domínio.

   Estado medido em 31/08/2026 pela ferramenta acima:
     painel-e5373-lab2.web.app    → OK nas duas listas
     painel-e5373.web.app         → OK nas duas listas
     painel-e5373.firebaseapp.com → está na lista 1, FALTA na lista 2
   Ou seja: o domínio padrão do projeto saiu dos URIs de redirecionamento
   (provável edição que substituiu em vez de somar, quando o lab2 foi
   adicionado). Por isso o fallback abaixo aponta para painel-e5373.web.app,
   e não mais para o .firebaseapp.com: um endereço fora do Hosting (localhost,
   domínio próprio no futuro) cairia num handler que o Google recusa. */
(function () {
  // fallback verificado como registrado nas DUAS listas — ver comentário acima
  var padrao = "painel-e5373.web.app";
  var h = (typeof location !== "undefined" && location.hostname) || "";
  // só confia em domínios de Hosting DESTE projeto; qualquer outro usa o padrão
  var proprio = /^painel-e5373(-[a-z0-9-]+)?\.(web\.app|firebaseapp\.com)$/.test(h);
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
