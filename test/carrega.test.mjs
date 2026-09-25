/**
 * Os scripts dos painéis carregam sem explodir?
 *
 * Existe por causa de um defeito que ficou semanas no ar sem ninguém ver: o
 * estudos.app.js chamava `load()` no topo do arquivo, e `load()` lia um `const`
 * declarado 26 linhas ABAIXO. Zona morta temporal — o script inteiro abortava
 * na primeira linha executável, sempre, para todo mundo.
 *
 * O sintoma enganava: declaração de função sobe, então os `onclick` do HTML
 * continuavam achando `setView`. Só que `view` e `state` nunca chegavam a
 * existir, e cada clique morria com ReferenceError no console. Para quem usava,
 * o painel simplesmente não respondia a nada — e nenhum teste pegava, porque
 * todos exercitavam funções puras, nunca a CARGA do arquivo.
 *
 * Este teste é grosseiro de propósito: carrega o arquivo publicado num DOM de
 * mentira e exige que não lance. Não valida comportamento — valida que o painel
 * chega vivo até o navegador.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function elemento() {
  const el = {
    style: {}, dataset: {}, innerHTML: "", textContent: "", value: "",
    checked: false, disabled: false, files: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, removeChild() {}, insertBefore() {}, remove() {},
    addEventListener() {}, removeEventListener() {}, setAttribute() {},
    getAttribute: () => null, focus() {}, click() {}, scrollIntoView() {},
    querySelector: () => elemento(), querySelectorAll: () => [],
    closest: () => null, parentNode: null
  };
  return el;
}

function ambiente() {
  const doc = {
    getElementById: () => elemento(),
    querySelector: () => elemento(),
    querySelectorAll: () => [],
    createElement: () => elemento(),
    addEventListener() {}, removeEventListener() {},
    documentElement: elemento(),
    body: elemento(),
    head: elemento()
  };
  const win = {
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    location: { href: "https://exemplo/", origin: "https://exemplo" },
    navigator: { serviceWorker: { register: () => Promise.resolve() } },
    scrollTo() {}, alert() {}, confirm: () => false, prompt: () => null
  };
  const store = {};
  const ls = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; }
  };
  return { doc, win, ls };
}

/* Cada painel é script de navegador: roda solto, sem module. Aqui ele é
   executado com as globais que espera encontrar. */
function carrega(arquivo, extra = "") {
  const src = readFileSync(new URL("../public/app/" + arquivo, import.meta.url), "utf8");
  const { doc, win, ls } = ambiente();
  const out = {};
  const fn = new Function(
    "window", "document", "localStorage", "navigator", "Notification",
    "setInterval", "setTimeout", "clearInterval", "clearTimeout", "alert",
    "confirm", "out",
    src + "\n;" + extra
  );
  fn(win, doc, ls, win.navigator, { permission: "default", requestPermission: () => Promise.resolve("default") },
     () => 0, () => 0, () => {}, () => {}, () => {}, () => false, out);
  return out;
}

/**
 * cloud.js carrega, e o portao de login continua com as tres vistas?
 *
 * Ate 09/09/2026 nenhum teste tocava o cloud.js — o arquivo de que TODO o
 * resto depende para existir. Se ele morre na carga, ninguem entra em lugar
 * nenhum: nao ha painel, nao ha admin, nao ha nada. E o unico sinal seria um
 * aluno dizendo "nao abre".
 *
 * Junto vai a garantia da correcao do mesmo dia: "Criar conta" e "Esqueci a
 * senha" precisam LEVAR A ALGUM LUGAR. Antes chamavam a acao direto, sem sair
 * da tela, e a falta de resposta visivel passava impressao de sistema
 * quebrado. O teste fixa a existencia das vistas para que ninguem volte ao
 * comportamento antigo sem perceber.
 */
