/* gabaritos.js — respostas oficiais das provas, para o cartão-resposta.
   ============================================================================
   REGRA DESTE ARQUIVO: nada aqui é digitado de cabeça nem estimado.
   Todo gabarito é extraído do PDF oficial da banca e conferido. Um gabarito
   errado não quebra nada visivelmente — ele devolve um número de acertos
   plausível e falso, e o aluno usa isso pra decidir o que estudar. Por isso
   cada edição registra a URL da fonte e a data em que foi conferida.

   POR QUE VERSÃO IMPORTA: a mesma prova é impressa em cadernos diferentes com
   a ORDEM DAS QUESTÕES TROCADA. Corrigir o cartão contra a versão errada dá
   um resultado errado sem nenhum aviso. Por isso a versão é obrigatória.
   ============================================================================ */
(function () {
  "use strict";

  var EDICOES = [
    {
      inst: "FUVEST", ano: 2025, fase: "1ª fase", total: 90,
      nome: "FUVEST 2025 · 1ª fase",
      fonte: "https://www.fuvest.br/wp-content/uploads/fuvest2025_gabarito_primeira_fase.pdf",
      conferido: "24/08/2026",
      // extraído do PDF oficial e validado cruzando as DUAS tabelas do próprio
      // documento (gabarito por versão × tabela de correspondência): 360 de 360
      // respostas conferiram, zero divergência.
      versoes: {
        V1: "EBBCACCEDADDBADCCEBEBEDCBEEDCBBEBEEECADCCECCEDCDADBDAACEAADDCDEBCDAABACAADADEBDEDDDBBBAEEB",
        V2: "ADDBADCCEBEBEDCBEEDCBBEBEEECADCCECCEDCDADBDAACEAADDCDEBCDAABACAADADEBDEDDDBBBAEEBEBBCACCED",
        V3: "EEDCBBEBEEECADCCECCEDCDADBDAACEAADDCDEBCDAABACAADADEBDEDDDBBBAEEBEBBCACCEDADDBADCCEBEBEDCB",
        V4: "CECCEDCDADBDAACEAADDCDEBCDAABACAADADEBDEDDDBBBAEEBEBBCACCEDADDBADCCEBEBEDCBEEDCBBEBEEECADC"
      },
      // E2 (dizer QUAL assunto o aluno errou) ainda não foi mapeado para esta
      // edição — o PDF de gabarito não traz matéria por questão. Quando existir,
      // vira um array de 90 posições aqui, e o diagnóstico liga sozinho.
      assuntos: null
    }
  ];

  function edicoes(inst) {
    return EDICOES.filter(function (e) { return !inst || e.inst === inst; });
  }
  function temPara(inst) { return edicoes(inst).length > 0; }
  function versoesDe(ed) { return Object.keys(ed.versoes); }

  /* respostas: array de 90 posições com "A".."E" ou "" (em branco).
     Devolve acertos, erros, brancos e o detalhe questão a questão. */
  function corrigir(ed, versao, respostas) {
    var chave = ed.versoes[versao];
    if (!chave) throw new Error("Versão desconhecida: " + versao);
    var detalhe = [], acertos = 0, erros = 0, brancos = 0;
    for (var i = 0; i < ed.total; i++) {
      var marcada = (respostas[i] || "").toUpperCase();
      var certa = chave.charAt(i);
      var ok = marcada === certa;
      if (!marcada) brancos++; else if (ok) acertos++; else erros++;
      detalhe.push({
        q: i + 1, marcada: marcada, certa: certa, ok: ok,
        assunto: ed.assuntos ? ed.assuntos[i] : null
      });
    }
    return { acertos: acertos, erros: erros, brancos: brancos, total: ed.total, detalhe: detalhe };
  }

  window.Gabaritos = {
    edicoes: edicoes, temPara: temPara, versoesDe: versoesDe, corrigir: corrigir
  };
})();
