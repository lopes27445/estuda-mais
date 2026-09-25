/* ============================================================
   conta.js — criar conta e recuperar senha (conta.html)

   Por que uma página separada (25/09/2026): as duas ações moravam dentro do
   card de login do cloud.js, como vistas que trocavam no mesmo lugar. Na
   produção nem isso — "Criar conta" e "Esqueci a senha" eram dois links que
   agiam direto sobre os campos de login, e sem e-mail digitado a única
   resposta era uma linha vermelha de 12px. O relato era "não funciona".

   E o e-mail de recuperação, quando saía, saía em INGLÊS ("Reset your
   password for…"), de um remetente noreply@painel-e5373.firebaseapp.com que o
   aluno nunca viu: cara de golpe, e a pessoa apaga. `auth.languageCode` abaixo
   faz o Firebase mandar o modelo em português.

   Nada de script embutido no HTML: tudo aqui, para esta página já nascer
   compatível com uma CSP sem 'unsafe-inline'.
   ============================================================ */
(function () {
  "use strict";

  /* tema antes do primeiro paint — este arquivo é carregado no <head> */
  (function () {
    var t = null, h = document.documentElement;
    try { t = localStorage.getItem("educa-theme"); } catch (e) {}
    if (t === "light") h.classList.add("light");
    else if (t === "dark") h.classList.remove("light");
    else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) h.classList.add("light");
  })();

  /* ---------------- regras puras (testadas em test/conta.test.mjs) -------- */

  /* Para onde o "voltar" leva. Lista FECHADA de propósito: aceitar qualquer
     valor de ?volta= transformaria esta página num redirecionador aberto —
     alguém manda um link "estuda+ … conta.html?volta=https://site-falso" e o
     aluno, depois de criar a conta de verdade, cai numa tela de login falsa. */
  var PAGINAS = ["index.html", "notas.html", "estudos.html", "vestibular.html", "admin.html"];
  function voltaSegura(v) {
    v = String(v || "");
    return PAGINAS.indexOf(v) >= 0 ? v : "index.html";
  }

  /* O Firebase aceita 6 caracteres. Aqui pedimos 8 com letra e número em
     conta NOVA — quem já tem conta não é afetado. A mesma política pode (e
     deve) ser ligada no console, para valer também fora deste formulário. */
  function regrasSenha(s) {
    s = String(s || "");
    return { tam: s.length >= 8, letra: /[A-Za-zÀ-ÿ]/.test(s), num: /\d/.test(s) };
  }
  function senhaOk(s) { var r = regrasSenha(s); return r.tam && r.letra && r.num; }

  function emailOk(e) {
    e = String(e || "");
    return e.length <= 254 && /^[^\s@<>"'()]{1,64}@[^\s@<>"'()]+\.[^\s@<>"'()]{2,}$/.test(e);
  }

  /* Nome vira displayName, e dali vai para matrícula, mural e tela do
     professor. Tira caractere de controle e sinal de tag na origem. */
  function nomeLimpo(n) {
    return String(n || "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
  }

  function mapErro(e) {
    var c = (e && e.code) || "";
    if (c === "auth/invalid-email") return "Esse e-mail não parece válido.";
    if (c === "auth/email-already-in-use") return "Esse e-mail já tem conta. Volte e entre com ele — ou use a aba \"Esqueci a senha\".";
    if (c === "auth/weak-password" || c === "auth/password-does-not-meet-requirements")
      return "Senha fraca: use pelo menos 8 caracteres, com letra e número.";
    if (c === "auth/too-many-requests") return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
    if (c === "auth/network-request-failed") return "Sem conexão. Confira a internet e tente de novo.";
    if (c === "auth/operation-not-allowed") return "Cadastro por e-mail está desligado no sistema. Avise a coordenação.";
    if (c === "auth/missing-email") return "Digite o e-mail da sua conta.";
    return "Não deu certo agora (" + (c || "erro desconhecido") + "). Tente de novo em instantes.";
  }

  window.ContaUtil = { voltaSegura: voltaSegura, regrasSenha: regrasSenha, senhaOk: senhaOk,
                       emailOk: emailOk, nomeLimpo: nomeLimpo, mapErro: mapErro };

  /* ---------------- página ---------------- */
  if (typeof document === "undefined" || !document.getElementById) return;

  var auth = null;
  var acabouDeCriar = false;
  var volta = "index.html";

  function $(id) { return document.getElementById(id); }
  function mostra(qual) {
    ["v-logado", "v-criar", "v-criada", "v-recuperar", "v-enviado"].forEach(function (id) {
      var el = $(id); if (el) el.hidden = (id !== qual);
    });
    var abas = qual === "v-criar" || qual === "v-recuperar" || qual === "v-logado";
    var tabs = document.querySelector(".tabs"); if (tabs) tabs.hidden = !abas;
    var ehRec = qual === "v-recuperar" || qual === "v-enviado";
    $("tab-criar").classList.toggle("on", !ehRec);
    $("tab-recuperar").classList.toggle("on", ehRec);
    document.title = "Estuda+ · " + (ehRec ? "Recuperar senha" : "Criar conta");
  }
  function ocupado(btn, sim, texto) {
    if (!btn) return;
    if (sim) { btn.dataset.txt = btn.textContent; btn.disabled = true; btn.textContent = texto || "Aguarde…"; }
    else { btn.disabled = false; if (btn.dataset.txt) btn.textContent = btn.dataset.txt; }
  }

  /* Link dos e-mails (confirmação e nova senha) volta para o app. Só em
     domínio do próprio projeto; se o Firebase recusar o endereço de retorno
     (domínio fora da lista de autorizados — hoje é o caso do lab3), manda
     sem retorno em vez de falhar: o e-mail chegar vale mais que o botão
     "continuar" dentro dele. */
  function ajustesDoLink() {
    var h = location.hostname || "";
    if (!/^painel-e5373(-[a-z0-9-]+)?\.(web\.app|firebaseapp\.com)$/.test(h)) return null;
    return { url: location.origin + "/" + volta };
  }
  function comRetorno(fn) {
    var s = ajustesDoLink();
    return fn(s || undefined).catch(function (e) {
      var c = (e && e.code) || "";
      if (s && /continue-uri|unauthorized-domain|invalid-dynamic-link|argument-error/.test(c)) return fn(undefined);
      throw e;
    });
  }

  function rota() {
    var h = (location.hash || "").replace("#", "");
    if (h === "recuperar") { mostra("v-recuperar"); focar("r-email"); return; }
    var u = auth && auth.currentUser;
    if (u && !acabouDeCriar) { $("logado-email").textContent = u.email || "(sem e-mail)"; mostra("v-logado"); return; }
    mostra("v-criar"); focar("c-nome");
  }
  function focar(id) { var el = $(id); if (el && el.focus) try { el.focus({ preventScroll: true }); } catch (e) {} }

  function atualizaRegras() {
    var r = regrasSenha($("c-senha").value);
    Array.prototype.forEach.call(document.querySelectorAll("#c-regras li"), function (li) {
      li.classList.toggle("feito", !!r[li.getAttribute("data-r")]);
    });
  }

  function criar(ev) {
    ev.preventDefault();
    var erro = $("c-erro"); erro.textContent = "";
    var nome = nomeLimpo($("c-nome").value);
    var em = String($("c-email").value || "").trim();
    var s1 = $("c-senha").value || "", s2 = $("c-senha2").value || "";
    [$("c-nome"), $("c-email"), $("c-senha"), $("c-senha2")].forEach(function (x) { x.removeAttribute("aria-invalid"); });
    function falha(campo, msg) { campo.setAttribute("aria-invalid", "true"); erro.textContent = msg; focar(campo.id); }
    if (nome.length < 2) return falha($("c-nome"), "Diga como quer ser chamado(a).");
    if (!emailOk(em)) return falha($("c-email"), "Confira o e-mail — ele não parece válido.");
    if (!senhaOk(s1)) return falha($("c-senha"), "A senha precisa de pelo menos 8 caracteres, com letra e número.");
    if (s1 !== s2) return falha($("c-senha2"), "As duas senhas não são iguais.");

    var btn = $("c-enviar");
    ocupado(btn, true, "Criando…");
    acabouDeCriar = true;
    auth.createUserWithEmailAndPassword(em, s1)
      .then(function (cred) {
        var u = cred && cred.user;
        if (!u) return;
        // nome e e-mail de confirmação: falhar aqui NÃO desfaz a conta, que
        // já existe — a faixa dentro do app oferece reenviar a confirmação
        return u.updateProfile({ displayName: nome }).catch(function () {})
          .then(function () { return comRetorno(function (s) { return u.sendEmailVerification(s); }).catch(function () {}); });
      })
      .then(function () {
        ocupado(btn, false);
        $("criada-email").textContent = em;
        mostra("v-criada");
      })
      .catch(function (e) {
        acabouDeCriar = false;
        ocupado(btn, false);
        erro.textContent = mapErro(e);
        if (e && e.code === "auth/email-already-in-use") $("c-email").setAttribute("aria-invalid", "true");
      });
  }

  var ultimoEmail = "", esperaAte = 0, relogio = null;
  function enviarReset(em, btn, erroEl) {
    erroEl.textContent = "";
    ocupado(btn, true, "Enviando…");
    return comRetorno(function (s) { return auth.sendPasswordResetEmail(em, s); })
      .catch(function (e) {
        /* Mesma resposta exista ou não a conta (a proteção contra enumeração
           de e-mails está LIGADA no projeto — conferido em 25/09/2026). Dizer
           "esse e-mail não tem conta" entregaria quem é aluno da escola. */
        if (e && e.code === "auth/user-not-found") return;
        throw e;
      })
      .then(function () {
        ocupado(btn, false);
        ultimoEmail = em;
        $("enviado-email").textContent = em;
        mostra("v-enviado");
        segurarReenvio(60);
      })
      .catch(function (e) { ocupado(btn, false); erroEl.textContent = mapErro(e); });
  }
  /* Reenviar fica travado por um minuto: clique repetido não acelera nada e
     só leva a conta para o "too-many-requests" do Firebase. */
  function segurarReenvio(seg) {
    var b = $("enviado-reenviar");
    esperaAte = Date.now() + seg * 1000;
    clearInterval(relogio);
    function tic() {
      var falta = Math.ceil((esperaAte - Date.now()) / 1000);
      if (falta <= 0) { clearInterval(relogio); b.disabled = false; b.textContent = "Reenviar"; return; }
      b.disabled = true; b.textContent = "Reenviar em " + falta + "s";
    }
    tic(); relogio = setInterval(tic, 1000);
  }
  function recuperar(ev) {
    ev.preventDefault();
    var em = String($("r-email").value || "").trim();
    var erro = $("r-erro");
    $("r-email").removeAttribute("aria-invalid");
    if (!emailOk(em)) {
      $("r-email").setAttribute("aria-invalid", "true");
      erro.textContent = em ? "Esse e-mail não parece válido — confira se digitou certo." : "Digite o e-mail da sua conta.";
      focar("r-email"); return;
    }
    enviarReset(em, $("r-enviar"), erro);
  }

  function ligarAppCheck() {
    /* Mesma chave do cloud.js. Se um dia o App Check passar a EXIGIR token no
       Authentication e esta página não o tivesse, o cadastro quebraria
       justamente aqui, longe de onde alguém testaria. */
    var chave = window.APPCHECK_SITE_KEY;
    if (!chave) return;
    var s = document.createElement("script");
    s.src = "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-check-compat.js";
    s.onload = function () { try { firebase.appCheck().activate(chave, true); } catch (e) {} };
    document.head.appendChild(s);
  }

  function boot() {
    try { volta = voltaSegura(new URLSearchParams(location.search).get("volta")); } catch (e) { volta = "index.html"; }
    ["voltar", "logado-ir", "criada-ir", "enviado-voltar"].forEach(function (id) { var a = $(id); if (a) a.href = volta; });
    var tema = $("btn-theme"); if (tema && window.EducaTheme) tema.addEventListener("click", window.EducaTheme.toggle);

    Array.prototype.forEach.call(document.querySelectorAll(".olho"), function (b) {
      b.addEventListener("click", function () {
        var alvo = $(b.getAttribute("data-alvo")); if (!alvo) return;
        var ver = alvo.type === "password";
        alvo.type = ver ? "text" : "password";
        var par = $("c-senha2"); if (par && alvo.id === "c-senha") par.type = alvo.type;
        b.setAttribute("aria-label", ver ? "Esconder senha" : "Mostrar senha");
      });
    });
    $("c-senha").addEventListener("input", atualizaRegras);
    $("f-criar").addEventListener("submit", criar);
    $("f-recuperar").addEventListener("submit", recuperar);
    $("enviado-reenviar").addEventListener("click", function () {
      if (Date.now() < esperaAte || !ultimoEmail) return;
      enviarReset(ultimoEmail, $("enviado-reenviar"), $("enviado-erro"));
    });
    $("logado-sair").addEventListener("click", function () { if (auth) auth.signOut(); });

    // e-mail que a pessoa já tinha digitado no login (sessionStorage, nunca URL)
    try {
      var pre = sessionStorage.getItem("conta-email") || "";
      if (pre && emailOk(pre)) { $("c-email").value = pre; $("r-email").value = pre; }
    } catch (e) {}

    var cfg = window.firebaseConfig;
    if (!window.firebase || !cfg || !cfg.apiKey) {
      mostra("v-criar");
      $("c-erro").textContent = "Não consegui carregar o sistema de contas. Confira a internet e recarregue a página.";
      $("c-enviar").disabled = true; $("r-enviar").disabled = true;
      return;
    }
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    ligarAppCheck();
    auth = firebase.auth();
    auth.languageCode = "pt-BR";
    if (String(cfg.projectId || "").indexOf("demo-") === 0) {
      try { auth.useEmulator("http://127.0.0.1:9099", { disableWarnings: true }); } catch (e) {}
    }
    window.addEventListener("hashchange", rota);
    rota();
    auth.onAuthStateChanged(function () {
      var v = ["v-criada", "v-enviado"].filter(function (id) { return !$(id).hidden; });
      if (!v.length) rota();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
