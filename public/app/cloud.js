/* ============================================================
   cloud.js — camada de login (Google) + sincronização na nuvem
   Compartilhado pelos painéis (Notas / Estudos) e pela home.

   Estratégia: mantém o código dos apps INTACTO. Instala um "shim"
   de localStorage que redireciona SÓ as chaves do painel
   (keyPrefix) para um cache na nuvem (Firestore). Qualquer outra
   chave (ex.: a sessão do Firebase Auth) passa direto para o
   localStorage real. O app do painel só é injetado depois do
   login + dados carregados.
   ============================================================ */
(function () {
  "use strict";

  /* ---- Service Worker: registra e recarrega sozinho quando há versão nova ---- */
  if ("serviceWorker" in navigator) {
    var _refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (_refreshing) return; _refreshing = true; location.reload();
    });
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").then(function (reg) { reg.update(); }).catch(function () {});
    });
  }

  var CFG = window.CLOUD_PANEL || {}; // {panel, keyPrefix, appScript}  (home: só {home:true})
  var realLS = window.localStorage;   // referência ao localStorage REAL (antes do shim)

  // Marca do Estuda+ (barras subindo + check) — vetor, nítida em qualquer tamanho.
  var LOGO = '<svg class="elogo" viewBox="0 0 64 64" aria-hidden="true">'
    + '<rect x="6" y="31" width="10" height="21" rx="3.5" fill="#8fd99b"/>'
    + '<rect x="19" y="23" width="10" height="29" rx="3.5" fill="#54c163"/>'
    + '<rect x="32" y="15" width="10" height="37" rx="3.5" fill="#2fa64a"/>'
    + '<path d="M8 37 L25 50 L60 9" fill="none" stroke="#0f7a30" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>';
  window.EDUCA_LOGO = LOGO;

  var app, auth, db, user = null;
  var cache = {};        // shim store: chave -> string (só chaves do painel)
  var saveTimer = null;
  var appInjected = false;
  var els = {};

  /* ---------- util ---------- */
  function isPanelKey(k) { return CFG.keyPrefix && String(k).indexOf(CFG.keyPrefix) === 0; }
  function mirrorKey() { return "cloud:" + (user ? user.uid : "anon") + ":" + (CFG.panel || "home"); }

  /* ---------- shim de localStorage ---------- */
  function installShim() {
    var shim = {
      getItem: function (k) {
        if (isPanelKey(k)) return (k in cache) ? cache[k] : null;
        return realLS.getItem(k);
      },
      setItem: function (k, v) {
        if (isPanelKey(k)) { cache[k] = String(v); scheduleSave(); mirrorLocal(); }
        else realLS.setItem(k, v);
      },
      removeItem: function (k) {
        if (isPanelKey(k)) { delete cache[k]; scheduleSave(); mirrorLocal(); }
        else realLS.removeItem(k);
      },
      clear: function () { cache = {}; scheduleSave(); mirrorLocal(); },
      key: function (i) { return Object.keys(cache)[i] || null; },
      get length() { return Object.keys(cache).length; }
    };
    try { Object.defineProperty(window, "localStorage", { value: shim, configurable: true }); }
    catch (e) { /* se o navegador não deixar, o app cai no localStorage real (sem sync) */ }
  }

  function mirrorLocal() { // cópia local por-usuário (rede de segurança offline)
    try { realLS.setItem(mirrorKey(), JSON.stringify(cache)); } catch (e) {}
  }
  function loadMirror() {
    try { var m = realLS.getItem(mirrorKey()); if (m) cache = JSON.parse(m) || {}; } catch (e) {}
  }

  /* ---------- Firestore: doc por usuário ---------- */
  function docRef() {
    return db.collection("users").doc(user.uid).collection("panels").doc(CFG.panel);
  }
  function scheduleSave() {
    if (!user || !CFG.panel) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 600);
  }
  // Salva na nuvem imediatamente (usado por ações destrutivas como "Limpar tudo",
  // pra não depender do agendamento de 600ms). Tenta de novo 1x em caso de falha.
  function flush() {
    if (!user || !CFG.panel || !db) return;
    docRef().set({ blob: cache, updatedAt: Date.now() }).catch(function (e) {
      console.warn("[cloud] falha ao salvar (tentará de novo online):", e && e.message);
      clearTimeout(saveTimer);
      saveTimer = setTimeout(flush, 2000);
    });
  }
  function loadDoc() {
    return docRef().get().then(function (snap) {
      if (snap.exists && snap.data() && snap.data().blob) cache = snap.data().blob || {};
      else loadMirror(); // doc novo/vazio → tenta espelho local (ou fica {} = começa do zero)
    }).catch(function () { loadMirror(); });
  }

  /* ---------- injeta o app do painel ---------- */
  function injectApp() {
    if (appInjected || !CFG.appScript) return;
    appInjected = true;
    var s = document.createElement("script");
    s.src = CFG.appScript;
    document.body.appendChild(s);
  }

  /* ============================================================
     UI: overlay de login + chip do usuário (injetados por aqui,
     pra não mexer no HTML de cada painel)
     ============================================================ */
  function injectCSS() {
    var css = ""
      + "#cloud-boot{position:fixed;inset:0;z-index:9050;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;"
      + "background:radial-gradient(1200px 600px at 80% -10%,rgba(47,166,74,.10),transparent 60%),radial-gradient(900px 500px at -10% 110%,rgba(255,194,75,.06),transparent 55%),#0a0e16}"
      + "#cloud-boot .elogo{width:44px;height:44px;animation:cbpulse 1.3s ease-in-out infinite}"
      + "@keyframes cbpulse{0%,100%{opacity:.55}50%{opacity:1}}"
      + "#cloud-boot span{color:#8295b3;font-size:.82rem;letter-spacing:.3px}"
      + "#cloud-gate{position:fixed;inset:0;z-index:9000;display:none;align-items:center;justify-content:center;padding:24px;"
      + "background:radial-gradient(1200px 600px at 80% -10%,rgba(47,166,74,.10),transparent 60%),radial-gradient(900px 500px at -10% 110%,rgba(255,194,75,.06),transparent 55%),#0a0e16}"
      + "#cloud-gate .gcard{background:linear-gradient(180deg,#121a2b,#0f1626);border:1px solid #1e2a40;border-radius:18px;padding:30px 26px;max-width:360px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)}"
      + "#cloud-gate .gorb{width:56px;height:56px;border-radius:50%;margin:0 auto 16px;background:radial-gradient(circle at 35% 30%,#bff4ff,#2fa64a 45%,#17833a 75%,#06222e);box-shadow:0 0 22px rgba(47,166,74,.6),inset 0 0 14px rgba(255,255,255,.4)}"
      + "#cloud-gate h2{color:#e8eef7;font-size:1.35rem;font-weight:800;margin:0 0 6px}"
      + "#cloud-gate h2 span{color:#2fa64a}"
      + "#cloud-gate p{color:#8295b3;font-size:.9rem;line-height:1.5;margin:0 0 20px}"
      + "#cloud-gate .gbtn{display:inline-flex;align-items:center;gap:11px;background:#fff;color:#1f2937;border:none;border-radius:11px;"
      + "padding:12px 20px;font-size:.95rem;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(0,0,0,.3)}"
      + "#cloud-gate .gbtn:hover{filter:brightness(.97)}#cloud-gate .gbtn:disabled{opacity:.6;cursor:default}"
      + "#cloud-gate .gerr{color:#ff5b6e;font-size:.82rem;margin-top:14px;line-height:1.5;min-height:1em}"
      + "#cloud-gate .gnote{color:#54637e;font-size:.74rem;margin-top:18px;line-height:1.5}"
      + "#cloud-chip{position:fixed;top:12px;right:12px;z-index:8000;display:none;align-items:center;gap:8px;"
      + "background:rgba(18,26,43,.92);border:1px solid #1e2a40;border-radius:22px;padding:4px 6px 4px 4px;backdrop-filter:blur(4px)}"
      + "#cloud-chip img{width:28px;height:28px;border-radius:50%;flex:none}"
      + "#cloud-chip .cn{color:#e8eef7;font-size:.8rem;font-weight:600;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
      + "#cloud-chip button{background:transparent;border:1px solid #1e2a40;color:#8295b3;border-radius:14px;padding:3px 9px;font-size:.72rem;cursor:pointer;font-family:inherit}"
      + "#cloud-chip button:hover{color:#ff5b6e;border-color:#ff5b6e}"
      + "@media(max-width:520px){#cloud-chip .cn{max-width:78px}}"
      + "#cloud-lab{position:fixed;left:10px;bottom:10px;z-index:8000;background:#ff9f43;color:#241400;font-weight:800;font-size:.72rem;letter-spacing:.3px;padding:5px 11px;border-radius:20px;box-shadow:0 2px 12px rgba(0,0,0,.45)}"
      + "#cloud-lab.beta{background:#2fa64a;color:#04140b}"
      + "#cloud-chip .crole{font-size:.66rem;font-weight:800;text-transform:uppercase;letter-spacing:.4px;padding:2px 7px;border-radius:20px;background:#16223a;color:#8295b3}"
      + "#cloud-chip .crole.prof{background:rgba(47,166,74,.18);color:#2fa64a}#cloud-chip .crole.coord{background:rgba(255,194,75,.18);color:#ffc24b}"
      + "#cloud-onboard{position:fixed;inset:0;z-index:9100;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(1200px 600px at 80% -10%,rgba(47,166,74,.10),transparent 60%),radial-gradient(900px 500px at -10% 110%,rgba(255,194,75,.06),transparent 55%),#0a0e16}"
      + "#cloud-onboard .gcard{background:linear-gradient(180deg,#121a2b,#0f1626);border:1px solid #1e2a40;border-radius:18px;padding:28px 24px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)}"
      + "#cloud-onboard .gorb{width:52px;height:52px;border-radius:50%;margin:0 auto 14px;background:radial-gradient(circle at 35% 30%,#bff4ff,#2fa64a 45%,#17833a 75%,#06222e);box-shadow:0 0 22px rgba(47,166,74,.6),inset 0 0 14px rgba(255,255,255,.4)}"
      + "#cloud-onboard h2{color:#e8eef7;font-size:1.3rem;font-weight:800;margin:0 0 6px}#cloud-onboard h2 span{color:#2fa64a}"
      + "#cloud-onboard p{color:#8295b3;font-size:.88rem;line-height:1.5;margin:0 0 18px}"
      + "#cloud-onboard .ob-in{width:100%;background:#0c1322;border:1px solid #1e2a40;color:#e8eef7;border-radius:10px;padding:11px 10px;font-size:.95rem;font-family:inherit}"
      + "#cloud-onboard .gbtn{width:100%;justify-content:center;border:none;border-radius:11px;padding:12px;font-size:1rem;font-weight:800;cursor:pointer;font-family:inherit}"
      + "#cloud-onboard .ob-vestgrid{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:2px}"
      + "#cloud-onboard .ob-vestchip{background:#0c1322;border:1px solid #1e2a40;color:#8295b3;border-radius:9px;padding:7px 12px;font-size:.82rem;font-weight:700;cursor:pointer;user-select:none;transition:.1s}"
      + "#cloud-onboard .ob-vestchip:hover{border-color:#2c3e5e;color:#e8eef7}"
      + "#cloud-onboard .ob-vestchip.sel{background:#123020;color:#2fa64a;border-color:#17833a}"
      + ".ep-panel{background:linear-gradient(180deg,#121a2b,#0f1626);border:1px solid #1e2a40;border-left:4px solid #ffc24b;border-radius:16px;padding:20px;margin-top:22px}"
      + ".ep-panel h3{color:#e8eef7;font-size:1.05rem;margin:0 0 6px}.ep-hint{color:#8295b3;font-size:.85rem;line-height:1.5;margin-bottom:12px}"
      + ".ep-addrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ep-addrow input{flex:1;min-width:160px;background:#0c1322;border:1px solid #1e2a40;color:#e8eef7;border-radius:9px;padding:9px 10px;font-family:inherit;font-size:.88rem}"
      + ".ep-addrow select{background:#0c1322;border:1px solid #1e2a40;color:#e8eef7;border-radius:9px;padding:9px;font-family:inherit;font-size:.88rem}.ep-addrow button{background:linear-gradient(180deg,#2fa64a,#17833a);color:#04121a;border:none;border-radius:9px;padding:9px 16px;font-weight:800;cursor:pointer;font-family:inherit}"
      + ".ep-staffrow{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #1e2a40;font-size:.88rem;color:#e8eef7}.ep-staffrow button{background:none;border:1px solid #1e2a40;color:#8295b3;border-radius:8px;padding:4px 10px;font-size:.76rem;cursor:pointer;font-family:inherit}.ep-staffrow button:hover{color:#ff5b6e;border-color:#ff5b6e}"
      + "#cloud-gate .gdiv{display:flex;align-items:center;gap:10px;color:#54637e;font-size:.75rem;margin:16px 0 12px}#cloud-gate .gdiv:before,#cloud-gate .gdiv:after{content:'';flex:1;height:1px;background:#1e2a40}"
      + "#cloud-gate .ginp{width:100%;background:#0c1322;border:1px solid #1e2a40;color:#e8eef7;border-radius:10px;padding:11px 12px;font-size:.95rem;font-family:inherit;margin-bottom:9px}#cloud-gate .ginp:focus{outline:none;border-color:#2fa64a}"
      + "#cloud-gate .gbtn2{width:100%;background:linear-gradient(180deg,#2fa64a,#17833a);color:#04121a;border:none;border-radius:11px;padding:12px;font-size:.98rem;font-weight:800;cursor:pointer;font-family:inherit}#cloud-gate .gbtn2:hover{filter:brightness(1.05)}"
      + "#cloud-gate .glinks{display:flex;gap:8px;justify-content:center;align-items:center;margin-top:12px;font-size:.82rem}#cloud-gate .glinks a{color:#2fa64a;cursor:pointer;font-weight:600}#cloud-gate .glinks a:hover{text-decoration:underline}#cloud-gate .glinks span{color:#54637e}"
      + ".elogo{width:42px;height:42px;flex:none}"
      + ".gbrand{display:flex;align-items:center;justify-content:center;gap:11px;margin-bottom:4px}"
      + ".gwm{font-size:1.7rem;font-weight:800;letter-spacing:-.5px;color:#e8eef7}.gwm span{color:#2fa64a}"
      + ".gtag{color:#8295b3;font-size:.68rem;letter-spacing:.6px;text-align:center;margin-bottom:16px}"
      // modo claro (html.light): o overlay de login/onboarding/carregamento clareia junto com a página
      + "html.light #cloud-boot,html.light #cloud-gate,html.light #cloud-onboard{"
      + "background:radial-gradient(1200px 600px at 80% -10%,rgba(47,166,74,.08),transparent 60%),radial-gradient(900px 500px at -10% 110%,rgba(255,194,75,.05),transparent 55%),#f2f5f9}"
      + "html.light #cloud-boot span{color:#5b6b82}"
      + "html.light #cloud-gate .gcard,html.light #cloud-onboard .gcard{background:linear-gradient(180deg,#ffffff,#f8fafc);border:1px solid #d8e0ea}"
      + "html.light #cloud-gate h2,html.light #cloud-onboard h2{color:#1a2332}"
      + "html.light #cloud-gate p,html.light #cloud-onboard p{color:#5b6b82}"
      + "html.light #cloud-gate .gerr{color:#d93a4c}html.light #cloud-gate .gnote{color:#7c8ba3}"
      + "html.light #cloud-gate .gdiv{color:#9fb0c4}html.light #cloud-gate .gdiv:before,html.light #cloud-gate .gdiv:after{background:#d8e0ea}"
      + "html.light #cloud-gate .ginp{background:#ffffff;border:1px solid #c6d1de;color:#1a2332}html.light #cloud-gate .ginp:focus{border-color:#1b8a3e}"
      + "html.light #cloud-onboard .ob-in{background:#ffffff;border:1px solid #c6d1de;color:#1a2332}"
      + "html.light #cloud-onboard .ob-vestchip{background:#ffffff;border:1px solid #c6d1de;color:#5b6b82}"
      + "html.light #cloud-onboard .ob-vestchip:hover{border-color:#9fb0c4;color:#1a2332}"
      + "html.light #cloud-onboard .ob-vestchip.sel{background:#eafbf0;color:#157334;border-color:#1b8a3e}"
      + "html.light #cloud-gate .glinks span{color:#9fb0c4}html.light #cloud-gate .glinks a{color:#1b8a3e}"
      + "html.light #cloud-chip{background:rgba(255,255,255,.95);border:1px solid #d8e0ea}"
      + "html.light #cloud-chip .cn{color:#1a2332}html.light #cloud-chip button{color:#5b6b82;border-color:#d8e0ea}"
      + "html.light #cloud-chip button:hover{color:#d93a4c;border-color:#d93a4c}"
      + "html.light #cloud-chip .crole{background:#eef3f8;color:#5b6b82}"
      + "html.light .ep-panel{background:linear-gradient(180deg,#ffffff,#f8fafc);border:1px solid #d8e0ea}"
      + "html.light .ep-panel h3{color:#1a2332}html.light .ep-hint{color:#5b6b82}"
      + "html.light .ep-addrow input,html.light .ep-addrow select{background:#ffffff;border:1px solid #c6d1de;color:#1a2332}"
      + "html.light .ep-staffrow{color:#1a2332;border-top:1px solid #e7ecf2}"
      + "html.light .ep-staffrow button{color:#5b6b82;border-color:#c6d1de}html.light .ep-staffrow button:hover{color:#d93a4c;border-color:#d93a4c}"
      + "html.light .gwm{color:#1a2332}html.light .gtag{color:#5b6b82}"
      + "html.light #ep-adminlink{background:linear-gradient(180deg,#eef3f8,#e7ecf3);border-color:#d8e0ea;color:#1a2332}"
      + "html.light #ep-adminlink span{color:#5b6b82}";
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  }

  function buildGate() {
    var g = document.createElement("div");
    g.id = "cloud-gate";
    g.innerHTML =
      '<div class="gcard">'
      + '<div class="gbrand">' + LOGO + '<div class="gwm">estuda<span>+</span></div></div>'
      + '<div class="gtag">progresso · desempenho · evolução</div>'
      + '<p id="cloud-gate-msg">Entre para salvar suas notas e estudos na sua conta — em qualquer aparelho.</p>'
      + '<button class="gbtn" id="cloud-login-btn">'
      + '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>'
      + 'Entrar com Google</button>'
      + '<div class="gdiv"><span>ou com e-mail</span></div>'
      + '<input class="ginp" id="cloud-email" type="email" placeholder="seu@email.com" autocomplete="email" inputmode="email">'
      + '<input class="ginp" id="cloud-pass" type="password" placeholder="senha (mín. 6 caracteres)" autocomplete="current-password">'
      + '<button class="gbtn2" id="cloud-email-btn">Entrar</button>'
      + '<div class="glinks"><a id="cloud-signup">Criar conta</a><span>·</span><a id="cloud-reset">Esqueci a senha</a></div>'
      + '<div class="gerr" id="cloud-gate-err"></div>'
      + '<div class="gnote">Grátis · seus dados ficam só na sua conta.</div>'
      + '</div>';
    document.body.appendChild(g);
    document.getElementById("cloud-login-btn").addEventListener("click", login);
    document.getElementById("cloud-email-btn").addEventListener("click", function () { emailAuth("login"); });
    document.getElementById("cloud-signup").addEventListener("click", function () { emailAuth("signup"); });
    document.getElementById("cloud-reset").addEventListener("click", resetPassword);
    document.getElementById("cloud-pass").addEventListener("keydown", function (e) { if (e.key === "Enter") emailAuth("login"); });

    var boot = document.createElement("div");
    boot.id = "cloud-boot";
    boot.innerHTML = LOGO + '<span>Carregando…</span>';
    document.body.appendChild(boot);

    var chip = document.createElement("div");
    chip.id = "cloud-chip";
    chip.innerHTML = '<img id="cloud-chip-img" alt=""><span class="cn" id="cloud-chip-name"></span><span class="crole" id="cloud-role"></span><button id="cloud-logout">Sair</button>';
    document.body.appendChild(chip);
    document.getElementById("cloud-logout").addEventListener("click", function () { auth.signOut(); });

    // selo do ambiente: LAB (laboratório, dados de teste) ou BETA (versão em avaliação
    // com dados reais). Sem nenhum dos dois, é a versão estável e não mostra selo.
    if (window.LAB || window.BETA) {
      var lab = document.createElement("div");
      lab.id = "cloud-lab";
      if (window.BETA) { lab.textContent = "🚀 BETA"; lab.className = "beta"; }
      else lab.textContent = "🧪 SIMULAÇÃO (LAB)";
      document.body.appendChild(lab);
    }
  }

  function showGate(msg) {
    hideBoot();
    var g = document.getElementById("cloud-gate"); if (g) g.style.display = "flex";
    var c = document.getElementById("cloud-chip"); if (c) c.style.display = "none";
    if (msg) { var m = document.getElementById("cloud-gate-msg"); if (m) m.textContent = msg; }
  }
  function hideGate() {
    var g = document.getElementById("cloud-gate"); if (g) g.style.display = "none";
    var c = document.getElementById("cloud-chip"); if (c) c.style.display = "flex";
  }
  function showBoot() {
    var b = document.getElementById("cloud-boot"); if (b) b.style.display = "flex";
  }
  function hideBoot() {
    var b = document.getElementById("cloud-boot"); if (b) b.style.display = "none";
  }
  function gateBusy(b) {
    var btn = document.getElementById("cloud-login-btn"); if (btn) btn.disabled = b;
  }
  function gateErr(t) { var e = document.getElementById("cloud-gate-err"); if (e) e.textContent = t || ""; }

  /* ---------- login ---------- */
  // iOS/iPadOS: o iPad moderno se identifica como "Macintosh", então checa touch também.
  function ehIOS() {
    var ua = navigator.userAgent || "";
    return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  }
  function ehStandalone() {
    return window.navigator.standalone === true ||
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  }
  function login() {
    gateErr(""); gateBusy(true);
    var provider = new firebase.auth.GoogleAuthProvider();
    // No app instalado do iPhone/iPad não existe janela de popup — tentar abrir só
    // gasta tempo e termina em erro. Vai direto de redirect nesse caso.
    if (ehIOS() && ehStandalone()) {
      auth.signInWithRedirect(provider).catch(showLoginError);
      return;
    }
    auth.signInWithPopup(provider).catch(function (err) {
      // popup bloqueado / não suportado → redirect
      if (err && (err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment" || err.code === "auth/cancelled-popup-request")) {
        auth.signInWithRedirect(provider).catch(showLoginError);
      } else if (err && err.code === "auth/popup-closed-by-user") {
        gateBusy(false); // usuário fechou — sem erro
      } else { showLoginError(err); }
    });
  }
  function showLoginError(err) {
    gateBusy(false);
    gateErr("Não consegui entrar: " + (err && (err.message || err.code) || "erro desconhecido"));
  }

  /* ---- Login por e-mail e senha (funciona em qualquer aparelho, inclusive iPhone) ---- */
  function mapAuthErr(e) {
    var c = e && e.code || "";
    if (c === "auth/invalid-email") return "E-mail inválido.";
    if (c === "auth/missing-password" || c === "auth/weak-password") return "A senha precisa ter pelo menos 6 caracteres.";
    if (c === "auth/email-already-in-use") return "Esse e-mail já tem conta. Use \"Entrar\" (ou \"Esqueci a senha\").";
    if (c === "auth/invalid-credential" || c === "auth/wrong-password" || c === "auth/user-not-found") return "E-mail ou senha incorretos. Sem conta ainda? Toque em \"Criar conta\".";
    if (c === "auth/too-many-requests") return "Muitas tentativas. Espere um pouco e tente de novo.";
    if (c === "auth/operation-not-allowed") return "Login por e-mail ainda não está ativado no Firebase (ative em Authentication → Sign-in method).";
    if (c === "auth/network-request-failed") return "Sem conexão. Verifique a internet.";
    return "Não consegui: " + (e && (e.message || c) || "erro");
  }
  function emailAuth(mode) {
    var em = (document.getElementById("cloud-email").value || "").trim();
    var pw = (document.getElementById("cloud-pass").value || "");
    if (!em || !pw) { gateErr("Preencha e-mail e senha."); return; }
    if (mode === "signup" && pw.length < 6) { gateErr("A senha precisa ter pelo menos 6 caracteres."); return; }
    gateErr(""); gateBusy(true);
    var p = mode === "signup" ? auth.createUserWithEmailAndPassword(em, pw) : auth.signInWithEmailAndPassword(em, pw);
    p.catch(function (e) { gateBusy(false); gateErr(mapAuthErr(e)); });
  }
  function resetPassword() {
    var em = (document.getElementById("cloud-email").value || "").trim();
    if (!em) { gateErr("Digite seu e-mail no campo acima primeiro."); return; }
    auth.sendPasswordResetEmail(em)
      .then(function () { gateErr(""); alert("Enviei um link de redefinição de senha para " + em + ". Olhe sua caixa de entrada (e o spam)."); })
      .catch(function (e) { gateErr(mapAuthErr(e)); });
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    injectCSS();
    buildGate();
    showBoot(); // tela neutra de carregamento até sabermos se já tem sessão — evita "piscar" o login a cada troca de painel

    var cfg = window.firebaseConfig;
    if (!cfg || !cfg.apiKey || String(cfg.apiKey).indexOf("PASTE") === 0) {
      showGate("⚙️ App ainda não configurado: falta colar as chaves do Firebase em app/firebase-config.js. (Passo do setup — fale com quem montou o painel.)");
      gateBusy(true);
      return;
    }

    app = firebase.initializeApp(cfg);
    auth = firebase.auth();
    db = firebase.firestore();

    // Modo emulador local (projectId "demo-*"): testa sem projeto real.
    if (String(cfg.projectId || "").indexOf("demo-") === 0) {
      try {
        auth.useEmulator("http://127.0.0.1:9099", { disableWarnings: true });
        db.useEmulator("127.0.0.1", 8080);
      } catch (e) {}
    }

    db.enablePersistence({ synchronizeTabs: true }).catch(function () {/* multi-aba/privado: segue sem cache */ });

    // Volta do login por redirect (caminho do iPhone): sem isso, se o Google recusa
    // o login o usuário só via a tela de login de novo, sem nenhuma explicação.
    auth.getRedirectResult().catch(function (err) {
      var c = err && err.code || "";
      if (c === "auth/unauthorized-domain") {
        gateErr("Este endereço ainda não está liberado no Firebase (Authentication → Authorized domains): " + location.hostname);
      } else if (c) {
        gateErr("Não consegui concluir o login: " + (err.message || c));
      }
      gateBusy(false);
    });

    auth.onAuthStateChanged(function (u) {
      user = u;
      if (!u) { showGate(); return; }
      var img = document.getElementById("cloud-chip-img");
      var nm = document.getElementById("cloud-chip-name");
      if (img) img.src = u.photoURL || "";
      if (nm) nm.textContent = (u.displayName || u.email || "Você").split(" ")[0];

      // mantém a tela de carregamento neutra (já visível) até o perfil/dados estarem prontos
      ensureProfile().then(function (profile) {
        if (!profile) { showOnboarding(); return; } // falta série/turma → cadastro
        afterProfile(profile);
      }).catch(function () { showOnboarding(); });
    });
  }

  /* ============================================================
     Estuda+: perfil, papel (por e-mail) e onboarding
     ============================================================ */
  var SCHOOL = "coc-atibaia";
  var MASTER = "luizanthonylopes@gmail.com";

  // Vestibulares que a pessoa pode escolher pra acompanhar (até 3) — mesma lista/chaves
  // usadas em vestibular.app.js (EXAMS/VEST_INFO), só nome pra exibir aqui no onboarding.
  var VEST_OPCOES = [
    { k: "ENEM", n: "ENEM" }, { k: "FUVEST", n: "FUVEST (USP)" }, { k: "UNICAMP", n: "UNICAMP" },
    { k: "UNESP", n: "UNESP" }, { k: "MACKENZIE", n: "Mackenzie" }, { k: "PUCSP", n: "PUC-SP" }, { k: "PUCCAMP", n: "PUC-Campinas" }
  ];
  var obVestSel = [];

  function computeRole() {
    if (user.email === MASTER) return Promise.resolve("coordenacao");
    return db.collection("schools").doc(SCHOOL).collection("staff").doc(user.email).get()
      .then(function (s) { return (s.exists && s.data().role) ? s.data().role : "aluno"; })
      .catch(function () { return "aluno"; });
  }

  function ensureProfile() {
    return Promise.all([
      db.collection("users").doc(user.uid).get().catch(function () { return null; }),
      computeRole()
    ]).then(function (res) {
      var snap = res[0], role = res[1];
      var data = (snap && snap.exists) ? snap.data() : {};
      var profile = {
        uid: user.uid, email: user.email, nome: (user.displayName || user.email || "Aluno"),
        role: role, schoolId: SCHOOL, serie: data.serie || null, turma: data.turma || null,
        vestibulares: data.vestibulares || []
      };
      // Grava só identificação. `role` e `schoolId` NÃO vão mais para cá:
      // quem manda no papel é computeRole(), que lê o documento de staff, e as
      // regras do Firestore rejeitam qualquer escrita que mexa nesses campos
      // (V-11 da auditoria — antes o próprio aluno podia se declarar
      // coordenação no próprio perfil).
      if (!snap || !snap.exists || data.nome !== profile.nome || data.email !== profile.email) {
        db.collection("users").doc(user.uid).set({ email: profile.email, nome: profile.nome }, { merge: true }).catch(function () {});
      }
      window._epRole = role;
      return profile.serie ? profile : null;
    });
  }

  function afterProfile(profile) {
    window.EP = profile;
    updateChipRole(profile);
    if (CFG.home) { hideBoot(); hideGate(); addAdminLink(profile); buildGestao(profile); if (CFG.onReady) CFG.onReady(user); return; }
    loadDoc().then(function () { installShim(); hideBoot(); hideGate(); applyAdminSerie(); injectApp(); });
  }

  /* ---- Admin multi-turma: staff pode publicar/consultar qualquer série (1/2/3ª EM).
     A série escolhida fica salva por aparelho (localStorage "adminSerie", fora do shim
     de nuvem) e se aplica ao EP antes do app do painel injetar. ---- */
  function applyAdminSerie() {
    try {
      var sel = realLS.getItem("adminSerie");
      if (sel && ["1", "2", "3"].indexOf(sel) >= 0 && window.EP) {
        window.EP = Object.assign({}, window.EP, { serie: sel });
      }
    } catch (e) {}
  }
  function setAdminSerie(s) {
    if (["1", "2", "3"].indexOf(String(s)) < 0) return;
    try { realLS.setItem("adminSerie", String(s)); } catch (e) {}
    if (window.EP) window.EP = Object.assign({}, window.EP, { serie: String(s) });
  }
  function getAdminSerie() { try { return realLS.getItem("adminSerie") || null; } catch (e) { return null; } }

  function roleLabel(r) { return r === "coordenacao" ? "Coordenação" : (r === "professor" ? "Professor(a)" : "Aluno(a)"); }
  function esc(s) { return (s == null ? "" : "" + s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function updateChipRole(profile) {
    var el = document.getElementById("cloud-role"); if (!el) return;
    el.textContent = profile.role === "coordenacao" ? "coord" : (profile.role === "professor" ? "prof" : (profile.serie ? profile.serie + "ª" + (profile.turma && profile.turma !== "—" ? " " + profile.turma : "") : "aluno"));
    el.className = "crole" + (profile.role === "coordenacao" ? " coord" : (profile.role === "professor" ? " prof" : ""));
  }

  function showOnboarding() {
    hideBoot();
    hideGate();
    var role = window._epRole || "aluno";
    obVestSel = [];
    var ex = document.getElementById("cloud-onboard"); if (ex) ex.remove();
    var o = document.createElement("div"); o.id = "cloud-onboard";
    o.innerHTML = '<div class="gcard">'
      + '<div class="gbrand">' + LOGO + '<div class="gwm">estuda<span>+</span></div></div>'
      + '<h2 style="font-size:1.05rem;margin:6px 0 6px">Bem-vindo(a)!</h2>'
      + '<p>Só falta dizer sua turma pra personalizar tudo. Você entrou como <b style="color:#2fa64a">' + roleLabel(role) + '</b>.</p>'
      + '<div style="text-align:left;margin-bottom:16px">'
      + '<label style="display:block;color:var(--mut);font-size:.8rem;font-weight:700;margin-bottom:6px">Sua série</label>'
      + '<select id="ob-serie" class="ob-in"><option value="">escolha…</option><option value="1">1ª série do EM</option><option value="2">2ª série do EM</option><option value="3">3ª série do EM</option></select>'
      + '<label style="display:block;color:var(--mut);font-size:.8rem;font-weight:700;margin:12px 0 6px">Sua turma</label>'
      + '<select id="ob-turma" class="ob-in"><option value="">escolha…</option><option>A</option><option>B</option><option>C</option><option>D</option><option value="—">Não sei / outra</option></select>'
      + '<label style="display:block;color:var(--mut);font-size:.8rem;font-weight:700;margin:12px 0 6px">Vestibulares que você está mirando <span style="font-weight:400">(até 3, opcional)</span></label>'
      + '<div class="ob-vestgrid" id="ob-vestgrid">' + VEST_OPCOES.map(function (v) { return '<div class="ob-vestchip" data-k="' + v.k + '">' + v.n + '</div>'; }).join("") + '</div>'
      + '</div>'
      + '<button class="gbtn" id="ob-save" style="background:linear-gradient(180deg,#2fa64a,#17833a);color:#04121a">Começar »</button>'
      + '<div class="gerr" id="ob-err" style="color:#ff5b6e;font-size:.82rem;margin-top:12px;min-height:1em"></div>'
      + '</div>';
    document.body.appendChild(o);
    document.getElementById("ob-save").addEventListener("click", saveOnboarding);
    Array.prototype.forEach.call(o.querySelectorAll(".ob-vestchip"), function (el) {
      el.addEventListener("click", function () {
        var k = el.getAttribute("data-k"), i = obVestSel.indexOf(k);
        var err = document.getElementById("ob-err");
        if (i >= 0) { obVestSel.splice(i, 1); el.classList.remove("sel"); }
        else {
          if (obVestSel.length >= 3) { err.textContent = "Você pode escolher até 3 vestibulares."; return; }
          obVestSel.push(k); el.classList.add("sel");
        }
        err.textContent = "";
      });
    });
  }

  function saveOnboarding() {
    var serie = document.getElementById("ob-serie").value, turma = document.getElementById("ob-turma").value;
    var err = document.getElementById("ob-err");
    if (!serie) { err.textContent = "Escolha sua série."; return; }
    if (!turma) { err.textContent = "Escolha sua turma."; return; }
    var role = window._epRole || "aluno";
    var vestibulares = obVestSel.slice(0, 3);
    // Sem `role` e sem `schoolId`: são campos de autoridade e o cliente não
    // grava mais nenhum dos dois (V-11). O papel continua vindo de
    // computeRole() e a escola é a constante SCHOOL, usada só em memória.
    var doc = { email: user.email, nome: (user.displayName || user.email || "Aluno"), serie: serie, turma: turma, vestibulares: vestibulares };
    db.collection("users").doc(user.uid).set(doc, { merge: true }).then(function () {
      var o = document.getElementById("cloud-onboard"); if (o) o.remove();
      afterProfile({ uid: user.uid, email: doc.email, nome: doc.nome, role: role, schoolId: SCHOOL, serie: serie, turma: turma, vestibulares: vestibulares });
    }).catch(function (e) { err.textContent = "Não consegui salvar: " + (e && e.message || "erro"); });
  }

  /* ---- Link de Administração na home (professor/coordenação) ---- */
  function addAdminLink(profile) {
    if (profile.role !== "professor" && profile.role !== "coordenacao") return;
    if (document.getElementById("ep-adminlink")) return;
    var a = document.createElement("a");
    a.id = "ep-adminlink"; a.href = "admin.html";
    a.style.cssText = "display:flex;align-items:center;gap:10px;text-decoration:none;background:linear-gradient(180deg,#1a2740,#141d30);border:1px solid #2c3e5e;border-left:4px solid #ffc24b;border-radius:14px;padding:15px 18px;margin-bottom:16px;color:#e8eef7;font-weight:800";
    a.innerHTML = '⚙️ Administração <span style="color:#8295b3;font-weight:600;font-size:.85rem">— lançar calendário e conteúdos</span>';
    var cards = document.querySelector(".cards");
    if (cards && cards.parentNode) cards.parentNode.insertBefore(a, cards);
    else (document.querySelector(".wrap") || document.body).appendChild(a);
  }

  /* ---- Gestão (só coordenação): cadastra e-mails de professor/coordenação ---- */
  function buildGestao(profile) {
    if (profile.role !== "coordenacao") return;
    var mount = document.getElementById("ep-gestao");
    if (!mount) { mount = document.createElement("div"); mount.id = "ep-gestao"; (document.querySelector(".wrap") || document.body).appendChild(mount); }
    mount.innerHTML = '<div class="ep-panel"><h3>⚙️ Gestão — professores e coordenação</h3>'
      + '<p class="ep-hint">Adicione o e-mail Google de cada professor/coordenador. Só quem está aqui vira staff; qualquer outro login entra como <b>aluno</b> e não consegue editar conteúdo.</p>'
      + '<div id="ep-stafflist" class="ep-hint">Carregando…</div>'
      + '<div class="ep-addrow"><input id="ep-email" placeholder="email@gmail.com" inputmode="email"><select id="ep-role"><option value="professor">Professor(a)</option><option value="coordenacao">Coordenação</option></select><button id="ep-add">Adicionar</button></div>'
      + '</div>';
    document.getElementById("ep-add").addEventListener("click", gestaoAdd);
    gestaoRefresh();
  }
  function gestaoRefresh() {
    db.collection("schools").doc(SCHOOL).collection("staff").get().then(function (q) {
      var el = document.getElementById("ep-stafflist"); if (!el) return;
      if (q.empty) { el.innerHTML = "Nenhum professor/coordenador cadastrado ainda."; return; }
      el.innerHTML = q.docs.map(function (d) {
        var r = d.data().role;
        return '<div class="ep-staffrow"><span>' + esc(d.id) + ' &nbsp;<b style="color:' + (r === "coordenacao" ? "#ffc24b" : "#2fa64a") + '">' + (r === "coordenacao" ? "coordenação" : "professor") + '</b></span><button class="ep-rm" data-e="' + esc(d.id) + '">remover</button></div>';
      }).join("");
      Array.prototype.forEach.call(el.querySelectorAll(".ep-rm"), function (b) { b.addEventListener("click", function () { gestaoRemove(b.getAttribute("data-e")); }); });
    }).catch(function () { var el = document.getElementById("ep-stafflist"); if (el) el.textContent = "Não consegui carregar a lista."; });
  }
  function gestaoAdd() {
    var email = (document.getElementById("ep-email").value || "").trim().toLowerCase();
    var role = document.getElementById("ep-role").value;
    if (!/^[^\s<>"'&]+@[^\s<>"'&]+\.[^\s<>"'&]+$/.test(email)) { alert("E-mail inválido."); return; }
    db.collection("schools").doc(SCHOOL).collection("staff").doc(email).set({ role: role, addedBy: user.email, addedAt: Date.now() })
      .then(function () { document.getElementById("ep-email").value = ""; gestaoRefresh(); })
      .catch(function (e) { alert("Não consegui adicionar: " + (e && e.message || "erro")); });
  }
  function gestaoRemove(email) {
    if (!confirm("Remover " + email + " do staff? Ele volta a ser aluno.")) return;
    db.collection("schools").doc(SCHOOL).collection("staff").doc(email).delete().then(gestaoRefresh).catch(function () { alert("Não consegui remover."); });
  }

  // expõe pouca coisa (a home usa onReady via CLOUD_PANEL)
  window.Cloud = {
    get user() { return user; },
    logout: function () { auth && auth.signOut(); },
    firestore: function () { return db; },
    school: function () { return SCHOOL; },
    // admin multi-turma: escolhe a série (1/2/3) em que o staff publica/consulta
    setAdminSerie: setAdminSerie,
    getAdminSerie: getAdminSerie,
    // força salvamento imediato na nuvem (retorna Promise, p/ ações destrutivas)
    flushSync: function () {
      return new Promise(function (resolve) {
        if (!user || !CFG.panel || !db) { resolve(); return; }
        var done = false;
        var fin = function () { if (!done) { done = true; resolve(); } };
        var timer = setTimeout(fin, 3500); // máx ~3,5s de espera
        docRef().set({ blob: cache, updatedAt: Date.now() })
          .then(function () { clearTimeout(timer); fin(); })
          .catch(function (e) { clearTimeout(timer); console.warn("[cloud] flushSync falhou:", e && e.message); fin(); });
      });
    },
    // Mural compartilhado por item (prova/PC): murals/{itemId}/posts/{postId}
    mural: {
      _ref: function (itemId) { return db.collection(window.MURAL_COLL || "murals").doc(itemId).collection("posts"); },
      myUid: function () { return user ? user.uid : null; },
      list: function (itemId) {
        return Cloud.mural._ref(itemId).orderBy("createdAt", "asc").get().then(function (q) {
          return q.docs.map(function (d) { var o = d.data(); o.id = d.id; return o; });
        });
      },
      add: function (itemId, post) {
        post.uid = user.uid;
        post.nome = (user.displayName || user.email || "Aluno").split(" ")[0];
        post.createdAt = Date.now();
        return Cloud.mural._ref(itemId).add(post);
      },
      remove: function (itemId, postId) { return Cloud.mural._ref(itemId).doc(postId).delete(); }
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