function carregaCloud() {
  const src = readFileSync(new URL("../public/app/cloud.js", import.meta.url), "utf8");
  const html = [];

  /* Elemento que GRAVA o innerHTML atribuido, para dar pra inspecionar o que
     o portao construiu. O elemento() generico do resto do arquivo descarta. */
  function elGrava() {
    const el = elemento();
    Object.defineProperty(el, "innerHTML", {
      get() { return el._html || ""; },
      set(v) { el._html = v; html.push(String(v)); }
    });
    return el;
  }

  const { win, ls } = ambiente();
  const doc = {
    getElementById: () => elGrava(),
    querySelector: () => elGrava(),
    querySelectorAll: () => [],
    createElement: () => elGrava(),
    addEventListener() {}, removeEventListener() {},
    documentElement: elGrava(), body: elGrava(), head: elGrava(),
    readyState: "complete"
  };

  /* Firebase de mentira: so o suficiente para o boot() percorrer o caminho
     inteiro sem explodir. Nao valida comportamento — valida que carrega. */
  const prom = () => ({ then: (f) => { try { f && f({}); } catch (e) {} return prom(); }, catch: () => prom() });
  const authFake = {
    useEmulator() {}, onAuthStateChanged() {}, getRedirectResult: prom,
    signInWithPopup: prom, signInWithRedirect: prom, signOut: prom,
    createUserWithEmailAndPassword: prom, signInWithEmailAndPassword: prom,
    sendPasswordResetEmail: prom, currentUser: null
  };
  const colecao = () => ({
    doc: () => ({ collection: colecao, get: prom, set: prom, delete: prom, onSnapshot() {} }),
    add: prom, get: prom, orderBy: () => ({ get: prom })
  });
  const firebase = {
    initializeApp: () => ({}),
    auth: Object.assign(() => authFake, { GoogleAuthProvider: function () {} }),
    firestore: Object.assign(() => ({ collection: colecao, enablePersistence: prom, useEmulator() {} }),
                             { FieldValue: { serverTimestamp: () => 0 } })
  };

  /* O cloud.js registra o service worker e escuta "controllerchange" (e o
     ambiente generico so tem register). Sem isto o arquivo morre na LINHA 18,
     antes de qualquer coisa — que e exatamente a classe de bug que este
     arquivo de teste existe para pegar. */
  win.navigator = {
    serviceWorker: {
      register: () => ({ then: (f) => { try { f && f({ update() {} }); } catch (e) {} return { catch: () => {} }; } }),
      addEventListener() {}, removeEventListener() {}, controller: null
    },
    userAgent: "node", maxTouchPoints: 0, onLine: true
  };

  win.firebase = firebase;
  win.location = { hostname: "painel-e5373-lab2.web.app", href: "https://x/", origin: "https://x" };
  win.firebaseConfig = { projectId: "demo-estuda-mais", apiKey: "x", authDomain: "x" };

  const fn = new Function(
    "window", "document", "localStorage", "navigator", "firebase", "location",
    "setInterval", "setTimeout", "clearInterval", "clearTimeout", "alert", "confirm",
    src
  );
  fn(win, doc, ls, win.navigator, firebase, win.location,
     () => 0, () => 0, () => {}, () => {}, () => {}, () => false);

  return html.join(" ");
}

describe("cloud.js — o portao de entrada", () => {
  it("carrega sem explodir", () => {
    assert.doesNotThrow(() => carregaCloud());
  });

  /* Desde 25/09/2026 criar conta e recuperar senha tem PAGINA PROPRIA
     (conta.html). O que se trava aqui: os dois links do portao levam para la,
     cada um na sua aba, e com um `volta` que a pagina aceita. */
  it("o portao tem a vista de entrar", () => {
    assert.ok(carregaCloud().includes("cloud-v-login"));
  });

  it("'Criar conta' e 'Esqueci a senha' levam para conta.html", () => {
    const html = carregaCloud();
    assert.match(html, /id="cloud-signup" href="conta\.html\?volta=[a-z]+\.html#criar"/);
    assert.match(html, /id="cloud-reset" href="conta\.html\?volta=[a-z]+\.html#recuperar"/);
  });

  it("as vistas embutidas antigas nao voltaram", () => {
    const html = carregaCloud();
    for (const id of ["cloud-v-signup", "cloud-v-reset", "cloud-su-btn", "cloud-rs-btn"]) {
      assert.ok(!html.includes(id), `vista antiga de volta: ${id}`);
    }
  });

  it("os e-mails do Firebase saem em portugues", () => {
    /* sem languageCode o projeto manda o modelo em ingles ("Reset your
       password for…") — era metade do "esqueci a senha nao funciona" */
    const src = readFileSync(new URL("../public/app/cloud.js", import.meta.url), "utf8");
    assert.match(src, /auth\.languageCode\s*=\s*"pt-BR"/);
  });
});

