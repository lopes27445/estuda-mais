/**
 * Leitura do comunicado da coordenação: PDF -> linhas -> CalParse -> cards.
 *
 * O elo fraco não é o CalParse, é o que chega até ele. O PDF.js devolve acento
 * e ligadura em token próprio ("Matem"|"á"|"tica"); juntando tudo com espaço
 * sai "Matem á tica", e o CalParse casa matéria por PREFIXO EXATO — então a
 * matéria não ancora e o item some do rascunho. Como quase toda matéria do
 * comunicado é acentuada, o rascunho vinha praticamente vazio.
 *
 * `montaLinhas` é extraída do admin.app.js publicado (é script de navegador,
 * não dá pra importar inteiro) para o teste validar o código que vai pro ar.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const CalParse = require("../public/app/calparse.js");

const admin = readFileSync(new URL("../public/app/admin.app.js", import.meta.url), "utf8");
function corta(nome) {
  const i = admin.indexOf("function " + nome + "(");
  assert.ok(i > 0, "não achei " + nome);
  let nivel = 0;
  for (let k = admin.indexOf("{", i); k < admin.length; k++) {
    if (admin[k] === "{") nivel++;
    else if (admin[k] === "}" && --nivel === 0) return admin.slice(i, k + 1);
  }
  throw new Error("não fechou " + nome);
}
const escopo = {};
new Function("out", "var TOL_LINHA=3.5, VAO_ESPACO=1;" + corta("montaLinhas")
  + "out.montaLinhas=montaLinhas;")(escopo);
const { montaLinhas } = escopo;

/* Helper: monta tokens de uma linha. Pedaços com vão 0 são a MESMA palavra
   (é assim que o PDF.js entrega acento); vão explícito separa palavras. */
function linha(y, partes, x0 = 50) {
  let x = x0;
  return partes.map((p) => {
    const t = { x, y, w: p.w, s: p.s };
    x += p.w + (p.vao || 0);
    return t;
  });
}
const P = (s, w, vao = 0) => ({ s, w, vao });

describe("Comunicado · reconstrução das linhas do PDF", () => {
  it("remonta palavra com acento sem espaço no meio", () => {
    const toks = linha(700, [P("Matem", 30), P("á", 5), P("tica", 20)]);
    assert.deepEqual(montaLinhas(toks), ["Matemática"]);
  });

  it("preserva o espaço entre palavras de verdade", () => {
    const toks = linha(700, [P("L", 5), P("í", 4), P("ngua", 22, 4), P("Portuguesa", 48)]);
    assert.deepEqual(montaLinhas(toks), ["Língua Portuguesa"]);
  });

  it("tokens da mesma linha visual não se partem por fração de y", () => {
    // y 700,4 e 700,6 arredondavam para 700 e 701 e viravam duas linhas
    const toks = [
      { x: 50, y: 700.4, w: 30, s: "Matem" },
      { x: 80, y: 700.6, w: 5, s: "á" },
      { x: 85, y: 700.5, w: 20, s: "tica" }
    ];
    assert.deepEqual(montaLinhas(toks), ["Matemática"]);
  });

  it("linhas saem de cima para baixo", () => {
    const toks = [].concat(
      linha(600, [P("Biologia", 40)]),
      linha(700, [P("Geografia", 45)])
    );
    assert.deepEqual(montaLinhas(toks), ["Geografia", "Biologia"]);
  });
});

describe("Comunicado · do PDF ao card", () => {
  // um comunicado mínimo, com as matérias chegando quebradas como o PDF.js entrega
  function comunicadoTokens() {
    return [].concat(
      linha(800, [P("Calend", 40), P("á", 5), P("rio", 16, 4), P("de", 12, 4), P("Provas", 32)]),
      linha(780, [P("Data", 22, 6), P("Disciplina", 48)]),
      linha(760, [P("Conte", 28), P("ú", 5), P("do", 12)]),
      linha(740, [P("10/09", 26, 5), P("Matem", 30), P("á", 5), P("tica", 20)]),
      linha(720, [P("M", 8), P("ó", 5), P("dulo", 24, 4), P("3", 6)]),
      linha(700, [P("12/09", 26, 5), P("Hist", 22), P("ó", 5), P("ria", 15)]),
      linha(680, [P("Brasil", 30, 4), P("Rep", 18), P("ú", 5), P("blica", 28)])
    );
  }

  it("as matérias acentuadas viram itens (era aqui que sumia tudo)", () => {
    const texto = montaLinhas(comunicadoTokens()).join("\n");
    const r = CalParse.parse(texto, 2026);
    const discs = r.items.map((i) => i.disc);
    assert.ok(discs.includes("Matemática"), "Matemática não ancorou: " + JSON.stringify(discs));
    assert.ok(discs.includes("História"), "História não ancorou: " + JSON.stringify(discs));
  });

  it("cada item leva sua data e sua área", () => {
    const r = CalParse.parse(montaLinhas(comunicadoTokens()).join("\n"), 2026);
    const mat = r.items.find((i) => i.disc === "Matemática");
    const hist = r.items.find((i) => i.disc === "História");
    assert.equal(mat.data, "2026-09-10");
    assert.equal(mat.area, "Matemática");
    assert.equal(hist.data, "2026-09-12");
    assert.equal(hist.area, "Humanas");
  });

  it("o conteúdo acentuado também chega inteiro", () => {
    const r = CalParse.parse(montaLinhas(comunicadoTokens()).join("\n"), 2026);
    const mat = r.items.find((i) => i.disc === "Matemática");
    /* O CalParse agora normaliza "Módulo 3" para "Mód. 3" ao compor o tópico,
       então procurar a palavra "Módulo" inteira deixou de valer. A assertiva
       abaixo continua provando a MESMA coisa, e um pouco mais: se o acento
       tivesse vindo partido ("M ó dulo 3", que era o bug), RE_MOD não casaria
       e a linha cairia como texto livre — sobraria "M ó dulo 3", não "Mód. 3". */
    assert.deepEqual(mat.topics, ["Mód. 3"], JSON.stringify(mat.topics));
  });

  it("REGRESSÃO: juntando tudo com espaço, a matéria deixa de ancorar", () => {
    // reproduz o comportamento antigo, para o teste acima não passar por acaso
    const antigo = [];
    const porY = {};
    comunicadoTokens().forEach((t) => {
      const y = Math.round(t.y);
      (porY[y] = porY[y] || []).push(t);
    });
    Object.keys(porY).map(Number).sort((a, b) => b - a).forEach((y) => {
      antigo.push(porY[y].sort((a, b) => a.x - b.x).map((o) => o.s).join(" "));
    });
    const r = CalParse.parse(antigo.join("\n"), 2026);
    const discs = r.items.map((i) => i.disc);
    assert.ok(!discs.includes("Matemática"),
      "o modo antigo deveria falhar — se passou, o teste acima não prova nada");
  });
});
