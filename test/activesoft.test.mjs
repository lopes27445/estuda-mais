/**
 * Leitor do boletim do Activesoft.
 *
 * A fixture é SINTÉTICA: reproduz a geometria real do boletim (posições de
 * coluna, linha-mãe sem AV1, "DISP", cabeçalho com duas colunas na mesma
 * altura) com nomes e notas inventados. Nenhum boletim real entra no
 * repositório — são notas de uma pessoa, não material de teste.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../public/app/activesoft.js", import.meta.url), "utf8");
const window = {};
new Function("window", src)(window);
const A = window.Activesoft;

/* Geometria copiada do boletim real: 3 blocos de bimestre, 10 colunas cada. */
const X0 = 102.6, PASSO = 155.5;
const OFF = { av1: 0, av2: 19, pc: 38, ave: 52, med: 70, faltas: 90, recMed: 98, recF: 118, bimMed: 126, bimF: 146 };
const ORDEM = ["av1", "av2", "pc", "ave", "med", "faltas", "recMed", "recF", "bimMed", "bimF"];
const ROTULO = { av1: "AV1", av2: "AV2", pc: "PC", ave: "AVE", med: "MED", faltas: "F", recMed: "MED", recF: "F", bimMed: "MED", bimF: "F" };

function tokens(linhasIdent, disciplinas) {
  const t = [];
  let y = 10;
  linhasIdent.forEach((l) => { t.push({ x: 20, y: y, t: l }); y += 12; });
  const yCab = y; y += 16;
  for (let b = 0; b < 3; b++) {
    ORDEM.forEach((c) => t.push({ x: X0 + b * PASSO + OFF[c], y: yCab, t: ROTULO[c] }));
  }
  disciplinas.forEach((d) => {
    t.push({ x: 30, y: y, t: d.nome });
    d.bims.forEach((bim, b) => {
      Object.keys(bim).forEach((c) => {
        if (bim[c] === undefined) return;
        t.push({ x: X0 + b * PASSO + OFF[c], y: y + (c === "med" ? 0.4 : 0), t: String(bim[c]) });
      });
    });
    y += 15;
  });
  return t;
}

const IDENT = [
  "Escola Exemplo",
  "Rua Qualquer, 4720",
  "CEP: 12947-000",
  "BOLETIM ESCOLAR",
  "Aluno(a): Fulano de Tal",
  "Matrícula: 00009999",
  "Emissão: 21/08/2026",
  // cabeçalho embaralhado igual ao real: duas colunas na mesma altura
  "MÉDIO SÉRIE SÉRIE Situação ENSINO / 2ª / 2026 / 2° C atual: Cursando"
];

const DISCIPLINAS = [
  // linha-mãe: só média, sem AV1 (matéria com sub-disciplinas)
  { nome: "Matemática", bims: [
      { med: "6,5", faltas: "2", bimMed: "6,5", bimF: "0" },
      { med: "7,0", faltas: "1", bimMed: "7,0", bimF: "0" },
      {}
  ] },
  { nome: "Matemática 1", bims: [
      { av1: "7,0", av2: "4,5", pc: "5,5", ave: "2,0", med: "6,5", faltas: "0", bimMed: "6,5", bimF: "0" },
      { av1: "5,5", av2: "7,0", pc: "5,6", ave: "2,0", med: "6,5", faltas: "0", bimMed: "6,5", bimF: "0" },
      {}
  ] },
  { nome: "Geografia", bims: [
      { av1: "10,0", av2: "6,5", pc: "6,0", ave: "2,0", med: "8,0", faltas: "3", bimMed: "8,0", bimF: "0" },
      { av1: "9,0", av2: "6,0", pc: "6,0", ave: "2,0", med: "7,5", faltas: "0", bimMed: "7,5", bimF: "0" },
      {}
  ] },
  { nome: "Redação", bims: [
      { av1: "7,6", av2: "DISP", pc: "6,0", ave: "2,0", med: "8,0", faltas: "0", bimMed: "8,0", bimF: "0" },
      {}, {}
  ] }
];

const lido = A.parseTokens(tokens(IDENT, DISCIPLINAS));

describe("Activesoft · identificação", () => {
  it("lê aluno, matrícula e emissão", () => {
    assert.equal(lido.info.aluno, "Fulano de Tal");
    assert.equal(lido.info.matricula, "00009999");
    assert.equal(lido.info.emissao, "21/08/2026");
  });

  it("lê série e turma mesmo com o cabeçalho embaralhado", () => {
    assert.equal(lido.info.serie, "2");
    assert.equal(lido.info.turma, "C");
  });

  it("ano vem da linha do curso, não do CEP nem do número da rua", () => {
    assert.equal(lido.info.ano, "2026");
  });
});

