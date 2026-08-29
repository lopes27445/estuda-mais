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

/* Como o pdf.js REALMENTE entrega este boletim — e que a fixture acima não
   reproduzia, por criar um token por rótulo.

   O pdf.js só separa o que o PDF escreveu em operações de texto distintas. No
   boletim do COC:
     1. a faixa de rótulos sai como UMA corrida ("AV2 PC AVE MED F MED F MED F"),
        então nenhum rótulo casava sozinho e o cabeçalho inteiro era descartado
        — a importação morria em "não reconheci o formato deste PDF";
     2. acento e ligadura viram tokens próprios ("F"|"í"|"sica"), e juntar com
        espaço produzia "F í sica", que não casa com a matéria do painel;
     3. campos vizinhos podem vir grudados ("DISP 4,7"), custando a coluna PC.

   As posições e larguras abaixo são as medidas no boletim real; os nomes e as
   notas continuam inventados, que é a regra deste arquivo. */
describe("Activesoft · geometria real do pdf.js", () => {
  const X0 = 102.6, PASSO = 155.5;
  const yCab = 100;

  function tokensReais(nomeFrags, valores) {
    const t = [];
    t.push({ x: 33, y: 40, t: "Aluno(a):", w: 33.1 });
    t.push({ x: 70.1, y: 40, t: "Fulano de Tal", w: 87.5 });
    // acento em token próprio, colado (gap 0) — como o pdf.js entrega
    t.push({ x: 33, y: 52, t: "Matr", w: 16.9 });
    t.push({ x: 49.9, y: 52, t: "í", w: 2.2 });
    t.push({ x: 52.1, y: 52, t: "cula:", w: 17.3 });
    t.push({ x: 73.4, y: 52, t: "00009999", w: 36.0 });
    t.push({ x: 28.5, y: 64, t: "ENSINO M", w: 37.6 });
    t.push({ x: 66.1, y: 64, t: "É", w: 4.5 });
    t.push({ x: 70.6, y: 64, t: "DIO / 2ª", w: 28.1 });
    t.push({ x: 100.7, y: 64, t: "S", w: 4.9 });
    t.push({ x: 105.6, y: 64, t: "É", w: 4.5 });
    t.push({ x: 110.1, y: 64, t: "RIE / 2026 / 2° S", w: 58.8 });
    t.push({ x: 168.9, y: 64, t: "É", w: 4.5 });
    t.push({ x: 173.4, y: 64, t: "RIE C", w: 20.0 });
    // cabeçalho: AV1 solto + o resto do bloco numa corrida só
    for (let b = 0; b < 3; b++) {
      t.push({ x: X0 + b * PASSO, y: yCab, t: "AV1", w: 14.5 });
      t.push({ x: X0 + b * PASSO + 19, y: yCab, t: "AV2 PC AVE MED F MED F MED F", w: 131.2 });
    }
    // linha da disciplina
    let y = yCab + 20;
    nomeFrags.forEach((f) => t.push({ x: f.x, y: y, t: f.t, w: f.w }));
    valores.forEach((v) => t.push({ x: v.x, y: y, t: v.t, w: v.w }));
    return t;
  }

  it("lê o cabeçalho mesmo com os rótulos numa corrida só", () => {
    const lido = A.parseTokens(tokensReais(
      [{ x: 36.5, t: "Geogra", w: 22.0 }, { x: 58.5, t: "fi", w: 4.0 }, { x: 62.5, t: "a", w: 5.0 }],
      [{ x: X0, t: "10,0", w: 10.6 }, { x: X0 + 19, t: "6,5", w: 10.6 },
       { x: X0 + 38, t: "6,0", w: 10.6 }, { x: X0 + 52, t: "2,0", w: 10.6 }]
    ));
    assert.equal(lido.disciplinas.length, 1);
    const g = lido.disciplinas[0].bimestres[0];
    assert.deepEqual([g.av1, g.av2, g.pc, g.ave], ["10,0", "6,5", "6,0", "2,0"]);
  });

  it("remonta o nome com acento e ligadura, sem espaço no meio", () => {
    const lido = A.parseTokens(tokensReais(
      [{ x: 36.5, t: "Geogra", w: 22.0 }, { x: 58.5, t: "fi", w: 4.0 }, { x: 62.5, t: "a", w: 5.0 }],
      [{ x: X0, t: "10,0", w: 10.6 }, { x: X0 + 19, t: "6,5", w: 10.6 }]
    ));
    assert.equal(lido.disciplinas[0].nome, "Geografia");
  });

  it("preserva o espaço real entre palavras do nome", () => {
    const lido = A.parseTokens(tokensReais(
      [{ x: 36.5, t: "L", w: 4.4 }, { x: 40.9, t: "í", w: 2.0 }, { x: 42.9, t: "ngua", w: 16.0 },
       { x: 62.9, t: "Inglesa", w: 25.0 }],
      [{ x: X0, t: "8,0", w: 10.6 }, { x: X0 + 19, t: "6,5", w: 10.6 }]
    ));
    assert.equal(lido.disciplinas[0].nome, "Língua Inglesa");
  });

  it('separa campos grudados ("DISP 4,7") em AV2 e PC', () => {
    const lido = A.parseTokens(tokensReais(
      [{ x: 36.5, t: "Geogra", w: 22.0 }, { x: 58.5, t: "fi", w: 4.0 }, { x: 62.5, t: "a", w: 5.0 }],
      [{ x: X0, t: "8,0", w: 10.6 }, { x: X0 + 19, t: "DISP 4,7", w: 30.4 },
       { x: X0 + 52, t: "2,0", w: 10.6 }]
    ));
    const g = lido.disciplinas[0].bimestres[0];
    assert.equal(g.av2, "DISP");
    assert.equal(g.pc, "4,7");
  });

  it("lê matrícula, série e turma com o acento em token separado", () => {
    const lido = A.parseTokens(tokensReais(
      [{ x: 36.5, t: "Geogra", w: 22.0 }, { x: 58.5, t: "fi", w: 4.0 }, { x: 62.5, t: "a", w: 5.0 }],
      [{ x: X0, t: "8,0", w: 10.6 }, { x: X0 + 19, t: "6,5", w: 10.6 }]
    ));
    assert.equal(lido.info.matricula, "00009999");
    assert.equal(lido.info.serie, "2");
    assert.equal(lido.info.turma, "C");
    assert.equal(lido.info.ano, "2026");
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