/**
 * conta.html / conta.js — criar conta e recuperar senha.
 * As regras puras ficam em window.ContaUtil para poderem ser testadas sem DOM.
 */
function carregaConta() {
  const src = readFileSync(new URL("../public/app/conta.js", import.meta.url), "utf8");
  const win = {};
  const doc = { documentElement: { classList: { add() {}, remove() {} } } }; // sem getElementById: para antes do DOM
  new Function("window", "document", "localStorage", src)(win, doc, { getItem: () => null });
  return win.ContaUtil;
}

describe("conta.js — criar conta e recuperar senha", () => {
  const U = carregaConta();

  it("'volta' so aceita paginas do proprio app (sem redirecionador aberto)", () => {
    for (const ok of ["index.html", "notas.html", "estudos.html", "vestibular.html", "admin.html"]) {
      assert.equal(U.voltaSegura(ok), ok);
    }
    for (const ruim of ["https://evil.example/login", "//evil.example", "javascript:alert(1)",
                        "../index.html", "index.html#x", "", null, undefined, "conta.html"]) {
      assert.equal(U.voltaSegura(ruim), "index.html", String(ruim));
    }
  });

  it("senha nova: 8+ caracteres, com letra e numero", () => {
    assert.equal(U.senhaOk("abc123"), false, "6 caracteres nao basta");
    assert.equal(U.senhaOk("abcdefgh"), false, "sem numero");
    assert.equal(U.senhaOk("12345678"), false, "sem letra");
    assert.equal(U.senhaOk("estuda2026"), true);
    assert.equal(U.senhaOk("ação1234"), true, "acento conta como letra");
  });

  it("e-mail: recusa o que nao e e-mail e o que poderia virar HTML", () => {
    assert.equal(U.emailOk("aluno@escola.com"), true);
    for (const ruim of ["", "aluno", "aluno@", "@escola.com", "a b@c.com", "<x>@a.com", "a@b"]) {
      assert.equal(U.emailOk(ruim), false, ruim);
    }
  });

  it("nome: tira sinal de tag e caractere de controle, e corta em 60", () => {
    assert.equal(U.nomeLimpo("  Ana  <b>Maria</b>\u0000 "), "Ana bMaria/b");
    assert.equal(U.nomeLimpo("x".repeat(100)).length, 60);
  });

  it("mensagens de erro em portugues, sem vazar se a conta existe no reset", () => {
    assert.match(U.mapErro({ code: "auth/too-many-requests" }), /tentativas/);
    assert.match(U.mapErro({ code: "auth/weak-password" }), /8 caracteres/);
    const src = readFileSync(new URL("../public/app/conta.js", import.meta.url), "utf8");
    // user-not-found no reset e tratado como sucesso (mesma tela de "confira seu e-mail")
    assert.match(src, /auth\/user-not-found"\) return;/);
  });

  it("conta.html nao tem script embutido (pronta para CSP sem unsafe-inline)", () => {
    const html = readFileSync(new URL("../public/conta.html", import.meta.url), "utf8");
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), "script embutido em conta.html");
    assert.ok(!/\son[a-z]+=/i.test(html), "handler inline (onclick=…) em conta.html");
  });

  it("o service worker conhece a pagina nova", () => {
    const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
    for (const f of ["./conta.html", "./app/conta.js", "./app/conta.css"]) assert.ok(sw.includes(f), f);
  });
});

/**
 * O ambiente sai do hostname (app/env.js), e o nome das coleções sai do
 * ambiente. Isso põe uma regra dura no caminho: **o sufixo de um ambiente que
 * já tem dados nunca pode mudar.** `notas-lab2` tem que continuar sendo
 * `notas-lab2` para sempre — trocar o nome não apaga nada, faz coisa pior:
 * o app abre limpo, como se o aluno nunca tivesse usado, e os dados ficam
 * numa coleção que ninguém mais lê. Ninguém reporta "sumiu", reportam
 * "resetou sozinho".
 *
 * Estes testes fixam os nomes de cada ambiente conhecido.
 */
