/**
 * Integridade dos gabaritos e da correção.
 *
 * Por que isto existe: um gabarito corrompido não quebra nada visivelmente.
 * Ele devolve um número de acertos plausível e falso, e o aluno usa esse número
 * pra decidir o que estudar. É o tipo de defeito que passa despercebido por
 * meses. Estes testes travam o CI se o dado for mexido.
 *
 * As checagens de integridade rodam sobre TODAS as edições, não só uma: cada
 * edição nova entra automaticamente sob as mesmas regras.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// gabaritos.js é script de navegador (define window.Gabaritos), não módulo.
const src = readFileSync(new URL("../public/app/gabaritos.js", import.meta.url), "utf8");
const window = {};
new Function("window", src)(window);
const G = window.Gabaritos;

const TODAS = G.edicoes();
const chave = (ed, v) => ed.versoes[v].chave;

describe("Gabaritos · integridade de todas as edições", () => {
  it("existe pelo menos uma edição", () => {
    assert.ok(TODAS.length > 0);
  });

  for (const ed of TODAS) {
    describe(ed.nome, () => {
      it("declara fonte oficial e data de conferência", () => {
        assert.match(ed.fonte, /^https:\/\//);
        assert.ok(ed.conferido, "sem data de conferência");
        assert.ok(ed.total > 0);
      });

      it("toda versão tem exatamente `total` respostas", () => {
        for (const v of G.versoesDe(ed)) {
          assert.equal(chave(ed, v).length, ed.total, `${v} não tem ${ed.total}`);
        }
      });

      it("nenhuma resposta usa alternativa que não existe na prova", () => {
        // foi esta regra que revelou que a UNICAMP usa 4 alternativas (A–D):
        // um "E" ali seria resposta impossível, sinal de extração torta
        const validas = G.alternativasDe(ed).join("");
        const re = new RegExp(`^[${validas}*]+$`);
        for (const v of G.versoesDe(ed)) {
          assert.match(chave(ed, v), re, `${v} usa alternativa fora de ${validas}`);
        }
      });

      it("toda versão tem rótulo (é o que o aluno confere na capa)", () => {
        for (const v of G.versoesDe(ed)) {
          assert.ok(G.rotuloDe(ed, v), `${v} sem rótulo`);
        }
      });

      it("as versões são REALMENTE diferentes entre si", () => {
        // se duas versões fossem iguais, escolher a versão seria decorativo
        const vs = G.versoesDe(ed);
        for (let i = 0; i < vs.length; i++)
          for (let j = i + 1; j < vs.length; j++)
            assert.notEqual(chave(ed, vs[i]), chave(ed, vs[j]),
              `${vs[i]} e ${vs[j]} têm o mesmo gabarito`);
      });

      it("gabarito inteiro na própria versão dá nota cheia", () => {
        for (const v of G.versoesDe(ed)) {
          const resp = chave(ed, v).split("").map((c) => (c === "*" ? "" : c));
          const r = G.corrigir(ed, v, resp);
          assert.equal(r.acertos, ed.total, `${v} não fechou ${ed.total}`);
          assert.equal(r.erros, 0);
        }
      });
    });
  }
});

const fuvest25 = TODAS.find((e) => e.inst === "FUVEST" && e.ano === 2025);
const fuvest24 = TODAS.find((e) => e.inst === "FUVEST" && e.ano === 2024);
const unicamp25 = TODAS.find((e) => e.inst === "UNICAMP" && e.ano === 2025);

describe("Gabaritos · correção", () => {
  it("A ARMADILHA: o mesmo cartão na versão errada NÃO dá nota cheia", () => {
    // é exatamente isto que faz a escolha de versão ser obrigatória na tela
    const r = G.corrigir(fuvest25, "V4", chave(fuvest25, "V1").split(""));
    assert.ok(r.acertos < fuvest25.total);
  });

  it("questão em branco conta como erro, nunca como acerto", () => {
    const resp = chave(fuvest25, "V1").split("");
    resp[0] = ""; resp[1] = "";
    const r = G.corrigir(fuvest25, "V1", resp);
    assert.equal(r.acertos, 88);
    assert.equal(r.brancos, 2);
    assert.equal(r.erros, 0);
    assert.equal(r.acertos + r.erros + r.brancos, 90);
  });

  it("aceita minúscula e devolve o detalhe questão a questão", () => {
    const r = G.corrigir(fuvest25, "V1", chave(fuvest25, "V1").toLowerCase().split(""));
    assert.equal(r.acertos, 90);
    assert.equal(r.detalhe.length, 90);
    assert.equal(r.detalhe[0].q, 1);
    assert.equal(r.detalhe[0].certa, "E");
    assert.equal(r.detalhe[0].ok, true);
  });

  it("versão desconhecida falha em vez de corrigir errado", () => {
    assert.throws(() => G.corrigir(fuvest25, "V9", []), /Versão desconhecida/);
  });
});

describe("Gabaritos · questão anulada", () => {
  it("UNICAMP 2025 tem a questão 53 anulada", () => {
    assert.equal(chave(unicamp25, "QZ").charAt(52), "*");
  });

  it("anulada conta como acerto mesmo em branco — o ponto é de todos", () => {
    const resp = new Array(unicamp25.total).fill("");
    const r = G.corrigir(unicamp25, "QZ", resp);
    assert.equal(r.acertos, 1, "só a anulada deveria pontuar");
    assert.equal(r.anuladas, 1);
    assert.equal(r.detalhe[52].ok, true);
    assert.equal(r.detalhe[52].anulada, true);
  });

  it("anulada não entra em brancos nem em erros", () => {
    const resp = new Array(unicamp25.total).fill("");
    const r = G.corrigir(unicamp25, "QZ", resp);
    assert.equal(r.acertos + r.erros + r.brancos, unicamp25.total);
    assert.equal(r.brancos, unicamp25.total - 1);
  });
});

describe("Gabaritos · questão com gabarito duplo", () => {
  it("FUVEST 2024 aceita D e E na questão retificada", () => {
    // a banca retificou sem anular: as duas alternativas valem
    const mult = fuvest24.multiplas.V;
    const q = Number(Object.keys(mult)[0]);
    assert.equal(mult[q], "DE");

    for (const letra of ["D", "E"]) {
      const resp = new Array(fuvest24.total).fill("");
      resp[q - 1] = letra;
      const r = G.corrigir(fuvest24, "V", resp);
      assert.equal(r.detalhe[q - 1].ok, true, `${letra} deveria valer`);
    }
  });

  it("uma alternativa fora do gabarito duplo continua errada", () => {
    const q = Number(Object.keys(fuvest24.multiplas.V)[0]);
    const resp = new Array(fuvest24.total).fill("");
    resp[q - 1] = "A";
    const r = G.corrigir(fuvest24, "V", resp);
    assert.equal(r.detalhe[q - 1].ok, false);
  });
});

describe("Gabaritos · alternativas por banca", () => {
  it("UNICAMP oferece 4 alternativas, FUVEST e ENEM oferecem 5", () => {
    assert.deepEqual(G.alternativasDe(unicamp25), ["A", "B", "C", "D"]);
    assert.deepEqual(G.alternativasDe(fuvest25), ["A", "B", "C", "D", "E"]);
  });

  it("cobre as bancas pedidas", () => {
    const insts = [...new Set(TODAS.map((e) => e.inst))].sort();
    assert.deepEqual(insts, ["ENEM", "FUVEST", "UNESP", "UNICAMP"]);
  });
});
