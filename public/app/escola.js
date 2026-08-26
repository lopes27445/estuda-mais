/* escola.js — vocabulário compartilhado da escola: salas e matérias.
   ============================================================================
   Existe porque "turma" nunca foi uma coisa de verdade no sistema: era uma
   letra que o próprio aluno digitava no cadastro, sem nada por trás. Nenhum
   painel filtrava ou agrupava por ela.

   A partir daqui a sala é uma entidade, e a matrícula tem dono: o aluno PEDE,
   a coordenação APROVA. Enquanto o pedido está pendente o aluno não aparece
   para professor nenhum.
   ============================================================================ */
(function () {
  "use strict";

  var SERIES = ["1", "2", "3"];
  var TURMAS = ["A", "B", "C", "D", "—"];

  /* Id da sala. A turma "—" (escola sem divisão de turma) vira "U" de única,
     porque travessão não é um id de documento saudável. */
  function salaId(serie, turma) {
    var s = String(serie || "").trim();
    var t = String(turma || "").trim();
    if (SERIES.indexOf(s) < 0) return null;
    if (TURMAS.indexOf(t) < 0) return null;
    return s + (t === "—" ? "U" : t);
  }

  function salaNome(serie, turma) {
    return serie + "ª " + (turma === "—" ? "(turma única)" : turma);
  }

  /* Lista canônica de matérias. Antes cada painel tinha a sua e nenhuma
     conversava com a outra — "Matematica" e "Matemática" viravam matérias
     diferentes. O `id` é o que vai pro banco; o `nome` é o que a pessoa lê. */
  var MATERIAS = [
    { id: "biologia",          nome: "Biologia" },
    { id: "fisica",            nome: "Física" },
    { id: "quimica",           nome: "Química" },
    { id: "matematica",        nome: "Matemática" },
    { id: "lingua-portuguesa", nome: "Língua Portuguesa" },
    { id: "lingua-inglesa",    nome: "Língua Inglesa" },
    { id: "geografia",         nome: "Geografia" },
    { id: "historia",          nome: "História" },
    { id: "sociologia",        nome: "Sociologia" },
    { id: "filosofia",         nome: "Filosofia" }
  ];

  function materiaPorNome(nome) {
    var alvo = String(nome || "").trim().toLowerCase();
    for (var i = 0; i < MATERIAS.length; i++) {
      if (MATERIAS[i].nome.toLowerCase() === alvo) return MATERIAS[i];
    }
    return null;
  }
  function materiaNome(id) {
    for (var i = 0; i < MATERIAS.length; i++) if (MATERIAS[i].id === id) return MATERIAS[i].nome;
    return id;
  }

  window.Escola = {
    SERIES: SERIES, TURMAS: TURMAS, MATERIAS: MATERIAS,
    salaId: salaId, salaNome: salaNome,
    materiaPorNome: materiaPorNome, materiaNome: materiaNome
  };
})();