function ambienteEm(hostname) {
  const src = readFileSync(new URL("../public/app/env.js", import.meta.url), "utf8");
  const win = { location: { hostname } };
  new Function("window", "location", src)(win, win.location);
  return win;
}

describe("Ambiente por hostname", () => {
  const casos = [
    ["painel-e5373-lab2.web.app", "lab2", true],
    ["painel-e5373-lab3.web.app", "lab3", true],
    ["painel-e5373.web.app", "", false],
    ["painel-e5373.firebaseapp.com", "", false]
  ];

  for (const [host, id, ehLab] of casos) {
    it(`${host} → "${id || "produção"}"`, () => {
      const w = ambienteEm(host);
      assert.equal(w.Ambiente.id, id);
      assert.equal(w.LAB, ehLab);
    });
  }

  it("lab2 mantém EXATAMENTE os nomes de coleção que já estão em uso", () => {
    const w = ambienteEm("painel-e5373-lab2.web.app");
    assert.equal(w.MURAL_COLL, "murals-lab2");
    assert.equal(w.Ambiente.painel("notas", "painel-notas", "x").panel, "notas-lab2");
    assert.equal(w.Ambiente.painel("estudos", "painel-estudos", "x").panel, "estudos-lab2");
    assert.equal(w.Ambiente.painel("vestibular", "vestibular", "x").panel, "vestibular-lab2");
  });

  it("lab3 grava em coleções próprias — senão não serve para testar nada", () => {
    const w = ambienteEm("painel-e5373-lab3.web.app");
    assert.equal(w.MURAL_COLL, "murals-lab3");
    assert.equal(w.Ambiente.painel("notas", "painel-notas", "x").panel, "notas-lab3");
  });

  it("produção não leva sufixo — é como as coleções dela já se chamam", () => {
    const w = ambienteEm("painel-e5373.web.app");
    assert.equal(w.MURAL_COLL, "murals");
    assert.equal(w.Ambiente.painel("notas", "painel-notas", "x").panel, "notas");
  });

  it("host desconhecido cai no lab, nunca em produção", () => {
    // mandar dado de teste para as coleções de produção é bem pior que
    // misturá-lo com o lab
    for (const h of ["localhost", "127.0.0.1", "estuda-mais.com.br", ""]) {
      const w = ambienteEm(h);
      assert.equal(w.LAB, true, `${h} não deveria ser produção`);
      assert.notEqual(w.Ambiente.id, "");
    }
  });
});

describe("Toda página carrega o env.js antes de usar o Ambiente", () => {
  /* O HTML passou a depender de `Ambiente` no script embutido. Se a tag do
     env.js não vier ANTES, o script embutido lança ReferenceError, o
     CLOUD_PANEL nunca é definido e o painel não injeta — a página abre em
     branco. É o mesmo sintoma do script morto, agora por ordem de tag. */
  for (const html of ["index.html", "notas.html", "estudos.html", "vestibular.html", "admin.html"]) {
    it(html, () => {
      const src = readFileSync(new URL("../public/" + html, import.meta.url), "utf8");
      const usa = src.indexOf("Ambiente.");
      if (usa < 0) return; // index e admin não usam o helper, só o env
      const tag = src.indexOf('src="app/env.js"');
      assert.ok(tag >= 0, "não carrega o env.js");
      assert.ok(tag < usa, "env.js vem DEPOIS do primeiro uso de Ambiente");
    });
  }
});

describe("Carga dos painéis", () => {
  for (const arq of ["env.js", "estudos.app.js", "notas.app.js", "vestibular.app.js", "admin.app.js"]) {
    it(arq + " carrega sem lançar", () => {
      assert.doesNotThrow(() => carrega(arq));
    });
  }

  it("estudos.app.js: os limites de saneamento existem quando load() roda", () => {
    // o defeito original em uma linha: LIM_LISTA lido antes de ser inicializado
    const out = carrega("estudos.app.js", "out.LIM_LISTA = LIM_LISTA; out.LIM_TXT = LIM_TXT;");
    assert.equal(out.LIM_LISTA, 500);
    assert.equal(out.LIM_TXT, 500);
  });

  it("estudos.app.js: state e view existem depois da carga", () => {
    // se o script abortar no meio, estes ficam em zona morta e todo clique morre
    const out = carrega("estudos.app.js", "out.state = state; out.view = view;");
    assert.ok(out.state && typeof out.state === "object", "state não foi criado");
    assert.equal(out.view, "provas");
  });
});