describe("Activesoft · tabela", () => {
  it("acha as 4 disciplinas", () => {
    assert.equal(lido.disciplinas.length, 4);
  });

  it("distingue linha-mãe de sub-disciplina", () => {
    const mae = lido.disciplinas.find((d) => d.nome === "Matemática");
    const filha = lido.disciplinas.find((d) => d.nome === "Matemática 1");
    assert.equal(mae.agregada, true);
    assert.equal(filha.agregada, false);
  });

  it("cada valor cai em UMA coluna só", () => {
    // o bug original: a média era contada de novo como falta da recuperação,
    // porque as colunas ficam a menos de uma tolerância uma da outra
    const mae = lido.disciplinas.find((d) => d.nome === "Matemática");
    assert.equal(mae.bimestres[0].med, "6,5");
    assert.equal(mae.bimestres[0].bimMed, "6,5");
    assert.equal(mae.bimestres[0].recF, "");
    assert.equal(mae.bimestres[0].recMed, "");
  });

  it("lê as quatro notas de uma disciplina normal", () => {
    const g = lido.disciplinas.find((d) => d.nome === "Geografia").bimestres[0];
    assert.deepEqual([g.av1, g.av2, g.pc, g.ave], ["10,0", "6,5", "6,0", "2,0"]);
  });

  it("preserva DISP em vez de descartar", () => {
    const r = lido.disciplinas.find((d) => d.nome === "Redação").bimestres[0];
    assert.equal(r.av2, "DISP");
  });

  it("bimestre sem lançamento fica vazio, não vira zero", () => {
    const g = lido.disciplinas.find((d) => d.nome === "Geografia").bimestres[2];
    assert.equal(g.av1, "");
    assert.equal(g.med, "");
  });
});

describe("Activesoft · mapeamento para o painel", () => {
  function painelVazio(nomes) {
    return nomes.map((n) => ({
      name: n,
      bims: [0, 1, 2, 3].map(() => ({ av1: "", av2: "", pc: "", ave: "", medManual: "" }))
    }));
  }

  it("matéria com sub-disciplinas entra pela média direta", () => {
    const subs = painelVazio(["Matemática"]);
    A.paraPainel(lido, subs);
    assert.equal(subs[0].bims[0].medManual, "6,5");
    assert.equal(subs[0].bims[0].av1, "");
  });

  it("matéria normal entra pelas quatro notas", () => {
    const subs = painelVazio(["Geografia"]);
    A.paraPainel(lido, subs);
    assert.deepEqual(
      [subs[0].bims[0].av1, subs[0].bims[0].av2, subs[0].bims[0].pc, subs[0].bims[0].ave],
      ["10,0", "6,5", "6,0", "2,0"]
    );
  });

  it("matéria que não está no boletim é reportada e fica intacta", () => {
    const subs = painelVazio(["Geografia", "Astronomia"]);
    const res = A.paraPainel(lido, subs);
    assert.deepEqual(res.naoAchadas, ["Astronomia"]);
    assert.equal(subs[1].bims[0].av1, "");
  });

  it("casa nome com e sem acento", () => {
    const subs = painelVazio(["MATEMATICA"]);
    const res = A.paraPainel(lido, subs);
    assert.deepEqual(res.casadas, ["MATEMATICA"]);
  });
});

/* A regra do DISP vive em notas.app.js, que é script de navegador e não pode
   ser importado inteiro aqui. As funções de cálculo são puras, então são
   extraídas do próprio arquivo publicado — assim o teste valida o código que
   realmente vai pro ar, e não uma cópia. */
describe("Cálculo da média com prova dispensada", () => {
  const notas = readFileSync(new URL("../public/app/notas.app.js", import.meta.url), "utf8");
  function corta(nome) {
    const i = notas.indexOf("function " + nome + "(");
    assert.ok(i > 0, "não achei " + nome);
    let nivel = 0, j = notas.indexOf("{", i);
    for (let k = j; k < notas.length; k++) {
      if (notas[k] === "{") nivel++;
      else if (notas[k] === "}" && --nivel === 0) return notas.slice(i, k + 1);
    }
    throw new Error("não fechou " + nome);
  }
  const escopo = {};
  new Function("out", corta("num") + corta("round05") + corta("mediaBim")
    + "out.mediaBim=mediaBim; out.round05=round05;")(escopo);
  const med = (b, semAV2) => {
    const m = escopo.mediaBim(b, semAV2);
    return m ? escopo.round05(m.raw) : null;
  };

  it("DISP sai da conta e o divisor cai pra 2 (bate com o boletim oficial)", () => {
    // caso real que expôs o bug: dava 7,5 antes da correção, oficial é 8,0
    assert.equal(med({ av1: "7,6", av2: "DISP", pc: "6,0", ave: "2,0", medManual: "" }), 8);
  });

  it("funciona também com a AV1 dispensada", () => {
    assert.equal(med({ av1: "DISP", av2: "6,8", pc: "5,2", ave: "2,0", medManual: "" }), 7);
  });

  it("sem dispensa nenhuma continua dividindo por 3", () => {
    assert.equal(med({ av1: "10,0", av2: "6,5", pc: "6,0", ave: "2,0", medManual: "" }), 8);
  });

  it("matéria sem AV2 usa o divisor 2", () => {
    assert.equal(med({ av1: "8,0", av2: "", pc: "4,7", ave: "2,0", medManual: "" }, true), 7.5);
  });

  it("uma prova só, sem dispensa, não gera média", () => {
    assert.equal(med({ av1: "7,0", av2: "", pc: "6,0", ave: "2,0", medManual: "" }), null);
  });
});
