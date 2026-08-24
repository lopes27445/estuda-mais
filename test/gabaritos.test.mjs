/**
 * Integridade dos gabaritos e da correção.
 *
 * Por que isto existe: um gabarito corrompido não quebra nada visivelmente.
 * Ele devolve um número de acertos plausível e falso, e o aluno usa esse número
 * pra decidir o que estudar. É o tipo de defeito que passa despercebido por
 * meses. Estes testes travam o CI se o dado for mexido.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// gabaritos.js é script de navegador (define window.Gabaritos), não módulo.
const src = readFileSync(new URL("../public/app/gabaritos.js", import.meta.url), "utf8");
const window = {};
new Function("window", src)(window);
const G = window.Gabaritos;

const fuvest = G.edicoes("FUVEST")[0];

describe("Gabaritos · integridade do dado", () => {
  it("FUVEST 2025 existe e declara fonte e data de conferência", () => {
    assert.equal(fuvest.ano, 2025);
    assert.equal(fuvest.total, 90);
    assert.match(fuvest.fonte, /^https:\/\/www\.fuvest\.br\//);
    assert.ok(fuvest.conferido);
  });

  it("as 4 versões têm 90 respostas, todas entre A e E", () => {
    const vs = G.versoesDe(fuvest);
    assert.deepEqual(vs, ["V1", "V2", "V3", "V4"]);
    for (const v of vs) {
      const k = fuvest.versoes[v];
      assert.equal(k.length, 90, `${v} não tem 90 respostas`);
      assert.match(k, /^[A-E]{90}$/, `${v} tem caractere inválido`);
    }
  });

  it("as versões são REALMENTE diferentes entre si", () => {
    // se duas versões fossem iguais, a escolha de versão seria decorativa
    const vs = G.versoesDe(fuvest);
    for (let i = 0; i < vs.length; i++)
      for (let j = i + 1; j < vs.length; j++)
        assert.notEqual(fuvest.versoes[vs[i]], fuvest.versoes[vs[j]],
          `${vs[i]} e ${vs[j]} têm o mesmo gabarito`);
  });

  it("bate com a tabela de correspondência do PDF oficial (V1 q1 = V4 q51)", () => {
    assert.equal(fuvest.versoes.V1.charAt(0), "E");
    assert.equal(fuvest.versoes.V4.charAt(50), "E");
  });
});

describe("Gabaritos · correção", () => {
  it("gabarito inteiro na versão certa dá 90/90", () => {
    const r = G.corrigir(fuvest, "V1", fuvest.versoes.V1.split(""));
    assert.equal(r.acertos, 90);
    assert.equal(r.erros, 0);
    assert.equal(r.brancos, 0);
  });

  it("A ARMADILHA: o mesmo cartão na versão errada NÃO dá 90", () => {
    // é exatamente isto que faz a escolha de versão ser obrigatória na tela.
    const r = G.corrigir(fuvest, "V4", fuvest.versoes.V1.split(""));
    assert.notEqual(r.acertos, 90);
    assert.ok(r.acertos < 90);
  });

  it("questão em branco conta como erro, nunca como acerto", () => {
    const resp = fuvest.versoes.V1.split("");
    resp[0] = ""; resp[1] = "";
    const r = G.corrigir(fuvest, "V1", resp);
    assert.equal(r.acertos, 88);
    assert.equal(r.brancos, 2);
    assert.equal(r.erros, 0);
    assert.equal(r.acertos + r.erros + r.brancos, 90);
  });

  it("aceita minúscula e devolve o detalhe questão a questão", () => {
    const r = G.corrigir(fuvest, "V1", fuvest.versoes.V1.toLowerCase().split(""));
    assert.equal(r.acertos, 90);
    assert.equal(r.detalhe.length, 90);
    assert.equal(r.detalhe[0].q, 1);
    assert.equal(r.detalhe[0].certa, "E");
    assert.equal(r.detalhe[0].ok, true);
  });

  it("versão desconhecida falha em vez de corrigir errado", () => {
    assert.throws(() => G.corrigir(fuvest, "V9", []), /Versão desconhecida/);
  });
});