/**
 * Todo `onclick="fn()"` tem um `fn` de verdade do outro lado?
 *
 * O teste acima prova que o script chega vivo. Este prova a outra metade do
 * mesmo sintoma: o HTML chama pelo nome, e nada avisa quando o nome muda ou
 * some do JS. Para quem usa, os dois defeitos são idênticos — "clico e não
 * acontece nada" — e nenhum deles aparece no console de quem publicou.
 *
 * Ficou concreto em 05/09/2026: o botão 📤 de compartilhar risco saiu do JS
 * junto com o B2. Se o `onclick` tivesse ficado no HTML, o botão continuaria
 * lá, bonito, e morreria em ReferenceError a cada toque.
 *
 * Varre as duas fontes de handler: os do arquivo .html e os que o próprio
 * painel escreve dentro de template string ao montar os cards.
 */
/* Comentário também contém `onclick="f('…')"` — em notas.app.js há um
   explicando a V-06 — e uma varredura ingênua sairia procurando uma função
   chamada `f`. Some com os comentários antes de varrer. */
function semComentarios(js) {
  return js.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

// `onchange="if(...)"` é código inline legítimo, não uma chamada de handler
const PALAVRA_RESERVADA = new Set([
  "if", "for", "while", "switch", "return", "typeof", "function", "catch",
  "new", "delete", "void", "do", "else", "var", "let", "const", "this", "try"
]);

function handlersDe(texto) {
  const re = /on(?:click|change|input|submit)\s*=\s*["'`]\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  const nomes = new Set();
  let m;
  while ((m = re.exec(texto))) if (!PALAVRA_RESERVADA.has(m[1])) nomes.add(m[1]);
  return [...nomes];
}

describe("Handlers do HTML existem no JS do painel", () => {
  // vêm de outros scripts da página ou do próprio navegador
  const DE_FORA = new Set(["EducaTheme", "Cloud", "alert", "confirm"]);

  for (const [html, js] of [["notas.html", "notas.app.js"], ["estudos.html", "estudos.app.js"]]) {
    it(`${html} → ${js}`, () => {
      const marcacao = readFileSync(new URL("../public/" + html, import.meta.url), "utf8");
      const codigo = readFileSync(new URL("../public/app/" + js, import.meta.url), "utf8");
      const nomes = [...new Set([...handlersDe(marcacao), ...handlersDe(semComentarios(codigo))])]
        .filter((n) => !DE_FORA.has(n));

      assert.ok(nomes.length > 0, "não achei handler nenhum — a varredura quebrou");

      const sonda = nomes.map((n) => `out[${JSON.stringify(n)}] = typeof ${n};`).join("\n");
      const out = carrega(js, sonda);
      const faltando = nomes.filter((n) => out[n] !== "function");
      assert.deepEqual(faltando, [], `handler sem função correspondente em ${js}`);
    });
  }
});

describe("Estudos · itens criados pelo aluno sobrevivem ao reload", () => {
  function saneia(item) {
    const out = carrega("estudos.app.js", "out.saneiaCustom = saneiaCustom;");
    return out.saneiaCustom(item);
  }

  it("preserva kind=provas", () => {
    // allItems() filtra state.custom por kind; sem ele o item some das duas abas
    assert.equal(saneia({ id: "u-1", kind: "provas", disc: "Física" }).kind, "provas");
  });

  it("preserva kind=pc", () => {
    assert.equal(saneia({ id: "u-2", kind: "pc", disc: "Redação" }).kind, "pc");
  });

  it("kind ausente ou estranho cai em provas, nunca em vazio", () => {
    assert.equal(saneia({ id: "u-3" }).kind, "provas");
    assert.equal(saneia({ id: "u-4", kind: "<script>" }).kind, "provas");
  });
});
