/**
 * O comunicado de verdade da coordenação vira cards?
 *
 * Os outros testes de CalParse usam entrada montada por mim, o que sempre corre
 * o risco de confirmar a minha suposição em vez do documento. Este usa o texto
 * como o app REALMENTE o reconstrói: PDF do "Calendário de Provas · 3º Bim ·
 * Agosto 2026" (COC Atibaia) passado pelo pdf.js e pela montaLinhas do
 * admin.app.js, colado abaixo literalmente.
 *
 * O que ele trava: as 12 matérias do calendário precisam virar item, com data e
 * área certas. Antes do conserto da leitura de PDF NENHUMA delas ancorava — os
 * acentos vinham partidos ("Ingl ê s") e o CalParse casa por prefixo exato.
 *
 * Só datas e nomes de professor da escola, nada de aluno.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const CalParse = require("../public/app/calparse.js");

const COMUNICADO = `Calendário de Provas Ensino Médio
3º Bim - Agosto 2026
Segue o calendário de provas e conteúdo das 3ª Séries. As provas serão realizadas:
Data Disciplina Conteúdo
17/08 Inglês Profa. Elen
Livro único - Módulos 8, 9
Temas: Present Tenses - Simple Present, Present Continuous,
18/08 História Prof. Daniel
Frente 62
Livros 4 e 5 Módulos 10 ao 13 Período Regencial e Segundo
19/08 Física Frente 1 - Prof. Medina
Livro 5 - Módulos 27 a 30
Temas: Dinâmica
20/08 Gramática Profa. Vanessa:
Livro - 5
Módulos 13- Frase, período, oração
21/08 Filosofia Prof. Bruno Rudã
-Livro: 4
-Módulos: 11 e 12
24/08 Matemática 2 Frente 2: Prof. Gabriel
Livro 6 - Módulos 32, 33 e 34: Equações trigonométricas em R.
25/08 Geografia Prof. Josias
Livro 04 - Frente 171
Módulo 22 - Geografia e Indústria
26/08 Química Frente 1: Prof. Marcus
Livro 4 - Módulos: 20 a 24
Temas: Ácidos e Bases de Arrhenius
27/08 Literatura Profa. Juliana
Módulo 13- Vanguardas e Semana de Arte Moderna
28/08 Matemática 1 e 3 Prof. Zell
Frente 11
Módulos: 21 ao 26
31/08 Biologia Frente 1: Profa. Brunna
Livro 4 e 5 - Módulos 20 a 26
Temas: Núcleo celular, replicação, transcrição e tradução.
27 e 28/8 Redação Prof Ademir
Gênero textual: Texto dissertativo-argumentativo modelo Enem
Ensino Médio COC Atibaia`;

const r = CalParse.parse(COMUNICADO, 2026);
const por = (d) => r.items.find((i) => i.disc === d);

describe("Comunicado real · calendário de provas de agosto/2026", () => {
  it("reconhece que é calendário de provas", () => {
    assert.equal(r.tipo, "provas");
  });

  it("acha as 12 matérias do comunicado", () => {
    assert.equal(r.items.length, 12, r.items.map((i) => i.disc).join(", "));
  });

  it("as matérias acentuadas ancoram (era aqui que tudo sumia)", () => {
    for (const d of ["Inglês", "História", "Física", "Gramática", "Filosofia",
                     "Matemática 2", "Química", "Redação", "Matemática 1 e 3"]) {
      assert.ok(por(d), d + " não virou item");
    }
  });

  it("cada matéria cai na data certa", () => {
    const esperado = {
      "Inglês": "2026-08-17", "História": "2026-08-18", "Física": "2026-08-19",
      "Gramática": "2026-08-20", "Filosofia": "2026-08-21", "Matemática 2": "2026-08-24",
      "Geografia": "2026-08-25", "Química": "2026-08-26", "Literatura": "2026-08-27",
      "Matemática 1 e 3": "2026-08-28", "Biologia": "2026-08-31"
    };
    for (const [disc, data] of Object.entries(esperado)) {
      assert.equal(por(disc).data, data, disc + " com data errada");
    }
  });

  it("a área sai do nome da matéria", () => {
    assert.equal(por("Física").area, "Natureza");
    assert.equal(por("História").area, "Humanas");
    assert.equal(por("Matemática 2").area, "Matemática");
    assert.equal(por("Inglês").area, "Linguagens");
  });

  it("o conteúdo de estudo chega junto do item", () => {
    assert.ok(por("Física").topics.some((t) => /Dinâmica/.test(t)));
    assert.ok(por("Biologia").topics.some((t) => /Núcleo celular/.test(t)));
  });

  it('"Geografia e Indústria" no meio do conteúdo não abre item novo', () => {
    // anchorInfo exige marcador estrutural antes da matéria justamente por isso
    assert.equal(r.items.filter((i) => i.disc === "Geografia").length, 1);
    assert.ok(por("Geografia").topics.some((t) => /Geografia e Indústria/.test(t)));
  });

  it("o conteúdo vira UMA linha por bloco, não três fragmentos", () => {
    /* Era a queixa: "fica feio quando lança o doc no sistema". A prova de
       Física chegava como três caixas de checklist —
         "Frente 1 - Prof. Medina" / "Livro 5 - Módulos 27 a 30" / "Temas: Dinâmica"
       — sendo uma prova só, com o professor virando item de estudo. */
    assert.deepEqual(por("Física").topics,
      ["Frente 1 (Medina) · Livro 5 · Mód. 27–30 — Dinâmica"]);
    assert.deepEqual(por("Geografia").topics,
      ["Frente 171 · Livro 4 · Mód. 22 — Geografia e Indústria"]);
    assert.deepEqual(por("Biologia").topics,
      ["Frente 1 (Brunna) · Livros 4 e 5 · Mód. 20–26 — Núcleo celular, replicação, transcrição e tradução"]);
  });

  it("o professor sai do meio do conteúdo e vai para o campo dele", () => {
    /* A regra de professor só olhava o INÍCIO da linha, então em
       "Frente 1 - Prof. Medina" o nome ficava preso no conteúdo e o campo
       `prof` vinha vazio — em 4 das 12 matérias. */
    for (const [disc, prof] of Object.entries({
      "Física": "Prof. Medina", "Química": "Prof. Marcus",
      "Biologia": "Profa. Brunna", "Matemática 2": "Prof. Gabriel"
    })) {
      assert.equal(por(disc).prof, prof, disc + " sem professor");
    }
  });

  it("os módulos viram intervalo só quando o documento diz intervalo", () => {
    // "Módulos 8, 9" é lista; "Módulos 27 a 30" e "10 ao 13" são intervalo
    assert.match(por("Inglês").topics[0], /Mód\. 8 e 9/);
    assert.match(por("História").topics[0], /Mód\. 10–13/);
    assert.match(por("Filosofia").topics[0], /Mód\. 11 e 12/);
    // "32, 33 e 34" são 3 consecutivos → vira faixa
    assert.match(por("Matemática 2").topics[0], /Mód\. 32–34/);
  });

  it("nenhum tópico sobra só com o nome do professor", () => {
    for (const it of r.items) {
      for (const t of it.topics) {
        assert.ok(!/^Frente\s*\d+\s*$/.test(t), it.disc + ': tópico vazio "' + t + '"');
        assert.ok(!/^Profa?\b/.test(t), it.disc + ': professor virou tópico "' + t + '"');
      }
    }
  });

  it("o rodapé da escola não vira item nem conteúdo", () => {
    assert.ok(!r.items.some((i) => /COC Atibaia|Rede Única/.test(i.disc)));
    const todos = r.items.flatMap((i) => i.topics).join(" ");
    assert.ok(!/Rede Única Educação/.test(todos));
  });
});
