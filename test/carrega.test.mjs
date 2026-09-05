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

describe("Carga dos painéis", () => {
  for (const arq of ["estudos.app.js", "notas.app.js", "vestibular.app.js", "admin.app.js"]) {
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
