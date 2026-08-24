/* vestibular.app.js — página Vestibular do Estuda+ (injetada pelo cloud.js após login).
   Corretor de gabarito do ENEM (marca acertos → áreas fracas), linha de evolução,
   links das provas passadas e histórico. Salva via shim → Firestore (panel vestibular-lab). */
(function () {
  "use strict";
  var KEY = "vestibular-estuda-lab";

  var AREAS = [
    { k: "L", nome: "Linguagens", ini: 1, fim: 45, cor: "var(--areaL)" },
    { k: "H", nome: "Ciências Humanas", ini: 46, fim: 90, cor: "var(--areaH)" },
    { k: "N", nome: "Ciências da Natureza", ini: 91, fim: 135, cor: "var(--areaN)" },
    { k: "M", nome: "Matemática", ini: 136, fim: 180, cor: "var(--areaM)" }
  ];
  // ENEM: links diretos oficiais (INEP), padrão verificado 2020–2025 (Dia1=CD1, Dia2=CD5).
  // 2018/2019 usam outra pasta e nome de arquivo no site do INEP — tratados à parte.
  function inepURL(kind, ano, dia, cor) {
    return "https://download.inep.gov.br/enem/provas_e_gabaritos/" + ano + "_" + kind + "_impresso_D" + dia + "_CD" + cor + ".pdf";
  }
  var ENEM_LEGADO = {
    2019: [
      { label: "📄 Prova · Dia 1", url: "https://download.inep.gov.br/educacao_basica/enem/provas/2019/2019_PV_impresso_D1_CD1.pdf" },
      { label: "📄 Prova · Dia 2", url: "https://download.inep.gov.br/educacao_basica/enem/provas/2019/2019_PV_impresso_D2_CD5.pdf" },
      { label: "✅ Gabarito · Dia 1", url: "https://download.inep.gov.br/educacao_basica/enem/gabaritos/2019/gabarito_1_dia_caderno_1_azul_aplicacao_regular.pdf" },
      { label: "✅ Gabarito · Dia 2", url: "https://download.inep.gov.br/educacao_basica/enem/gabaritos/2019/gabarito_2_dia_caderno_7_azul_aplicacao_regular.pdf" }
    ],
    2018: [
      { label: "📄 Prova · Dia 1", url: "https://download.inep.gov.br/educacao_basica/enem/provas/2018/2018_PV_impresso_D1_CD1.pdf" },
      { label: "📄 Prova · Dia 2", url: "https://download.inep.gov.br/educacao_basica/enem/provas/2018/2018_PV_impresso_D2_CD5.pdf" },
      { label: "✅ Gabarito · Dia 1", url: "https://download.inep.gov.br/educacao_basica/enem/gabaritos/2018/GAB_ENEM_2018_DIA_1_AZUL.pdf" },
      { label: "✅ Gabarito · Dia 2", url: "https://download.inep.gov.br/educacao_basica/enem/gabaritos/2018/GAB_ENEM_2018_DIA_2_AZUL.pdf" }
    ]
  };
  function enemEdicao(ano) {
    if (ENEM_LEGADO[ano]) return ENEM_LEGADO[ano];
    return [
      { label: "📄 Prova · Dia 1", url: inepURL("PV", ano, 1, 1) },
      { label: "📄 Prova · Dia 2", url: inepURL("PV", ano, 2, 5) },
      { label: "✅ Gabarito · Dia 1", url: inepURL("GB", ano, 1, 1) },
      { label: "✅ Gabarito · Dia 2", url: inepURL("GB", ano, 2, 5) }
    ];
  }

  // FUVEST, UNICAMP e PUC-Campinas: cada instituição usa um nome de arquivo diferente
  // a cada ano (nada de padrão fixo como o do ENEM/INEP) — por isso os links abaixo
  // foram conferidos um a um direto nos sites oficiais (fuvest.br, comvest.unicamp.br,
  // vestibular.puc-campinas.edu.br) em vez de gerados por fórmula.
  var FUVEST_ANOS = {
    2025: [
      { label: "📄 Prova · 1ª fase", url: "https://www.fuvest.br/wp-content/uploads/fuvest2025_primeira_fase_prova_V1.pdf" },
      { label: "✅ Gabarito · 1ª fase", url: "https://www.fuvest.br/wp-content/uploads/fuvest2025_gabarito_primeira_fase.pdf" },
      { label: "📄 Prova · 2ª fase Dia 1", url: "https://www.fuvest.br/wp-content/uploads/fuvest2025_prova_2fase_dia1.pdf" },
      { label: "📄 Prova · 2ª fase Dia 2", url: "https://www.fuvest.br/wp-content/uploads/fuvest2025_prova_2fase_dia2.pdf" }
    ],
    2024: [
      { label: "📄 Prova · 1ª fase", url: "https://www.fuvest.br/wp-content/uploads/fuvest2024_primeira_fase_prova_V.pdf" },
      { label: "✅ Gabarito · 1ª fase", url: "https://www.fuvest.br/wp-content/uploads/fuvest2024_gabarito_primeira_fase_retificado_2023-11-24.pdf" },
      { label: "📄 Prova · 2ª fase Dia 1", url: "https://www.fuvest.br/wp-content/uploads/fuvest2024_segunda_fase_prova_1dia.pdf" },
      { label: "📄 Prova · 2ª fase Dia 2", url: "https://www.fuvest.br/wp-content/uploads/fuvest2024_segunda_fase_prova_2dia.pdf" }
    ],
    2023: [
      { label: "📄 Prova · 1ª fase", url: "https://www.fuvest.br/wp-content/uploads/fuvest2023_primeira_fase_prova_V.pdf" },
      { label: "✅ Gabarito · 1ª fase", url: "https://www.fuvest.br/wp-content/uploads/fuvest2023_gabarito_primeira_fase.pdf" },
      { label: "📄 Prova · 2ª fase Dia 1", url: "https://www.fuvest.br/wp-content/uploads/fuvest_2023_segunda_fase_dia_1.pdf" },
      { label: "📄 Prova · 2ª fase Dia 2", url: "https://www.fuvest.br/wp-content/uploads/fuvest_2023_segunda_fase_dia_2.pdf" }
    ],
    2022: [
      { label: "📄 Prova · 1ª fase", url: "https://www.fuvest.br/wp-content/uploads/fuvest_2022_primeira_fase_tipo_V.pdf" },
      { label: "✅ Gabarito · 1ª fase", url: "https://www.fuvest.br/wp-content/uploads/fuvest_2022_primeira_fase_gabarito_retificado.pdf" },
      { label: "📄 Prova · 2ª fase Dia 1", url: "https://www.fuvest.br/wp-content/uploads/fuvest_2022_segunda_fase_dia_1.pdf" },
      { label: "📄 Prova · 2ª fase Dia 2", url: "https://www.fuvest.br/wp-content/uploads/fuvest_2022_segunda_fase_dia_2.pdf" }
    ],
    2021: [
      { label: "📄 Prova · 1ª fase", url: "https://www.fuvest.br/wp-content/uploads/fuvest_2021_primeira_fase.pdf" },
      { label: "✅ Gabarito · 1ª fase", url: "https://www.fuvest.br/wp-content/uploads/fuvest_2021_primeira_fase_gabarito_v2.pdf" },
      { label: "📄 Prova · 2ª fase Dia 1", url: "https://www.fuvest.br/wp-content/uploads/fuv2021_2fase_dia_1.pdf" },
      { label: "📄 Prova · 2ª fase Dia 2", url: "https://www.fuvest.br/wp-content/uploads/fuv2021_2fase_dia_2.pdf" }
    ],
    2020: [
      { label: "📄 Prova · 1ª fase", url: "https://www.fuvest.br/wp-content/uploads/fuvest_2020_primeira_fase_prova_V.pdf" },
      { label: "✅ Gabarito · 1ª fase", url: "https://www.fuvest.br/wp-content/uploads/fuvest_2020_primeira_fase_gabaritos.pdf" },
      { label: "📄 Prova · 2ª fase Dia 1", url: "https://www.fuvest.br/wp-content/uploads/fuv2020_2fase_dia_1.pdf" },
      { label: "📄 Prova · 2ª fase Dia 2", url: "https://www.fuvest.br/wp-content/uploads/fuv2020_2fase_dia_2.pdf" }
    ]
  };
  var UNICAMP_ANOS = {
    2025: [
      { label: "📄 Prova · 1ª fase", url: "https://www.comvest.unicamp.br/vest2025/F1/f12025Q_Z.pdf" },
      { label: "✅ Gabarito · 1ª fase", url: "https://www.comvest.unicamp.br/wp-content/uploads/2024/10/QZ_gabarito_2025_FINAL_site.pdf" },
      { label: "📄 Prova · 2ª fase (Exatas)", url: "https://www.comvest.unicamp.br/vest2025/F2/provas/2025F2CE.pdf" },
      { label: "📄 Prova · 2ª fase (Redação)", url: "https://www.comvest.unicamp.br/vest2025/F2/provas/2025F2redporingcn.pdf" }
    ],
    2024: [
      { label: "📄 Prova · 1ª fase", url: "https://www.comvest.unicamp.br/vest2024/F1/f12024Q_Y.pdf" },
      { label: "✅ Gabarito · 1ª fase", url: "https://www.comvest.unicamp.br/wp-content/uploads/2023/10/Q_Y.pdf" },
      { label: "📄 Prova · 2ª fase (Exatas)", url: "https://www.comvest.unicamp.br/vest2024/F2/provas/2024F2CE.pdf" },
      { label: "📄 Prova · 2ª fase (Redação)", url: "https://www.comvest.unicamp.br/vest2024/F2/provas/2024F2redporingcn.pdf" }
    ],
    // 2023 e 2021: a Comvest não disponibilizou o gabarito da 1ª fase separado no site (só a prova).
    2023: [
      { label: "📄 Prova · 1ª fase", url: "https://www.comvest.unicamp.br/vest2023/F1/f12023Q_Z.pdf" },
      { label: "📄 Prova · 2ª fase (Exatas)", url: "https://www.comvest.unicamp.br/vest2023/F2/provas/2023F2CE.pdf" },
      { label: "📄 Prova · 2ª fase (Redação)", url: "https://www.comvest.unicamp.br/vest2023/F2/provas/2023F2redporingcn.pdf" }
    ],
    2022: [
      { label: "📄 Prova · 1ª fase", url: "https://www.comvest.unicamp.br/vest2022/F1/f12022Q_X.pdf" },
      { label: "✅ Gabarito · 1ª fase", url: "https://www.comvest.unicamp.br/wp-content/uploads/2021/11/gabarito_2022_DIVULGA.pdf" },
      { label: "📄 Prova · 2ª fase (Exatas)", url: "https://www.comvest.unicamp.br/vest2022/F2/provas/2022F2CE.pdf" },
      { label: "📄 Prova · 2ª fase (Redação)", url: "https://www.comvest.unicamp.br/wp-content/uploads/2022/01/2022F2redporingcorrecao.pdf" }
    ],
    2021: [
      { label: "📄 Prova · 1ª fase", url: "https://www.comvest.unicamp.br/vest2021/F1/f12021Q_Z.pdf" },
      { label: "📄 Prova · 2ª fase (Exatas)", url: "https://www.comvest.unicamp.br/vest2021/F2/provas/2021F2CE.pdf" },
      { label: "📄 Prova · 2ª fase (Redação)", url: "https://www.comvest.unicamp.br/vest2021/F2/provas/2021F2redporing.pdf" }
    ],
    2020: [
      { label: "📄 Prova · 1ª fase", url: "https://www.comvest.unicamp.br/vest2020/F1/f12020Q_X.pdf" },
      { label: "✅ Gabarito · 1ª fase", url: "https://www.comvest.unicamp.br/wp-content/uploads/2019/11/gabarito2020.pdf" }
    ],
    // 2019/2018: a Comvest não manteve os PDFs originais no padrão de nome usado nos anos
    // seguintes — o link abaixo vai direto pro acervo de provas comentadas daquela edição.
    2019: [
      { label: "📄 Provas e gabaritos (acervo) ↗", url: "https://www.comvest.unicamp.br/vestibulares-anteriores/1a-fase-2a-fase-comentadas/" }
    ],
    2018: [
      { label: "📄 Provas e gabaritos (acervo) ↗", url: "https://www.comvest.unicamp.br/vestibular-2018/provas/" }
    ]
  };
  var PUCCAMP_ANOS = {
    2024: [
      { label: "📄 Prova geral", url: "https://vestibular.puc-campinas.edu.br/wp-content/uploads/2024/09/PROVA_GERAL_DEMAIS_CURSOS_VESTIBULAR_2024_compressed.pdf" },
      { label: "✅ Gabarito geral", url: "https://vestibular.puc-campinas.edu.br/wp-content/uploads/2024/09/GABARITO_PROVA_GERAL_DEMAIS_CURSOS_VESTIBULAR_2024.pdf" }
    ],
    2023: [
      { label: "📄 Prova geral", url: "https://vestibular.puc-campinas.edu.br/wp-content/uploads/2024/09/PROVA_GERAL_DEMAIS_CURSOS_VESTIBULAR_2023.pdf" },
      { label: "✅ Gabarito geral", url: "https://vestibular.puc-campinas.edu.br/wp-content/uploads/2024/09/GABARITO_PROVA_GERAL_DEMAIS_CURSOS_VESTIBULAR_2023.pdf" }
    ],
    2022: [
      { label: "📄 Prova · Medicina", url: "https://vestibular.puc-campinas.edu.br/wp-content/uploads/2024/09/PROVA_GERAL_MEDICINA_VESTIBULAR_2022.pdf" },
      { label: "✅ Gabarito · Medicina", url: "https://vestibular.puc-campinas.edu.br/wp-content/uploads/2024/09/GABARITO_PROVA_GERAL_MEDICINA_VESTIBULAR_2022.pdf" }
    ],
    2021: [
      { label: "📄 Prova geral", url: "https://vestibular.puc-campinas.edu.br/wp-content/uploads/2024/09/PROVA_GERAL_DEMAIS_CURSOS_VESTIBULAR_2021.pdf" },
      { label: "✅ Gabarito geral", url: "https://vestibular.puc-campinas.edu.br/wp-content/uploads/2024/09/GABARITO_PROVA_GERAL_DEMAIS_CURSOS_VESTIBULAR_2021.pdf" }
    ]
  };
  // UNESP e Mackenzie: prova/gabarito com nome de arquivo previsível por ano/fase.
  function unespEdicao(ano) {
    var base = "https://www.curso-objetivo.br/vestibular/resolucao-comentada/unesp/" + ano + "/";
    return [
      { label: "📄 Prova · 1ª fase", url: base + "1fase/UNESP" + ano + "_1fase_prova.pdf" },
      { label: "✅ Gabarito · 1ª fase", url: base + "1fase/UNESP" + ano + "_1fase_gabarito.pdf" },
      { label: "📄 Prova · 2ª fase", url: base + "2fase/UNESP" + ano + "_2fase_prova.pdf" },
      { label: "✅ Gabarito · 2ª fase", url: base + "2fase/UNESP" + ano + "_2fase_gabarito.pdf" }
    ];
  }
  function mackenzieEdicao(ano) {
    var base = "https://www.curso-objetivo.br/vestibular/resolucao-comentada/mackenzie/" + ano + "/";
    return [
      { label: "📄 Prova · Dia 1", url: base + "1dia/mackenzie" + ano + "_prova_1dia.pdf" },
      { label: "✅ Gabarito · Dia 1", url: base + "1dia/mackenzie" + ano + "_gabarito_1dia.pdf" },
      { label: "📄 Prova · Dia 2", url: base + "2dia/mackenzie" + ano + "_prova_2dia.pdf" },
      { label: "✅ Gabarito · Dia 2", url: base + "2dia/mackenzie" + ano + "_gabarito_2dia.pdf" }
    ];
  }
  function porAno(map) { return function (ano) { return map[ano] || null; }; }

  var EXAMS = [
    { key: "ENEM", nome: "ENEM", anos: [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018], edicao: enemEdicao },
    { key: "FUVEST", nome: "FUVEST (USP)", anos: [2025, 2024, 2023, 2022, 2021, 2020], edicao: porAno(FUVEST_ANOS), hub: "https://www.fuvest.br/acervo/" },
    { key: "UNICAMP", nome: "UNICAMP (Comvest)", anos: [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018], edicao: porAno(UNICAMP_ANOS), hub: "https://www.comvest.unicamp.br/vestibulares-anteriores/" },
    { key: "UNESP", nome: "UNESP (Vunesp)", anos: [2025, 2024, 2023, 2022, 2021, 2020, 2019], edicao: unespEdicao, hub: "https://vestibular.unesp.br/" },
    { key: "MACKENZIE", nome: "Mackenzie", anos: [2025, 2024, 2023, 2022, 2021, 2020, 2019], edicao: mackenzieEdicao },
    { key: "PUCSP", nome: "PUC-SP", hub: "https://www.pucsp.br/informe/informativo-de-provas" },
    { key: "PUCCAMP", nome: "PUC-Campinas", anos: [2024, 2023, 2022, 2021], edicao: porAno(PUCCAMP_ANOS), hub: "https://vestibular.puc-campinas.edu.br/provas-anteriores/" },
    // Insper mudou de banca recente (própria/digital → Vunesp, a partir de 2025/2026) e as provas
    // antigas eram por TRI/individualizadas — sem PDF único por ano pra linkar com segurança.
    // Por isso só o acervo oficial de provas passadas, sem seletor de ano.
    { key: "INSPER", nome: "Insper", hub: "https://www.insper.edu.br/content/insper-portal/pt/cursos/vestibular/provas-e-gabaritos.html" }
  ];

  // Informações-chave de cada vestibular (inscrição, prova, edital, site oficial).
  // Conferido diretamente nos sites oficiais/fontes oficiais em 19/08/2026 — como cada
  // instituição pode alterar datas, o card sempre linka pro site oficial pra confirmar.
  var VEST_INFO_ATUALIZADO = "19/08/2026";
  var VEST_INFO = {
    ENEM: {
      site: "https://enem.inep.gov.br/participante/",
      edital: "https://www.gov.br/inep/pt-br/centrais-de-conteudo/noticias/enem/inscricoes-para-o-enem-2026-estao-abertas",
      inscricao: "Encerrada (foi de 25/mai a 05/jun/2026, pagamento até 10/jun)",
      inscricaoFim: "2026-06-05",
      prova: "8 e 15 de novembro de 2026",
      provaData: "2026-11-08",
      obs: "Edital nº 64/2026 (Inep/MEC). Inscrição automática para concluintes de escola pública que perderem o prazo regular."
    },
    FUVEST: {
      site: "https://www.fuvest.br/vestibular-da-usp/",
      edital: "https://www.fuvest.br/vestibular-da-usp/",
      inscricao: "17/ago a 09/out/2026",
      inscricaoFim: "2026-10-09",
      prova: "1ª fase: 01/nov/2026 · 2ª fase: 06 e 07/dez/2026",
      provaData: "2026-11-01",
      obs: "Taxa de R$ 228. 1ª fase passa a ter 80 questões (antes 90) e prova também em Fortaleza."
    },
    UNICAMP: {
      site: "https://www.comvest.unicamp.br/ingresso-2027/vestibular-2027/",
      edital: "https://www.comvest.unicamp.br/ingresso-2027/vestibular-2027/",
      inscricao: "03 a 31/ago/2026 (pagamento até 08/set)",
      inscricaoFim: "2026-08-31",
      prova: "1ª fase: 18/out/2026 · 2ª fase: 29 e 30/nov/2026",
      provaData: "2026-10-18",
      obs: "Taxa de R$ 230. 2.523 vagas em 70 opções de curso, incluindo Relações Internacionais e IA/Ciência de Dados (novos)."
    },
    UNESP: {
      site: "https://vestibular.unesp.br/",
      edital: "https://vestibular.unesp.br/",
      inscricao: "04/set a 20/out/2026",
      inscricaoFim: "2026-10-20",
      prova: "1ª fase: 22/nov/2026 · 2ª fase: 13 e 14/dez/2026",
      provaData: "2026-11-22",
      obs: "Cadastro pelo site da Fundação Vunesp (vunesp.com.br). 5.850 vagas em 136 cursos, 24 cidades."
    },
    MACKENZIE: {
      site: "https://www.mackenzie.br/processos-seletivos/vestibular-graduacao",
      edital: "https://www.mackenzie.br/processos-seletivos/vestibular-graduacao",
      inscricao: "Fluxo contínuo — várias janelas por curso/campus ao longo do ano",
      inscricaoFim: null,
      prova: "Varia por processo seletivo (confira o calendário do curso escolhido)",
      provaData: null,
      obs: "O Mackenzie abre diferentes processos seletivos ao longo do ano — confira o calendário oficial atualizado."
    },
    PUCSP: {
      site: "https://www.pucsp.br/",
      edital: "https://www.nucvest.com.br/pucsp/vestibular/2027/verao/index.html",
      inscricao: "06/ago a 02/out/2026",
      inscricaoFim: "2026-10-02",
      prova: "17/out/2026 (prova presencial)",
      provaData: "2026-10-17",
      obs: "Taxa de R$ 280. Locais de prova em 14/out; resultado e 1ª chamada em 10/nov/2026."
    },
    PUCCAMP: {
      site: "https://vestibular.puc-campinas.edu.br/",
      edital: "https://vestibular.puc-campinas.edu.br/",
      inscricao: "13/ago a 05/out/2026 (descontos até 08/set e 23/set)",
      inscricaoFim: "2026-10-05",
      prova: "23 e 24/out/2026",
      provaData: "2026-10-23",
      obs: "6.580 vagas. Cartão de confirmação disponível a partir de 20/out/2026."
    }
  };

  var state, marks = {}, pomo = { mode: "focus", remaining: 0, running: false, timer: null };
  function load() { try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; } if (!state || !state.registros) state = { registros: [] }; if (!state.pomo) state.pomo = { focus: 25, brk: 5, cycles: 0, totalMin: 0 }; if (!state.provas) state.provas = []; if (!state.dias) state.dias = {}; if (!state.badges) state.badges = []; if (state.meta == null) state.meta = 0; if (!state.vestTab) state.vestTab = "enem"; if (!state.metas) state.metas = []; if (!state.exercicios) state.exercicios = []; }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function esc(s) { return (s == null ? "" : "" + s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // aspas tambem: sem isto, qualquer valor dentro de value="..." ou
    // href="..." fecha o atributo e injeta outro (V-06 da auditoria).
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function todayISO() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function fmtBR(iso) { if (!iso) return ""; var p = iso.split("-"); return p[2] + "/" + p[1] + "/" + p[0].slice(2); }
  function pct(n, d) { return d ? Math.round(n / d * 100) : 0; }

  /* ---------------- metas semanais, constância (heatmap) e exercícios ----------------
     Migrado do Painel de Estudos (aba "🎓 Vestibular", agora removida de lá) pra ficar
     junto com o resto do acompanhamento de vestibular. */
  function pad2(n) { return ("0" + n).slice(-2); }
  function dateISO(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function isoToDate(iso) { var p = iso.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function weekStartISO(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); var dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return dateISO(x); }
  function curWeek() { return weekStartISO(new Date()); }

  function metasHTML() {
    var wk = curWeek(), metas = state.metas.filter(function (m) { return m.semana === wk; });
    var we = isoToDate(wk), wf = new Date(we); wf.setDate(wf.getDate() + 6);
    var lbl = pad2(we.getDate()) + "/" + pad2(we.getMonth() + 1) + " a " + pad2(wf.getDate()) + "/" + pad2(wf.getMonth() + 1);
    var rows = metas.map(function (m) {
      var alvo = m.alvo || 1, feito = Math.min(m.feito || 0, alvo), ok = feito >= alvo, p = Math.round(feito / alvo * 100);
      return '<div class="metarow' + (ok ? " ok" : "") + '"><button class="iconbtn" title="−" data-mid="' + m.id + '" data-d="-1">−</button><button class="iconbtn" title="+" data-mid="' + m.id + '" data-d="1">＋</button><span class="mt-txt">' + esc(m.texto) + '</span><div class="mt-bar"><i style="width:' + p + '%"></i></div><span class="mt-prog">' + feito + '/' + alvo + '</span><button class="iconbtn" title="Excluir" data-mrm="' + m.id + '">🗑</button></div>';
    }).join("");
    return '<div class="box"><div class="toolbar"><h2>🎯 Metas — semana ' + lbl + '</h2><button class="btn green small" id="meta-novo">＋ Meta</button></div>'
      + (rows || '<div class="empty">Nenhuma meta esta semana. Defina o que quer cumprir!</div>')
      + '<div class="actions" style="margin-top:10px"><button class="btn ghost small" id="meta-repetir">↩ Repetir metas da semana passada</button></div></div>';
  }
  function wireMetas() {
    var root = document.getElementById("vest-metas"); if (!root) return;
    var novo = document.getElementById("meta-novo"); if (novo) novo.onclick = openMetaForm;
    var rep = document.getElementById("meta-repetir"); if (rep) rep.onclick = repeatLastWeekMetas;
    Array.prototype.forEach.call(root.querySelectorAll("[data-mid]"), function (b) { b.onclick = function () { metaInc(b.getAttribute("data-mid"), parseInt(b.getAttribute("data-d"), 10)); }; });
    Array.prototype.forEach.call(root.querySelectorAll("[data-mrm]"), function (b) { b.onclick = function () { rmMeta(b.getAttribute("data-mrm")); }; });
  }
  function refreshMetas() { var m = document.getElementById("vest-metas"); if (m) { m.innerHTML = metasHTML(); wireMetas(); } }
  function openMetaForm() {
    document.getElementById("modal-root").innerHTML = '<div class="overlay" id="mf-overlay"><div class="modal"><h3>Nova meta da semana</h3>'
      + '<div class="field"><label>Meta *</label><input id="mf-txt" placeholder="Ex.: Fazer 3 redações"></div>'
      + '<div class="field"><label>Quantidade (alvo)</label><input id="mf-alvo" type="number" min="1" value="1"></div>'
      + '<div class="modal-actions"><button class="btn ghost" id="mf-cancel">Cancelar</button><button class="btn done" id="mf-save">Adicionar</button></div></div></div>';
    document.getElementById("mf-overlay").onclick = function (e) { if (e.target === this) closeModal(); };
    document.getElementById("mf-cancel").onclick = closeModal;
    document.getElementById("mf-save").onclick = saveMeta;
    setTimeout(function () { var e = document.getElementById("mf-txt"); if (e) e.focus(); }, 30);
  }
  function saveMeta() {
    var t = val("mf-txt"); if (!t) { alert("Escreva a meta."); return; }
    var alvo = Math.max(1, parseInt(val("mf-alvo"), 10) || 1);
    state.metas.push({ id: "meta-" + Date.now(), texto: t, alvo: alvo, feito: 0, semana: curWeek() });
    save(); closeModal(); refreshMetas();
  }
  function metaInc(id, d) {
    var m = state.metas.filter(function (x) { return x.id === id; })[0]; if (!m) return;
    m.feito = Math.max(0, Math.min(m.alvo || 1, (m.feito || 0) + d)); save(); refreshMetas();
  }
  function rmMeta(id) {
    if (!confirm("Excluir esta meta?")) return;
    state.metas = state.metas.filter(function (x) { return x.id !== id; }); save(); refreshMetas();
  }
  function repeatLastWeekMetas() {
    var wk = curWeek(), prev = weekStartISO(new Date(isoToDate(wk).getTime() - 7 * 864e5));
    var prevMetas = state.metas.filter(function (m) { return m.semana === prev; });
    if (!prevMetas.length) { alert("Não há metas na semana passada para repetir."); return; }
    if (state.metas.some(function (m) { return m.semana === wk; }) && !confirm("Já há metas nesta semana. Adicionar as da semana passada mesmo assim?")) return;
    prevMetas.forEach(function (m) { state.metas.push({ id: "meta-" + Date.now() + Math.random().toString(36).slice(2, 6), texto: m.texto, alvo: m.alvo, feito: 0, semana: wk }); });
    save(); refreshMetas();
  }

  function heatmapHTML() {
    var weeks = 17, today = new Date(); today.setHours(0, 0, 0, 0);
    var dowMon = (today.getDay() + 6) % 7, end = new Date(today); end.setDate(end.getDate() + (6 - dowMon));
    var cur = new Date(end); cur.setDate(cur.getDate() - (weeks * 7 - 1));
    var cols = [];
    for (var w = 0; w < weeks; w++) {
      var cells = [];
      for (var di = 0; di < 7; di++) {
        var iso = dateISO(cur), min = state.dias[iso] || 0, future = cur > today;
        var lvl = min <= 0 ? 0 : min < 25 ? 1 : min < 60 ? 2 : min < 120 ? 3 : 4;
        cells.push('<div class="heatcell ' + (future ? "" : ("l" + lvl)) + '"' + (future ? ' style="opacity:.2"' : "") + ' title="' + pad2(cur.getDate()) + "/" + pad2(cur.getMonth() + 1) + " · " + min + ' min"></div>');
        cur.setDate(cur.getDate() + 1);
      }
      cols.push('<div class="heatcol">' + cells.join("") + '</div>');
    }
    var tot = 0; Object.keys(state.dias).forEach(function (k) { tot += state.dias[k] || 0; });
    var th = Math.floor(tot / 60), tm = tot % 60;
    return '<div class="box"><h2>🔥 Constância — últimas semanas</h2>'
      + '<div class="hint">Cada quadradinho é um dia; quanto mais cyan, mais você estudou pro vestibular. Registra sozinho ao corrigir prova ou usar o Pomodoro — ou marque manualmente abaixo.</div>'
      + '<div class="heat">' + cols.join("") + '</div>'
      + '<div class="heat-legend">menos <span class="heatcell"></span><span class="heatcell l1"></span><span class="heatcell l2"></span><span class="heatcell l3"></span><span class="heatcell l4"></span> mais &nbsp;·&nbsp; total: <b style="color:var(--cyan)">' + th + 'h ' + tm + 'min</b></div>'
      + '<div class="actions" style="margin-top:12px"><div class="field"><label>Registrar estudo de hoje (min)</label><input id="vh-min" type="number" min="0" step="10" placeholder="ex.: 60" style="width:110px"></div><button class="btn green small" id="vh-add">+ Registrar</button></div>'
      + '</div>';
  }
  function wireHeatmap() {
    var btn = document.getElementById("vh-add"); if (!btn) return;
    btn.onclick = function () {
      var el = document.getElementById("vh-min"), v = parseInt(el && el.value, 10) || 0;
      if (v <= 0) { alert("Informe os minutos estudados hoje."); return; }
      markAtividade(v);
      avisaConquistas(checkBadges());
      refreshHeatmap(); refreshBadges();
    };
  }
  function refreshHeatmap() { var h = document.getElementById("vest-heatmap"); if (h) { h.innerHTML = heatmapHTML(); wireHeatmap(); } }

  var MES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  var MES_LETRA = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  function exerciciosHTML() {
    var ano = new Date().getFullYear();
    var doAno = state.exercicios.filter(function (e) { return (e.data || "").slice(0, 4) === String(ano); });
    var totalAno = doAno.reduce(function (s, e) { return s + (+e.qtd || 0); }, 0);
    var totalGeral = state.exercicios.reduce(function (s, e) { return s + (+e.qtd || 0); }, 0);
    var meses = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    doAno.forEach(function (e) { var m = parseInt((e.data || "").slice(5, 7), 10) - 1; if (m >= 0 && m < 12) meses[m] += (+e.qtd || 0); });
    var maxM = Math.max.apply(null, [1].concat(meses));
    var bars = meses.map(function (v, i) { return '<div class="exbar" title="' + MES_ABREV[i] + ": " + v + ' exercício(s)"><i style="height:' + Math.round(v / maxM * 100) + '%"></i><span>' + MES_LETRA[i] + '</span></div>'; }).join("");
    var hist = state.exercicios.slice().sort(function (a, b) { return (b.data || "").localeCompare(a.data || ""); }).slice(0, 6).map(function (e) {
      return '<div class="ex-hist"><span>' + fmtBR(e.data) + (e.materia ? " · " + esc(e.materia) : "") + '</span><b>+' + (+e.qtd || 0) + '</b><button class="iconbtn" title="Excluir" data-erm="' + e.id + '">🗑</button></div>';
    }).join("");
    return '<div class="box"><div class="toolbar"><h2>📒 Exercícios em ' + ano + '</h2><span class="muted">total acumulado: <b style="color:var(--gold)">' + totalGeral + '</b></span></div>'
      + '<div class="ex-top"><div class="ex-big">' + totalAno + '</div><div class="muted">exercícios feitos em ' + ano + '</div></div>'
      + '<div class="exchart">' + bars + '</div>'
      + '<div class="actions" style="margin-top:14px"><div class="field"><label>Quantos exercícios?</label><input id="ex-qtd" type="number" min="1" placeholder="ex.: 20" style="width:100px"></div><div class="field"><label>Matéria (opcional)</label><input id="ex-mat" placeholder="ex.: Matemática"></div><button class="btn green small" id="ex-add">+ Registrar</button></div>'
      + (hist ? '<div class="ex-histwrap">' + hist + '</div>' : "")
      + '</div>';
  }
  function wireExercicios() {
    var root = document.getElementById("vest-exercicios"); if (!root) return;
    var add = document.getElementById("ex-add"); if (add) add.onclick = addExercicio;
    Array.prototype.forEach.call(root.querySelectorAll("[data-erm]"), function (b) { b.onclick = function () { rmExercicio(b.getAttribute("data-erm")); }; });
  }
  function refreshExercicios() { var e = document.getElementById("vest-exercicios"); if (e) { e.innerHTML = exerciciosHTML(); wireExercicios(); } }
  function addExercicio() {
    var q = parseInt((document.getElementById("ex-qtd") || {}).value, 10) || 0;
    if (q <= 0) { alert("Informe a quantidade de exercícios."); return; }
    var mat = ((document.getElementById("ex-mat") || {}).value || "").trim();
    state.exercicios.push({ id: "ex-" + Date.now(), data: todayISO(), qtd: q, materia: mat });
    save(); refreshExercicios();
  }
  function rmExercicio(id) {
    state.exercicios = state.exercicios.filter(function (e) { return e.id !== id; });
    save(); refreshExercicios();
  }

  /* ---------------- Foco (até 3 vestibulares-alvo) ----------------
     A escolha principal é feita no onboarding (login novo, ver cloud.js) e fica salva
     no perfil (users/{uid}.vestibulares, exposto aqui como window.EP.vestibulares).
     Quem já tinha conta antes dessa feature — ou quer trocar — edita direto aqui. */
  function diasFaltamISO(iso) {
    if (!iso) return null;
    var p = iso.split("-").map(Number);
    var alvo = new Date(p[0], p[1] - 1, p[2]); alvo.setHours(0, 0, 0, 0);
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return Math.round((alvo - hoje) / 864e5);
  }
  var focoEditando = false, focoSelTmp = [];
  function focoVestibulares() { return (window.EP && window.EP.vestibulares) || []; }
  function focoHTML() {
    if (focoEditando) return focoEditorHTML();
    var vs = focoVestibulares();
    if (!vs.length) {
      return '<div class="box"><h2>🎯 Foco</h2>'
        + '<div class="hint">Escolha até 3 vestibulares pra acompanhar prazo de inscrição, link direto e edital aqui.</div>'
        + '<button class="btn green small" id="foco-escolher">＋ Escolher vestibulares</button>'
        + '</div>';
    }
    // os detalhes de cada faculdade ficam na aba própria dela — aqui é só a escolha
    var chips = vs.map(function (k) {
      var e = EXAMS.filter(function (x) { return x.key === k; })[0];
      return '<span class="instbtn sel" style="cursor:default">🎯 ' + esc(e ? e.nome : k) + '</span>';
    }).join("");
    return '<div class="box">'
      + '<div class="toolbar" style="margin:0 0 2px"><h2 style="color:inherit;font-size:1.08rem;font-weight:800">🎯 Minhas faculdades-alvo</h2><button class="btn ghost small" id="foco-editar">✏️ Mudar</button></div>'
      + '<div class="hint">Cada uma tem a própria aba lá em cima, com datas, evolução, conteúdo que mais cai e provas antigas.</div>'
      + '<div class="instbar">' + chips + '</div>'
      + '</div>';
  }
  function focoEditorHTML() {
    // só oferece pra Foco os vestibulares com informações-chave completas (VEST_INFO) —
    // entradas "só provas passadas" (ex.: Insper) ficam de fora aqui pra não abrir uma aba vazia.
    var chips = EXAMS.filter(function (e) { return !!VEST_INFO[e.key]; }).map(function (e) {
      var sel = focoSelTmp.indexOf(e.key) >= 0;
      return '<button class="instbtn' + (sel ? " sel" : "") + '" data-fk="' + e.key + '">' + esc(e.nome) + (sel ? " ✓" : "") + '</button>';
    }).join("");
    return '<div class="box"><h2>🎯 Foco</h2>'
      + '<div class="hint">Escolha até 3 vestibulares que você está mirando.</div>'
      + '<div class="instbar">' + chips + '</div>'
      + '<div class="actions"><button class="btn green small" id="foco-salvar">💾 Salvar</button><button class="btn ghost small" id="foco-cancelar">Cancelar</button></div>'
      + '</div>';
  }
  function focoCardHTML(key) {
    var e = EXAMS.filter(function (x) { return x.key === key; })[0];
    var info = VEST_INFO[key];
    if (!e || !info) return "";
    var dIns = diasFaltamISO(info.inscricaoFim), dProva = diasFaltamISO(info.provaData);
    var insLabel = dIns == null ? "" : (dIns > 0 ? "faltam " + dIns + " dia(s) pra fechar" : dIns === 0 ? "fecha hoje!" : "inscrição encerrada");
    var provaLabel = dProva == null ? "confira o calendário oficial" : (dProva > 0 ? "faltam " + dProva + " dia(s)" : dProva === 0 ? "é hoje!" : "já passou");
    return '<div class="resultcard" style="margin-bottom:10px">'
      + '<div class="result-top"><div class="result-inst">' + esc(e.nome) + '</div>'
      + '<a class="btn green small" style="text-decoration:none;display:inline-block" href="' + esc(info.site) + '" target="_blank" rel="noopener">🌐 Ir pra inscrição ↗</a></div>'
      + '<div class="mat-stats" style="margin-top:10px">'
      + '<div>📅 <b>Inscrições:</b> ' + esc(info.inscricao) + (insLabel ? ' <span style="color:' + (dIns != null && dIns >= 0 && dIns <= 7 ? "var(--red)" : "var(--mut)") + '">(' + insLabel + ')</span>' : "") + '</div>'
      + '<div>⏳ <b>Faltam pra prova:</b> ' + provaLabel + '</div>'
      + '<div>📝 <b>Prova:</b> ' + esc(info.prova) + '</div>'
      + '<div>📄 <b>Edital / mais informações:</b> <a href="' + esc(info.edital) + '" target="_blank" rel="noopener" style="color:var(--cyan);font-weight:700">abrir ↗</a></div>'
      + (info.obs ? '<div class="muted" style="font-size:.85rem">' + esc(info.obs) + '</div>' : "")
      + '</div>'
      + '<div class="hint" style="margin-top:8px">Dados conferidos em ' + esc(VEST_INFO_ATUALIZADO) + ' — confirme sempre no site oficial.</div>'
      + '</div>';
  }
  function wireFoco() {
    var root = document.getElementById("vest-foco"); if (!root) return;
    var escolher = document.getElementById("foco-escolher"); if (escolher) escolher.onclick = function () { focoEditando = true; focoSelTmp = []; refreshFoco(); };
    var editar = document.getElementById("foco-editar"); if (editar) editar.onclick = function () { focoEditando = true; focoSelTmp = focoVestibulares().slice(); refreshFoco(); };
    var cancelar = document.getElementById("foco-cancelar"); if (cancelar) cancelar.onclick = function () { focoEditando = false; refreshFoco(); };
    var salvar = document.getElementById("foco-salvar"); if (salvar) salvar.onclick = salvarFoco;
    Array.prototype.forEach.call(root.querySelectorAll("[data-fk]"), function (b) {
      b.onclick = function () {
        var k = b.getAttribute("data-fk"), i = focoSelTmp.indexOf(k);
        if (i >= 0) focoSelTmp.splice(i, 1);
        else { if (focoSelTmp.length >= 3) { alert("Escolha no máximo 3 vestibulares."); return; } focoSelTmp.push(k); }
        refreshFoco();
      };
    });
  }
  function salvarFoco() {
    var sel = focoSelTmp.slice(0, 3);
    if (!window.EP) window.EP = {};
    window.EP.vestibulares = sel;
    focoEditando = false;
    refreshFoco();
    syncTabs(); // cada faculdade escolhida vira (ou deixa de ser) uma aba
    if (window.Cloud && window.Cloud.user && window.Cloud.firestore) {
      window.Cloud.firestore().collection("users").doc(window.Cloud.user.uid).set({ vestibulares: sel }, { merge: true }).catch(function () {});
    }
  }
  function refreshFoco() {
    var f = document.getElementById("vest-foco"); if (f) { f.innerHTML = focoHTML(); wireFoco(); }
  }

  /* ---------------- abas + render ----------------
     4 abas, com o menu no topo da página:
       Registro       — conquistas, metas da semana, constância e exercícios (+ Pomodoro)
       ENEM           — evolução, corretor por questão, conteúdo frequente, provas e histórico
       Vestibulares   — desempenho por instituição, conteúdo frequente e provas passadas
       Faculdade Alvo — os até 3 vestibulares escolhidos, com datas, conteúdo e edições
     Os 4 painéis são montados uma única vez e alternados só por CSS, então trocar de aba
     não recria nada — o timer do Pomodoro segue rodando e as marcações ainda não salvas
     do corretor do ENEM continuam onde estavam. */
  var TAB_BASE = [["registro", "📝 Registro"], ["enem", "📗 ENEM"], ["vestibulares", "🎓 Vestibulares"]];
  // além das 3 fixas, cada faculdade-alvo escolhida ganha a PRÓPRIA aba, com o nome dela
  function TABS() {
    var out = TAB_BASE.slice();
    focoVestibulares().forEach(function (k) {
      var e = EXAMS.filter(function (x) { return x.key === k; })[0];
      if (e) out.push(["v:" + k, "🎯 " + e.nome]);
    });
    return out;
  }
  function panelId(tab) { return "vp-" + tab.replace(":", "-"); }
  function tabAtual() {
    var t = state.vestTab, list = TABS();
    for (var i = 0; i < list.length; i++) if (list[i][0] === t) return t;
    return "enem"; // valores antigos ("outros", "alvo", "foco:X") caem aqui
  }
  function tabBarHTML() {
    var t = tabAtual();
    return '<div class="vtabbar">' + TABS().map(function (x) {
      return '<button class="vtab' + (t === x[0] ? " active" : "") + '" data-tab="' + x[0] + '">' + esc(x[1]) + '</button>';
    }).join("") + '</div>';
  }
  /* Montagem sob demanda: cada painel só é construído na primeira vez que é aberto
     (o do ENEM sozinho tem 180 botões do corretor; montar os 4 de cara deixava a
     abertura da página lenta). Depois de montado ele PERMANECE no DOM — por isso o
     Pomodoro segue rodando e as marcações do corretor não se perdem ao trocar de aba. */
  var PANEL_HTML = { registro: registroPanelHTML, enem: enemPanelHTML, vestibulares: vestibularesPanelHTML };
  var PANEL_WIRE = { registro: wireRegistro, enem: wireEnem, vestibulares: wireVestibulares };
  function ensurePanel(tab) {
    var p = document.getElementById(panelId(tab));
    if (!p || p.getAttribute("data-built") === "1") return;
    if (tab.indexOf("v:") === 0) {
      var k = tab.slice(2);
      p.innerHTML = vestPanelHTML(k); p.setAttribute("data-built", "1"); wireVestPanel(k); return;
    }
    if (!PANEL_HTML[tab]) return;
    p.innerHTML = PANEL_HTML[tab]();
    p.setAttribute("data-built", "1");
    PANEL_WIRE[tab]();
  }
  function applyTab() {
    var t = tabAtual();
    ensurePanel(t);
    TABS().forEach(function (x) {
      var p = document.getElementById(panelId(x[0])); if (p) p.classList.toggle("active", x[0] === t);
    });
    var bar = document.getElementById("vest-tabbar"); if (!bar) return;
    Array.prototype.forEach.call(bar.querySelectorAll("[data-tab]"), function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === t);
    });
  }
  function wireTabBar() {
    var bar = document.getElementById("vest-tabbar"); if (!bar) return;
    Array.prototype.forEach.call(bar.querySelectorAll("[data-tab]"), function (b) {
      b.onclick = function () {
        state.vestTab = b.getAttribute("data-tab"); save();
        applyTab();
        try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) {}
      };
    });
  }
  /* Os 4 painéis são montados UMA vez e alternados por CSS (.vpanel.active).
     Assim trocar de aba não recria nada: o timer do Pomodoro segue rodando e as
     marcações não salvas do corretor do ENEM continuam lá. */
  function registroPanelHTML() {
    return '<div id="vest-foco">' + focoHTML() + '</div>'
      + '<div id="vest-badges">' + badgesHTML() + '</div>'
      + '<div id="vest-metas">' + metasHTML() + '</div>'
      + '<div id="vest-heatmap">' + heatmapHTML() + '</div>'
      + '<div id="vest-exercicios">' + exerciciosHTML() + '</div>'
      + pomodoroHTML();
  }
  function enemPanelHTML() {
    return '<div id="vest-resumo">' + resumoHTML() + '</div>' + corretorHTML()
      + '<div class="box"><h2>📖 Conteúdo frequente</h2><div class="hint">Escolha a matéria e veja os temas que mais caem no ENEM.</div>' + cfMateriaHTML("ENEM", "enem") + '</div>'
      + enemProvasHTML() + '<div id="vest-hist">' + histHTML() + '</div>';
  }
  function vestibularesPanelHTML() {
    return '<div id="vest-desemp">' + vestDesempenhoHTML() + '</div>' + outrosConteudoFreqHTML() + outrosProvasHTML();
  }
  function wireRegistro() { wireFoco(); wireBadges(); wireMetas(); wireHeatmap(); wireExercicios(); wirePomodoro(); }
  function wireEnem() { wireCorretor(); wireCfMateria("ENEM", "enem"); wireEnemProvas(); updateStats(); }
  function wireVestibulares() { wireDesempenho(); wireOutrosConteudoFreq(); wireOutrosProvas(); }

  /* ---------------- conteúdo frequente por matéria (com % de incidência) ----------------
     Fonte: levantamentos de cursinhos (Aprova Total, Estratégia Vestibulares, Sistema Anglo,
     Poliedro/SAS, Galt) e conteúdo programático oficial (PUC-SP não divulga %, então usa
     ranking qualitativo). Conferido em 20/08/2026. */
  var CF_ATUALIZADO = "20/08/2026";
  var CONTEUDO_FREQ = {
    ENEM: {
      "Matemática": [["Matemática básica (razão, proporção, %, regra de três)", 26.36], ["Funções", 10.11], ["Geometria espacial", 7.07], ["Geometria plana", 6.71], ["Probabilidade", 4.1]],
      "Biologia": [["Ecologia", 37.42], ["Citologia", 9.32], ["Fisiologia humana", 8.54], ["Evolução e teoria evolutiva", 7.45], ["Biotecnologia", 5.43]],
      "Química": [["Química geral", 32.91], ["Físico-química", 30.19], ["Química orgânica", 16.77], ["Química ambiental", 14.68], ["Estequiometria", 8.5]],
      "Física": [["Mecânica", 26.13], ["Eletricidade", 19.44], ["Ondulatória", 14.69], ["Termologia", 13.17], ["Cinemática", 8.42]],
      "História": [["Idade Contemporânea", 17.7], ["2ª Guerra Mundial", 13.6], ["Brasil Colônia", 12.7], ["Primeiro e Segundo Reinado", 12.3], ["Redemocratização (1984–1988)", 12.3]],
      "Geografia": [["Geografia agrária", 18.1], ["Questões ambientais", 15.5], ["Geografia física", 10.9], ["Geografia urbana", 10.4], ["Climatologia", 10.4]],
      "Filosofia": [["Filosofia antiga", 23.3], ["Racionalismo moderno", 18.8], ["Ética e justiça", 18.7], ["Filosofia da ciência/epistemologia", 16.8], ["Contemporânea (Foucault, Bauman)", 12.4]],
      "Sociologia": [["Sociologia contemporânea", 28.6], ["Mundo do trabalho", 21.9], ["Cultura e indústria cultural", 12.9], ["Ideologia", 11.6], ["Cidadania e movimentos sociais", 10.3]],
      "Português": [["Interpretação de textos", 33.3], ["Gêneros e funções textuais", 30], ["Estrutura e formação de palavras", 21], ["Movimentos artísticos e culturais", 20], ["Funções da linguagem", 13]]
    },
    FUVEST: {
      "Matemática": [["Matemática básica", 18.9], ["Funções", 11.9], ["Geometria espacial", 10.5], ["Trigonometria", 9.8], ["Geometria plana", 7.7]],
      "Biologia": [["Ecologia", 24.8], ["Microbiologia (vírus e bactérias)", 10.2], ["Genética", 9.6], ["Botânica", 8.3], ["Zoologia", 7]],
      "Química": [["Átomos e estrutura atômica", 10.9], ["Equilíbrio químico", 10.1], ["Reações orgânicas", 9.3], ["Moléculas e propriedades", 9.3], ["Estequiometria", 7.8]],
      "Física": [["Termologia", 13.1], ["Eletrodinâmica", 12.5], ["Trabalho e energia", 11.9], ["Cinemática", 10.6], ["Ondulatória", 7.5]],
      "História": [["Idade Moderna", 14.3], ["Século XX", 10.1]],
      "Geografia": [["Climatologia", 11.8], ["Demografia", 8.4], ["Questões ambientais", 8.4], ["Espaço agrário", 7.6], ["Espaço urbano", 7.6]],
      "Filosofia": [["Filosofia medieval (Santo Agostinho)", 28.6], ["Filosofia moderna", 21.4], ["Filosofia contemporânea", 21.4], ["Filosofia antiga", 14.3]],
      "Sociologia": [["Teoria sociológica clássica", 32.4], ["Cultura e sociedade", 20.6], ["Movimentos sociais", 17.6], ["Sociologia do trabalho", 11.8], ["Estado e cidadania", 5.9]],
      "Português": [["Gramática", 80.23], ["Interpretação de texto", 16.28]]
    },
    UNICAMP: {
      "Matemática": [["Funções", 14.19], ["Geometria plana", 13.51], ["Geometria analítica", 7.43], ["Equações (1º e 2º grau)", 6.76], ["Progressões (PA e PG)", 6.76]],
      "Biologia": [["Biologia animal", 15.09], ["Biologia vegetal", 15.09], ["Ecologia", 15.09], ["Doenças humanas", 11.32], ["Evolução", 9.43]],
      "Química": [["Química geral", 41.58], ["Físico-química", 37.62], ["Estequiometria", 11.9], ["Química ambiental", 7.92], ["Orgânica", 4.95]],
      "Física": [["Mecânica", 28.85], ["Cinemática", 18.27], ["Termologia", 11.54], ["Eletricidade", 10.58], ["Óptica geométrica", 7.69]],
      "História": [["História geral", 45.28], ["História do Brasil", 32.08], ["Brasil Colônia", 13.3], ["História da América", 5.66], ["Ditadura civil-militar e historiografia", 3.8]],
      "Geografia": [["Geopolítica", 12.8], ["Volta ao mundo (África, Oriente Médio, América Latina)", 12.1], ["População e demografia", 12.93], ["Espaço agrário", 11.21], ["Climatologia e biomas", 10.34]],
      "Filosofia": [["Filosofia antiga", 33.3], ["Filosofia política (Maquiavel, Rousseau)", 26.7], ["Mal e justiça (Arendt, Foucault)", 13.3], ["Filosofia moderna", 13.3]],
      "Sociologia": [["Movimentos sociais", 25.6], ["Estado e cidadania", 17.9], ["Cultura e sociedade", 15.4], ["Teoria sociológica clássica", 12.8], ["Sociologia brasileira", 12.8]],
      "Português": [["Gêneros textuais", 34.5], ["Gramática e interpretação", 19.5], ["Introdução à língua", 14.9]]
    },
    UNESP: {
      "Matemática": [["Matemática básica", 21.6], ["Geometria plana", 10.5], ["Funções", 9.9], ["Geometria espacial", 6], ["Equações e exponencial/logaritmo", 5.3]],
      "Biologia": [["Citologia", 13.77], ["Ecologia", 12], ["Fisiologia humana", 11], ["Botânica", 10.5], ["Genética", 10]],
      "Química": [["Moléculas e propriedades (ligações, NOX)", 10.3], ["Átomos e estrutura atômica", 9], ["Equilíbrio químico", 8], ["Estequiometria", 8.5], ["Soluções", 7.5]],
      "Física": [["Cinemática", 16], ["Eletrodinâmica", 14], ["Óptica", 12], ["Termologia", 11], ["Ondulatória/Dinâmica", 8.8]],
      "História": [["Idade Moderna", 15], ["Idade Contemporânea", 12.8], ["Brasil Colônia", 12], ["Brasil Monárquico", 9.4]],
      "Geografia": [["Geopolítica, globalização e conflitos", 14.5], ["América Anglo-saxônica, Europa e Oriente Médio", 14.1], ["Espaço urbano", 7.5], ["Questões ambientais e clima", 7.5], ["Demografia e população", 7.7]],
      "Filosofia": [["Áreas da filosofia (ética, epistemologia, política)", 29.5], ["Filosofia moderna", 18.5], ["Filosofia antiga", 20.8], ["Filosofia da ciência", 12.2], ["Filosofia política (Rousseau)", 10]],
      "Sociologia": [["Movimentos sociais", 24.1], ["Cultura e sociedade", 18.5], ["Sociologia política", 14.6], ["Estado e cidadania", 11.1], ["As ciências sociais (introdução)", 7.4]],
      "Português": [["Gramática", 60.15], ["Interpretação de texto", 11.28], ["Gêneros textuais", 9.4]]
    },
    PUCSP: {
      "Português/Literatura": [["Interpretação e análise de textos", null], ["Obras literárias obrigatórias (lista oficial)", null], ["Gramática contextualizada", null], ["Gêneros e funções textuais", null], ["Inglês: leitura, interpretação e vocabulário", null]],
      "História": [["História do Brasil (Colônia, Império, República)", null], ["História geral", null], ["Geopolítica e globalização", null], ["Espaço urbano e agrário brasileiro", null], ["Interpretação de documentos, mapas e charges", null]],
      "Natureza": [["Ecologia e questões ambientais", null], ["Fisiologia humana e genética", null], ["Estrutura da matéria e ligações químicas", null], ["Estequiometria e soluções", null], ["Mecânica, eletricidade e ondulatória", null]],
      "Matemática": [["Matemática básica", null], ["Funções", null], ["Geometria plana e espacial", null], ["Probabilidade e estatística", null]]
    }
  };
  var CF_PAL = ["var(--cyan)", "var(--gold)", "var(--purple)", "var(--blue)", "var(--orange)", "var(--green)"];
  // pizza desenhada em SVG (uma <path> por fatia) — permite destacar a fatia clicada
  // de verdade e evita o flash azul de toque que o <div> com conic-gradient causava.
  function cfArc(cx, cy, r, de, ate) {
    function pt(ang) { var a = (ang - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var a = pt(de), b = pt(ate), big = (ate - de) > 180 ? 1 : 0;
    if (ate - de >= 359.99) { // círculo inteiro: dois arcos (a elipse degenera com um só)
      return "M " + cx + " " + (cy - r) + " A " + r + " " + r + " 0 1 1 " + cx + " " + (cy + r) + " A " + r + " " + r + " 0 1 1 " + cx + " " + (cy - r) + " Z";
    }
    return "M " + cx + " " + cy + " L " + a[0].toFixed(2) + " " + a[1].toFixed(2)
      + " A " + r + " " + r + " 0 " + big + " 1 " + b[0].toFixed(2) + " " + b[1].toFixed(2) + " Z";
  }
  function cfPieHTML(rows, idPrefix) {
    if (rows.some(function (r) { return r[1] == null; })) return ""; // sem % (ex.: PUC-SP) não dá pra desenhar pizza
    var segs = rows.map(function (r, i) { return { label: r[0], pct: r[1], color: CF_PAL[i % CF_PAL.length] }; });
    var soma = segs.reduce(function (s, x) { return s + x.pct; }, 0);
    var outros = 100 - soma;
    if (outros > 0.5) segs.push({ label: "Outros temas", pct: outros, color: "var(--mut)" });
    window["_cfSegs_" + idPrefix] = segs;
    var acc = 0, R = 62, C = 70;
    var paths = segs.map(function (s, i) {
      var de = acc / 100 * 360, ate = (acc + s.pct) / 100 * 360; acc += s.pct;
      s.mid = (de + ate) / 2;
      return '<path d="' + cfArc(C, C, R, de, ate) + '" fill="' + s.color + '" stroke="var(--card)" stroke-width="1.5"'
        + ' data-idx="' + i + '" id="cf-sl-' + idPrefix + '-' + i + '"><title>' + esc(s.label) + ' — ' + s.pct.toFixed(1) + '%</title></path>';
    }).join("");
    var legend = segs.map(function (s, i) {
      return '<div class="cf-leg" id="cf-leg-' + idPrefix + '-' + i + '" data-idx="' + i + '" style="display:flex;align-items:center;gap:7px;font-size:.83rem;cursor:pointer;padding:3px 5px;border-radius:7px">'
        + '<span style="width:11px;height:11px;border-radius:50%;background:' + s.color + ';flex:none"></span><span style="flex:1">' + esc(s.label) + '</span><b>' + s.pct.toFixed(1) + '%</b></div>';
    }).join("");
    return '<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-bottom:6px">'
      + '<svg class="cf-pie" id="cf-pie-' + idPrefix + '" viewBox="0 0 140 140" style="width:140px;height:140px;flex:none">' + paths + '</svg>'
      + '<div style="display:flex;flex-direction:column;gap:5px;flex:1;min-width:180px">' + legend + '</div>'
      + '</div>'
      + '<div id="cf-detail-' + idPrefix + '" class="foco" style="display:none"></div>';
  }
  function cfListHTML(rows, idPrefix) {
    var vals = rows.map(function (r) { return r[1] || 0; });
    var max = Math.max.apply(null, vals) || 1;
    return cfPieHTML(rows, idPrefix)
      + '<div class="mat-stats">' + rows.map(function (r, i) {
      var p = r[1];
      var bar = p != null
        ? '<div class="mat-bar" style="flex:1"><i style="width:' + Math.round(p / max * 100) + '%;background:var(--cyan)"></i></div><b style="color:var(--cyan);min-width:46px;text-align:right">' + p + '%</b>'
        : '<span class="muted" style="font-size:.78rem">conteúdo programático oficial</span>';
      return '<div class="mat-row"><span class="mat-nome" style="flex:2;white-space:normal;font-weight:600">' + (i + 1) + '. ' + esc(r[0]) + '</span>' + bar + '</div>';
    }).join("") + '</div>'
      + '<div class="hint" style="margin-top:8px">Dados conferidos em ' + esc(CF_ATUALIZADO) + ' a partir de levantamentos de cursinhos (Aprova Total, Estratégia Vestibulares, Sistema Anglo, Poliedro/SAS, Galt) e do edital oficial.</div>';
  }
  function cfMateriaHTML(key, idPrefix) {
    var dados = CONTEUDO_FREQ[key];
    if (!dados) return '<div class="empty">Ainda não mapeamos os conteúdos mais frequentes desse vestibular.</div>';
    var materias = Object.keys(dados);
    var sel = window["_cfSel_" + idPrefix] || materias[0];
    if (materias.indexOf(sel) < 0) sel = materias[0];
    var opts = materias.map(function (m) { return '<option' + (m === sel ? " selected" : "") + '>' + esc(m) + '</option>'; }).join("");
    return '<div class="field" style="max-width:280px"><label>Matéria</label><select id="cf-mat-' + idPrefix + '">' + opts + '</select></div>'
      + '<div id="cf-out-' + idPrefix + '" style="margin-top:10px">' + cfListHTML(dados[sel], idPrefix) + '</div>';
  }
  // Pizza interativa: clicar numa fatia (ou na legenda) calcula o ângulo do clique
  // pra achar qual tema foi tocado e mostra o detalhe em destaque.
  function wireCfPie(idPrefix) {
    var pie = document.getElementById("cf-pie-" + idPrefix);
    var segs = window["_cfSegs_" + idPrefix];
    if (!pie || !segs) return;
    var atual = null;
    function selecionar(i) {
      if (atual === i) { limpar(); return; } // clicar de novo na mesma fatia desmarca
      atual = i;
      var s = segs[i]; if (!s) return;
      pie.classList.add("hassel");
      segs.forEach(function (x, j) {
        var sl = document.getElementById("cf-sl-" + idPrefix + "-" + j);
        if (sl) {
          sl.classList.toggle("sel", j === i);
          // fatia selecionada "sai" um pouco do centro, na direção do próprio meio
          var d = 7, a = (x.mid - 90) * Math.PI / 180;
          sl.setAttribute("transform", j === i ? "translate(" + (d * Math.cos(a)).toFixed(2) + "," + (d * Math.sin(a)).toFixed(2) + ")" : "");
        }
        var leg = document.getElementById("cf-leg-" + idPrefix + "-" + j);
        if (leg) { leg.style.background = (j === i) ? "var(--surface2)" : ""; leg.style.opacity = (j === i) ? "1" : ".5"; }
      });
      var det = document.getElementById("cf-detail-" + idPrefix);
      if (det) {
        det.style.display = "block";
        det.style.borderLeftColor = s.color;
        det.innerHTML = '🎯 <b style="color:' + s.color + '">' + esc(s.label) + '</b> — <b>' + s.pct.toFixed(1) + '%</b> das questões dessa matéria. <span class="muted" style="font-size:.82rem">(toque de novo na fatia pra limpar)</span>';
      }
    }
    function limpar() {
      atual = null;
      pie.classList.remove("hassel");
      segs.forEach(function (x, j) {
        var sl = document.getElementById("cf-sl-" + idPrefix + "-" + j);
        if (sl) { sl.classList.remove("sel"); sl.setAttribute("transform", ""); }
        var leg = document.getElementById("cf-leg-" + idPrefix + "-" + j);
        if (leg) { leg.style.background = ""; leg.style.opacity = ""; }
      });
      var det = document.getElementById("cf-detail-" + idPrefix);
      if (det) det.style.display = "none";
    }
    // clique direto na fatia (sem cálculo de ângulo — o próprio SVG resolve o alvo)
    Array.prototype.forEach.call(pie.querySelectorAll("path"), function (p) {
      p.onclick = function (ev) { ev.preventDefault(); selecionar(parseInt(p.getAttribute("data-idx"), 10)); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[id^="cf-leg-' + idPrefix + '-"]'), function (el) {
      el.onclick = function () { selecionar(parseInt(el.getAttribute("data-idx"), 10)); };
    });
  }
  function wireCfMateria(key, idPrefix) {
    var sel = document.getElementById("cf-mat-" + idPrefix); if (!sel) return;
    wireCfPie(idPrefix);
    sel.onchange = function () {
      window["_cfSel_" + idPrefix] = sel.value;
      document.getElementById("cf-out-" + idPrefix).innerHTML = cfListHTML(CONTEUDO_FREQ[key][sel.value], idPrefix);
      wireCfPie(idPrefix);
    };
  }
  var CF_OUTROS_INSTS = ["FUVEST", "UNICAMP", "UNESP", "PUCSP"];
  function outrosConteudoFreqHTML() {
    var inst = window._cfOutrosInst || CF_OUTROS_INSTS[0];
    if (CF_OUTROS_INSTS.indexOf(inst) < 0) inst = CF_OUTROS_INSTS[0];
    var opts = CF_OUTROS_INSTS.map(function (k) { var e = EXAMS.filter(function (x) { return x.key === k; })[0]; return '<option value="' + k + '"' + (k === inst ? " selected" : "") + '>' + esc(e ? e.nome : k) + '</option>'; }).join("");
    return '<div class="box"><h2>📖 Conteúdo frequente</h2>'
      + '<div class="hint">Escolha o vestibular e a matéria pra ver os temas que mais caem, com a incidência apurada em levantamentos de cursinhos.</div>'
      + '<div class="field" style="max-width:280px"><label>Vestibular</label><select id="cf-inst">' + opts + '</select></div>'
      + '<div id="cf-body">' + cfMateriaHTML(inst, "outros") + '</div>'
      + '</div>';
  }
  function wireOutrosConteudoFreq() {
    var instSel = document.getElementById("cf-inst"); if (!instSel) return;
    wireCfMateria(instSel.value, "outros");
    instSel.onchange = function () {
      window._cfOutrosInst = instSel.value;
      window["_cfSel_outros"] = null;
      document.getElementById("cf-body").innerHTML = cfMateriaHTML(instSel.value, "outros");
      wireCfMateria(instSel.value, "outros");
    };
  }
  /* ---------------- aba dedicada de cada vestibular escolhido no Foco ----------------
     Info do vestibular (mesmo card do Foco) + conteúdo frequente por matéria + escolher a edição. */
  /* Aba própria de uma faculdade-alvo: datas/inscrição, linha de evolução com registro
     de acertos, conteúdo que mais cai e as provas de edições passadas. */
  function vestPanelHTML(key) {
    var e = EXAMS.filter(function (x) { return x.key === key; })[0];
    if (!e || !VEST_INFO[key]) return '<div class="box"><div class="empty">Vestibular não encontrado.</div></div>';
    var pre = "alvo-" + key;
    var edicaoBox = (e.anos && e.edicao)
      ? '<div class="box"><h2>📆 Provas de anos anteriores</h2><div class="hint">Escolha o ano — os links da prova e do gabarito daquela edição abrem direto.</div>'
        + '<div class="pv-row"><select id="ft-ano-' + key + '" class="pv-sel"><option value="">ano…</option>' + e.anos.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join("") + '</select></div>'
        + '<div id="ft-out-' + key + '" class="pv-out"></div></div>'
      : '<div class="box"><h2>📆 Provas de anos anteriores</h2><div class="hint">Links diretos por ano ainda não mapeados — acervo oficial:</div>'
        + (e.hub ? '<a class="pv-link" href="' + esc(e.hub) + '" target="_blank" rel="noopener">Abrir acervo oficial ↗</a>' : '<div class="empty">Confira o site oficial no card acima.</div>') + '</div>';
    return focoCardHTML(key)
      + provaSecHTML(key)
      + '<div class="box"><h2>📖 Conteúdo que mais cai</h2><div class="hint">Escolha a matéria e veja os temas mais frequentes.</div>' + cfMateriaHTML(key, pre) + '</div>'
      + edicaoBox;
  }
  function wireVestPanel(key) {
    wireProvaSec(key);
    wireCfMateria(key, "alvo-" + key);
    var an = document.getElementById("ft-ano-" + key), out = document.getElementById("ft-out-" + key);
    if (!an) return;
    var e = EXAMS.filter(function (x) { return x.key === key; })[0];
    an.onchange = function () {
      if (!an.value) { out.innerHTML = ""; return; }
      var links = e.edicao(parseInt(an.value, 10));
      if (!links) { out.innerHTML = '<div class="hint">Não achei os links dessa edição ainda.</div>'; return; }
      out.innerHTML = '<div class="pv-links">' + links.map(function (l) { return '<a class="pv-link" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + ' ↗</a>'; }).join("") + '</div>';
    };
  }
  /* Escolher/trocar as faculdades muda a lista de abas: recria a barra e sincroniza
     os painéis (mantendo intactos os que já estavam montados, ex.: o Pomodoro). */
  function syncTabs() {
    var root = document.getElementById("vest-root"); if (!root) return;
    var bar = document.getElementById("vest-tabbar");
    if (bar) { bar.innerHTML = tabBarHTML(); wireTabBar(); }
    var querem = {}; TABS().forEach(function (x) { querem[panelId(x[0])] = x[0]; });
    Array.prototype.slice.call(root.querySelectorAll(".vpanel")).forEach(function (p) {
      if (!querem[p.id]) p.parentNode.removeChild(p); // faculdade removida → some a aba
    });
    TABS().forEach(function (x) {
      if (document.getElementById(panelId(x[0]))) return;
      var d = document.createElement("div");
      d.className = "vpanel"; d.id = panelId(x[0]); d.setAttribute("data-built", "0");
      root.appendChild(d);
    });
    applyTab();
  }
  function render() {
    checkBadges(); // reflete marcos já batidos (ex.: sequência completada sem nenhuma ação nova hoje)
    var root = document.getElementById("vest-root");
    root.innerHTML =
      '<div id="vest-tabbar">' + tabBarHTML() + '</div>'
      + TABS().map(function (x) { return '<div class="vpanel" id="' + panelId(x[0]) + '" data-built="0"></div>'; }).join("");
    wireTabBar();
    applyTab(); // monta só o painel da aba atual; os outros entram quando forem abertos
  }
  function refreshDynamic() {
    var r = document.getElementById("vest-resumo"); if (r) r.innerHTML = resumoHTML();
    var h = document.getElementById("vest-hist"); if (h) h.innerHTML = histHTML();
  }
  function refreshBadges() {
    var b = document.getElementById("vest-badges"); if (b) { b.innerHTML = badgesHTML(); wireBadges(); }
  }
  function wireCorretor() {
    Array.prototype.forEach.call(document.querySelectorAll(".qbtn"), function (b) {
      b.onclick = function () { vtoggle(parseInt(b.getAttribute("data-q"), 10), b); };
    });
    var sv = document.getElementById("v-save"); if (sv) sv.onclick = saveRegistro;
  }
  function resetCorretorGrid() {
    Array.prototype.forEach.call(document.querySelectorAll(".qbtn.on"), function (b) { b.classList.remove("on"); });
    updateStats();
  }

  /* ---------------- resumo + evolução ---------------- */
  function resumoHTML() {
    var regs = state.registros.filter(function (r) { return r.vest === "ENEM"; });
    if (!regs.length) {
      return '<div class="box"><h2>📈 Sua evolução</h2><div class="empty">Ainda não há resultados. Corrija sua primeira prova do ENEM abaixo pra começar a acompanhar sua evolução e descobrir onde focar. 🚀</div></div>';
    }
    var sorted = regs.slice().sort(function (a, b) { return (a.data || "").localeCompare(b.data || ""); });
    var last = sorted[sorted.length - 1];
    // médias por área nas últimas 3 provas
    var lastN = sorted.slice(-3), avg = {};
    AREAS.forEach(function (a) {
      var s = 0; lastN.forEach(function (r) { s += pct(r.ac[a.k] || 0, 45); });
      avg[a.k] = Math.round(s / lastN.length);
    });
    var ranked = AREAS.slice().sort(function (a, b) { return avg[a.k] - avg[b.k]; });
    var foco = ranked.slice(0, 2).map(function (a) { return "<b>" + a.nome + "</b> (" + avg[a.k] + "%)"; }).join(" e ");
    var areasBars = AREAS.map(function (a) {
      return '<div class="areahead"><span class="an" style="font-size:.9rem">' + a.nome + '</span><span class="ac" style="color:' + a.cor + '">' + avg[a.k] + '%</span></div>'
        + '<div class="abar"><i style="width:' + avg[a.k] + '%;background:' + a.cor + '"></i></div>';
    }).join("");
    return '<div class="box"><h2>📈 Sua evolução no ENEM</h2>'
      + '<div class="hint">Nota total por prova ao longo do tempo (acertos ÷ 180). Última: <b style="color:var(--cyan)">' + last.total + '/180 (' + pct(last.total, 180) + '%)</b>.</div>'
      + evoChart(sorted)
      + '<h3 style="margin-top:16px">Média por área (últimas ' + lastN.length + ')</h3>' + areasBars
      + '<div class="foco">🎯 <b>Onde focar agora:</b> ' + foco + '. São suas áreas mais fracas nas últimas provas — priorize elas nos estudos.</div>'
      + '</div>';
  }

  function evoChart(sorted) {
    var W = 480, H = 150, padL = 30, padR = 12, padT = 12, padB = 24;
    var n = sorted.length;
    var xs = function (i) { return n <= 1 ? padL : padL + i * ((W - padL - padR) / (n - 1)); };
    var ys = function (v) { return padT + (100 - v) / 100 * (H - padT - padB); };
    var grid = "";
    [0, 25, 50, 75, 100].forEach(function (g) { var y = ys(g); grid += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="var(--line)"/><text x="' + (padL - 5) + '" y="' + (y + 3) + '" fill="var(--mut)" font-size="9" text-anchor="end">' + g + '</text>'; });
    var pts = sorted.map(function (r, i) { return [xs(i), ys(pct(r.total, 180))]; });
    var line = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    var dots = sorted.map(function (r, i) {
      var p = pts[i];
      return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4" fill="var(--cyan)" stroke="var(--cyan-d)" stroke-width="1.5"/>'
        + '<text x="' + p[0].toFixed(1) + '" y="' + (H - 8) + '" fill="var(--mut)" font-size="8.5" text-anchor="middle">' + fmtBR(r.data).slice(0, 5) + '</text>';
    }).join("");
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:560px;display:block">' + grid
      + (n > 1 ? '<path d="' + line + '" fill="none" stroke="var(--cyan)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' : '')
      + dots + '</svg>';
  }

  /* ---------------- corretor ENEM ---------------- */
  function corretorHTML() {
    var years = [];
    for (var y = new Date().getFullYear(); y >= 2015; y--) years.push(y);
    var blocks = AREAS.map(function (a) {
      var btns = "";
      for (var q = a.ini; q <= a.fim; q++) btns += '<button class="qbtn' + (marks[q] ? " on" : "") + '" data-q="' + q + '" data-area="' + a.k + '">' + q + '</button>';
      return '<div class="areahead"><span class="an" style="color:' + a.cor + '">' + a.nome + ' <span class="muted" style="font-weight:600;font-size:.8rem">(Q' + a.ini + '–' + a.fim + ')</span></span>'
        + '<span class="ac" id="ac-' + a.k + '" style="color:' + a.cor + '">0/45</span></div>'
        + '<div class="abar"><i id="bar-' + a.k + '" style="width:0%;background:' + a.cor + '"></i></div>'
        + '<div class="qgrid">' + btns + '</div>';
    }).join("");
    return '<div class="box"><h2>✅ Corrigir uma prova do ENEM</h2>'
      + '<div class="hint">Faça a prova, pegue o gabarito oficial e <b>toque nas questões que você acertou</b>. O sistema calcula sua nota e mostra onde você errou mais.</div>'
      + '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px"><label style="font-weight:700">Ano da prova:</label>'
      + '<select id="v-ano">' + years.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join("") + '</select></div>'
      + blocks
      + '<div class="tot">Total: <span class="n" id="v-tot">0</span><span class="muted">/180 acertos</span></div>'
      + '<div class="foco" id="v-foco">Marque as questões acima pra ver seu diagnóstico.</div>'
      + '<button class="btn green" id="v-save" style="margin-top:14px;width:100%">💾 Salvar resultado desta prova</button></div>';
  }

  function vtoggle(q, btn) {
    if (marks[q]) { delete marks[q]; btn.classList.remove("on"); }
    else { marks[q] = true; btn.classList.add("on"); }
    updateStats();
  }

  function areaCount(a) { var c = 0; for (var q = a.ini; q <= a.fim; q++) if (marks[q]) c++; return c; }

  function updateStats() {
    if (!document.getElementById("v-tot")) return;
    var total = 0, stats = [];
    AREAS.forEach(function (a) {
      var c = areaCount(a); total += c;
      var p = pct(c, 45);
      var acEl = document.getElementById("ac-" + a.k); if (acEl) acEl.textContent = c + "/45";
      var barEl = document.getElementById("bar-" + a.k); if (barEl) barEl.style.width = p + "%";
      stats.push({ a: a, c: c, p: p });
    });
    document.getElementById("v-tot").textContent = total;
    var foco = document.getElementById("v-foco");
    if (total === 0) { foco.innerHTML = "Marque as questões acima pra ver seu diagnóstico."; return; }
    var ranked = stats.slice().sort(function (x, y) { return x.p - y.p; });
    var piores = ranked.slice(0, 2).map(function (s) { return "<b>" + s.a.nome + "</b> (" + s.c + "/45)"; }).join(" e ");
    var melhor = ranked[ranked.length - 1];
    foco.innerHTML = "🎯 <b>Onde focar:</b> " + piores + " — foram suas áreas mais fracas. Melhor área: <b>" + melhor.a.nome + "</b> (" + melhor.c + "/45). Total: <b>" + total + "/180 (" + pct(total, 180) + "%)</b>.";
  }

  function saveRegistro() {
    var total = 0, ac = {};
    AREAS.forEach(function (a) { var c = areaCount(a); ac[a.k] = c; total += c; });
    if (total === 0 && !confirm("Você não marcou nenhum acerto. Salvar mesmo assim (zero)?")) return;
    var ano = (document.getElementById("v-ano") || {}).value || "";
    state.registros.push({ id: "r-" + Date.now(), vest: "ENEM", ano: ano, data: todayISO(), ac: ac, total: total });
    save(); marks = {};
    resetCorretorGrid();
    markAtividade();
    var novos = checkBadges();
    refreshDynamic();
    refreshBadges();
    alert("✅ Resultado salvo! Veja sua evolução no topo.");
    avisaConquistas(novos);
    document.getElementById("vest-resumo").scrollIntoView({ behavior: "smooth" });
  }

  /* ---------------- desempenho por outros vestibulares (FUVEST, UNICAMP, PUC...) ----------------
     Registro manual de acertos (o ENEM já tem o corretor completo por questão acima). */
  var VESTIBULARES = {
    FUVEST: { nome: "FUVEST (USP)", sigla: "FUVEST", cor: "var(--accfuvest)", tipo: "acertos", total: 90, desc: "1ª fase · 90 questões objetivas" },
    UNICAMP: { nome: "UNICAMP (Comvest)", sigla: "UNICAMP", cor: "var(--accunicamp)", tipo: "acertos", total: 72, desc: "1ª fase · 72 questões" },
    UNESP: { nome: "UNESP (Vunesp)", sigla: "UNESP", cor: "var(--areaN)", tipo: "acertos", total: 90, desc: "1ª fase · 90 questões objetivas" },
    MACKENZIE: { nome: "Mackenzie", sigla: "Mackenzie", cor: "var(--blue)", tipo: "acertos", total: 0, desc: "objetiva + redação" },
    PUCSP: { nome: "PUC-SP", sigla: "PUC-SP", cor: "var(--accpucsp)", tipo: "acertos", total: 50, desc: "50 questões objetivas + redação" },
    PUCCAMP: { nome: "PUC-Campinas", sigla: "PUC-Camp", cor: "var(--accpuccamp)", tipo: "acertos", total: 0, desc: "objetiva + redação" },
    MATERIA: { nome: "Simulados por matéria", sigla: "📚 Por matéria", cor: "var(--cyan)", tipo: "materia", desc: "matéria única · você escolhe a quantidade de questões" }
  };
  var INST_ORDER = ["FUVEST", "UNICAMP", "UNESP", "MACKENZIE", "PUCSP", "PUCCAMP", "MATERIA"];
  var MATERIAS_SUGESTAO = ["Português", "Matemática", "Física", "Química", "Biologia", "História", "Geografia", "Filosofia", "Sociologia", "Inglês", "Redação"];

  function pctColor(p) { return p >= 70 ? "var(--green)" : p >= 50 ? "var(--gold)" : "var(--red)"; }
  function val(id) { var el = document.getElementById(id); return el ? (el.value || "").trim() : ""; }
  function uniq(arr) { var seen = {}, out = []; arr.forEach(function (v) { if (!seen[v]) { seen[v] = true; out.push(v); } }); return out; }

  function provasDe(inst) { return state.provas.filter(function (p) { return p.instituicao === inst; }).sort(function (a, b) { return (a.data || "").localeCompare(b.data || ""); }); }
  function notaProva(p) {
    var cfg = VESTIBULARES[p.instituicao]; if (!cfg) return { valor: 0, pct: 0, label: "—" };
    var tot = +p.total || cfg.total || 0, ac = +p.acertos || 0, p2 = pct(ac, tot);
    return { valor: ac, pct: p2, label: ac + "/" + tot + " · " + p2 + "%" };
  }
  function vestResumoInst(inst) {
    var cfg = VESTIBULARES[inst], provas = provasDe(inst);
    if (!provas.length) return '<div class="empty">Nenhum registro de <b>' + esc(cfg.sigla) + '</b> ainda. Adicione abaixo seu primeiro simulado ou vestibular passado.</div>';
    if (cfg.tipo === "materia") {
      var g = {};
      provas.forEach(function (p) { var m = p.materia || "(sem matéria)"; (g[m] = g[m] || []).push(notaProva(p).pct); });
      var rows = Object.keys(g).map(function (m) {
        var arr = g[m], avg = Math.round(arr.reduce(function (s, v) { return s + v; }, 0) / arr.length), best = Math.max.apply(null, arr);
        return { m: m, avg: avg, best: best, n: arr.length };
      }).sort(function (a, b) { return a.avg - b.avg; });
      var body = rows.map(function (r) {
        return '<div class="mat-row"><span class="mat-nome">' + esc(r.m) + '</span><div class="mat-bar"><i style="width:' + r.avg + '%;background:' + pctColor(r.avg) + '"></i></div><b style="color:' + pctColor(r.avg) + '">' + r.avg + '%</b><span class="muted" title="melhor ' + r.best + '% · ' + r.n + ' simulado(s)">⌀ · ' + r.n + '×</span></div>';
      }).join("");
      return '<div class="resultcard" style="border-left-color:' + cfg.cor + '"><div class="result-top"><div><div class="result-inst" style="color:' + cfg.cor + '">📚 Por matéria</div><div class="muted" style="font-size:.8rem">' + provas.length + ' simulado(s) · média por matéria (pior → melhor)</div></div></div><div class="mat-stats">' + body + '</div></div>';
    }
    var notas = provas.map(notaProva);
    var ult = notas[notas.length - 1];
    var melhor = notas.reduce(function (a, b) { return b.pct > a.pct ? b : a; });
    var mediaPct = Math.round(notas.reduce(function (s, n) { return s + n.pct; }, 0) / notas.length);
    return '<div class="resultcard" style="border-left-color:' + cfg.cor + '">'
      + '<div class="result-top"><div><div class="result-inst" style="color:' + cfg.cor + '">' + esc(cfg.nome) + '</div><div class="muted" style="font-size:.8rem">' + esc(cfg.desc) + ' · ' + provas.length + ' registro(s)</div></div>'
      + '<div class="result-big" style="color:' + cfg.cor + '">' + esc(ult.label) + '</div></div>'
      + '<div class="result-grid">'
      + '<div><span>Última</span><b>' + esc(ult.label) + '</b></div>'
      + '<div><span>Melhor</span><b style="color:var(--green)">' + esc(melhor.label) + '</b></div>'
      + '<div><span>Média geral</span><b>' + mediaPct + '%</b></div>'
      + '</div></div>';
  }
  function vestProvaChartSVG(inst) {
    var cfg = VESTIBULARES[inst];
    var lst = provasDe(inst);
    if (cfg.tipo === "materia") { var selm = window._vestMat || "Todas"; if (selm !== "Todas") lst = lst.filter(function (p) { return (p.materia || "(sem matéria)") === selm; }); }
    var series = lst.map(function (p) { var n = notaProva(p); return { data: p.data, pct: n.pct, label: n.label, tipo: p.tipo }; });
    if (!series.length) return '<div class="empty">Sem registros ainda.</div>';
    var W = 560, H = 190, pl = 30, pr = 14, pt = 20, pb = 26, n = series.length;
    var x = function (i) { return n === 1 ? (pl + (W - pl - pr) / 2) : (pl + i * (W - pl - pr) / (n - 1)); };
    var y = function (pc) { return pt + (100 - pc) / 100 * (H - pt - pb); };
    var grid = [0, 25, 50, 75, 100].map(function (g) { return '<line x1="' + pl + '" y1="' + y(g) + '" x2="' + (W - pr) + '" y2="' + y(g) + '" stroke="var(--line)"/><text x="' + (pl - 5) + '" y="' + (y(g) + 3) + '" fill="var(--mut)" font-size="9" text-anchor="end">' + g + '</text>'; }).join("");
    var line = n > 1 ? '<polyline points="' + series.map(function (s, i) { return x(i).toFixed(1) + "," + y(s.pct).toFixed(1); }).join(" ") + '" fill="none" stroke="' + cfg.cor + '" stroke-width="2"/>' : "";
    var dots = series.map(function (s, i) { return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(s.pct).toFixed(1) + '" r="4" fill="' + (s.tipo === "passado" ? cfg.cor : "var(--bg)") + '" stroke="' + cfg.cor + '" stroke-width="2"/><text x="' + x(i).toFixed(1) + '" y="' + (y(s.pct) - 9).toFixed(1) + '" fill="var(--txt)" font-size="9" text-anchor="middle">' + esc(s.label) + '</text>'; }).join("");
    var xl = series.map(function (s, i) { return '<text x="' + x(i).toFixed(1) + '" y="' + (H - 7) + '" fill="var(--mut)" font-size="9" text-anchor="middle">' + fmtBR(s.data).slice(0, 5) + '</text>'; }).join("");
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto">' + grid + line + dots + xl + '</svg>'
      + '<div class="hint" style="margin-top:4px">● contorno = simulado · ● cheio = vestibular passado</div>';
  }
  function vestDesempenhoHTML() {
    var inst = window._vestInst || "";
    var bar = INST_ORDER.map(function (k) {
      var cfg = VESTIBULARES[k], c = provasDe(k).length;
      return '<button class="instbtn' + (inst === k ? " sel" : "") + '" style="' + (inst === k ? "border-color:" + cfg.cor + ";color:" + cfg.cor : "") + '" data-inst="' + k + '">' + esc(cfg.sigla) + (c ? ' <span class="ib-c">' + c + '</span>' : '') + '</button>';
    }).join("");
    var corpo;
    if (!inst) { corpo = '<div class="empty">👆 Escolha um vestibular acima para ver seu resultado, o gráfico e os registros.</div>'; }
    else {
      var cfg = VESTIBULARES[inst];
      var ehMat = cfg.tipo === "materia";
      var filtro = "";
      if (ehMat) {
        var mats = ["Todas"].concat(uniq(provasDe(inst).map(function (p) { return p.materia || "(sem matéria)"; })));
        var sel = window._vestMat || "Todas";
        filtro = '<div class="inline" style="margin:6px 0 2px"><div class="field"><label>Filtrar matéria</label><select id="vd-matfiltro">' + mats.map(function (m) { return '<option' + (m === sel ? " selected" : "") + '>' + esc(m) + '</option>'; }).join("") + '</select></div></div>';
      }
      var list = provasDe(inst).slice().reverse().map(function (p) {
        var nt = notaProva(p);
        var tag = p.tipo === "passado" ? '<span class="tipo-tag passado">vestibular passado</span>' : '<span class="tipo-tag sim">simulado</span>';
        var titulo = ehMat ? esc(p.materia || "(sem matéria)") : esc(p.nome || cfg.sigla);
        var sub = ehMat && p.nome ? ' <span class="muted">' + esc(p.nome) + '</span>' : "";
        return '<div class="sim-card"><div class="sim-head"><div><b>' + titulo + '</b>' + sub + ' ' + tag + ' <span class="muted">· ' + fmtBR(p.data) + '</span></div><div class="sim-pct" style="color:' + pctColor(nt.pct) + '">' + esc(nt.label) + '</div></div><div class="actions" style="margin-top:8px;justify-content:flex-end"><button class="iconbtn" title="Excluir" data-rm="' + p.id + '">🗑</button></div></div>';
      }).join("");
      corpo = vestResumoInst(inst)
        + '<h3 style="margin:16px 0 4px">📈 Evolução · ' + esc(cfg.sigla) + '</h3>'
        + filtro
        + vestProvaChartSVG(inst)
        + '<div class="toolbar" style="margin-top:14px"><h2>Registros de ' + esc(cfg.sigla) + ' (' + provasDe(inst).length + ')</h2><button class="btn green small" id="vd-novo">＋ Novo registro</button></div>'
        + (list || '<div class="empty">Nenhum registro ainda.</div>');
    }
    return '<div class="box">'
      + '<h2>🎯 Corrigir outro vestibular</h2>'
      + '<div class="hint">FUVEST, UNICAMP, PUC-SP, PUC-Campinas ou simulados por matéria — escolha o vestibular, informe seus acertos e acompanhe a evolução. (O ENEM tem o corretor completo por questão na aba 📗 ENEM.)</div>'
      + '<div class="instbar">' + bar + '</div>'
      + corpo
      + '</div>';
  }
  function wireDesempenho() {
    var root = document.getElementById("vest-desemp"); if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll(".instbtn"), function (b) {
      b.onclick = function () { window._vestInst = b.getAttribute("data-inst"); window._vestMat = null; refreshDesemp(); };
    });
    var novo = document.getElementById("vd-novo"); if (novo) novo.onclick = openProvaForm;
    var matf = document.getElementById("vd-matfiltro"); if (matf) matf.onchange = function () { window._vestMat = matf.value; refreshDesemp(); };
    Array.prototype.forEach.call(root.querySelectorAll("[data-rm]"), function (b) {
      b.onclick = function () { rmProva(b.getAttribute("data-rm")); };
    });
  }
  function refreshDesemp() {
    var d = document.getElementById("vest-desemp"); if (!d) return;
    d.innerHTML = vestDesempenhoHTML();
    wireDesempenho();
  }
  /* Mesma evolução/registro de acertos, porém já fixada numa instituição — usada
     dentro da aba própria de cada vestibular escolhido (sem precisar reescolher). */
  function provaSecHTML(inst) {
    if (inst === "ENEM") {
      return '<div class="box"><h2>📈 Sua evolução · ENEM</h2>'
        + '<div class="hint">O ENEM tem correção completa questão por questão, com diagnóstico por área.</div>'
        + '<button class="btn green small" data-goenem="1">📗 Abrir a aba do ENEM</button></div>';
    }
    var cfg = VESTIBULARES[inst];
    if (!cfg) return "";
    var provas = provasDe(inst);
    var list = provas.slice().reverse().map(function (p) {
      var nt = notaProva(p);
      var tag = p.tipo === "passado" ? '<span class="tipo-tag passado">vestibular passado</span>' : '<span class="tipo-tag sim">simulado</span>';
      return '<div class="sim-card"><div class="sim-head"><div><b>' + esc(p.nome || cfg.sigla) + '</b> ' + tag + ' <span class="muted">· ' + fmtBR(p.data) + '</span></div><div class="sim-pct" style="color:' + pctColor(nt.pct) + '">' + esc(nt.label) + '</div></div><div class="actions" style="margin-top:8px;justify-content:flex-end"><button class="iconbtn" title="Excluir" data-rmv="' + p.id + '">🗑</button></div></div>';
    }).join("");
    return '<div class="box" id="prova-sec-' + inst + '">'
      + '<div class="toolbar" style="margin:0 0 2px"><h2 style="color:inherit;font-size:1.08rem;font-weight:800">📈 Sua evolução · ' + esc(cfg.sigla) + '</h2>'
      + (window.Gabaritos && Gabaritos.temPara(inst)
          ? '<button class="btn cyan small" data-cartao="' + inst + '">📝 Responder na plataforma</button>' : '')
      + '<button class="btn green small" data-novo="' + inst + '">＋ Registrar acertos</button></div>'
      + '<div class="hint">'
      + (window.Gabaritos && Gabaritos.temPara(inst)
          ? 'Responda a prova aqui e o sistema corrige pelo gabarito oficial. Ou, se já fez e corrigiu por fora, registre só o número de acertos.'
          : 'Fez a prova passada ou um simulado? Registre quantas questões você acertou e acompanhe sua linha de evolução.') + '</div>'
      + vestResumoInst(inst)
      + '<h3 style="margin:16px 0 4px">Linha de evolução</h3>'
      + vestProvaChartSVG(inst)
      + '<div class="toolbar" style="margin-top:14px"><h2>Registros (' + provas.length + ')</h2></div>'
      + (list || '<div class="empty">Nenhum registro ainda. Toque em <b>＋ Registrar acertos</b> pra lançar o primeiro.</div>')
      + '</div>';
  }
  function wireProvaSec(inst) {
    var sec = document.getElementById("prova-sec-" + inst);
    var go = document.querySelector('[data-goenem]');
    if (go) go.onclick = function () { state.vestTab = "enem"; save(); applyTab(); };
    if (!sec) return;
    var novo = sec.querySelector('[data-novo]');
    if (novo) novo.onclick = function () { window._vestInst = inst; window._vestMat = null; openProvaForm(); };
    var cart = sec.querySelector('[data-cartao]');
    if (cart) cart.onclick = function () { openCartao(inst); };
    Array.prototype.forEach.call(sec.querySelectorAll("[data-rmv]"), function (b) {
      b.onclick = function () { rmProva(b.getAttribute("data-rmv")); };
    });
  }
  function refreshProvaSec(inst) {
    var sec = document.getElementById("prova-sec-" + inst); if (!sec) return;
    var tmp = document.createElement("div"); tmp.innerHTML = provaSecHTML(inst);
    sec.parentNode.replaceChild(tmp.firstChild, sec);
    wireProvaSec(inst);
  }
  // depois de salvar/excluir um registro, atualiza tanto a aba "Vestibulares"
  // quanto a aba própria daquele vestibular (as duas mostram os mesmos dados)
  function refreshProvasTudo(inst) {
    refreshDesemp();
    if (inst) refreshProvaSec(inst);
    refreshBadges();
  }
  function openProvaForm() {
    var inst = window._vestInst; if (!inst) { alert("Escolha um vestibular primeiro."); return; }
    var cfg = VESTIBULARES[inst];
    var campos;
    if (cfg.tipo === "materia") {
      campos = '<div class="field"><label>Matéria *</label><input id="pf-materia" list="matlist" placeholder="Ex.: Matemática" autocomplete="off"><datalist id="matlist">' + MATERIAS_SUGESTAO.map(function (d) { return '<option value="' + esc(d) + '">'; }).join("") + '</datalist></div>'
        + '<div class="field"><label>Acertos / quantidade de questões *</label><div class="inline" style="display:flex;gap:8px;align-items:center"><input id="pf-acertos" type="number" min="0" class="mmin" placeholder="acertos"> <span class="muted">de</span> <input id="pf-total" type="number" min="1" class="mmin" placeholder="quantas questões"></div></div>';
    } else {
      // total vem preenchido com o padrão da instituição, mas EDITÁVEL: o número de
      // questões muda entre edições (ex.: a FUVEST passou de 90 p/ 80 questões em 2027).
      campos = '<div class="field"><label>Acertos *</label><div class="inline" style="display:flex;gap:8px;align-items:center"><input id="pf-acertos" type="number" min="0" class="mmin" placeholder="acertos"> <span class="muted">de</span> <input id="pf-total" type="number" min="1" class="mmin" value="' + (cfg.total > 0 ? cfg.total : "") + '" placeholder="total"></div></div>'
        + '<div class="hint" style="margin-top:-4px">Confira o total de questões daquela edição — ele varia de ano pra ano.</div>';
    }
    document.getElementById("modal-root").innerHTML = '<div class="overlay" id="pf-overlay"><div class="modal">'
      + '<h3>Novo registro · ' + esc(cfg.nome) + '</h3>'
      + '<div class="field"><label>Tipo</label><div class="radio-row">'
      + '<label><input type="radio" name="pf-tipo" value="simulado" checked> 📝 Simulado</label>'
      + '<label><input type="radio" name="pf-tipo" value="passado"> 📜 Vestibular passado</label>'
      + '</div></div>'
      + '<div class="field"><label>Nome / ano (opcional)</label><input id="pf-nome" placeholder="Ex.: ' + esc(cfg.sigla) + ' 2022"></div>'
      + '<div class="field"><label>Data em que você fez</label><input id="pf-data" type="date" value="' + todayISO() + '"></div>'
      + campos
      + '<div class="modal-actions"><button class="btn ghost" id="pf-cancel">Cancelar</button><button class="btn done" id="pf-save">Salvar</button></div>'
      + '</div></div>';
    document.getElementById("pf-overlay").onclick = function (e) { if (e.target === this) closeModal(); };
    document.getElementById("pf-cancel").onclick = closeModal;
    document.getElementById("pf-save").onclick = saveProva;
  }
  function closeModal() { document.getElementById("modal-root").innerHTML = ""; }
  function saveProva() {
    var inst = window._vestInst, cfg = VESTIBULARES[inst];
    var tipoEl = document.querySelector('input[name=pf-tipo]:checked');
    var tipo = tipoEl ? tipoEl.value : "simulado";
    var nome = val("pf-nome"), data = val("pf-data") || todayISO();
    var p = { id: "prova-" + Date.now(), instituicao: inst, tipo: tipo, nome: nome, data: data };
    if (cfg.tipo === "materia") {
      var mat = val("pf-materia"); if (!mat) { alert("Informe a matéria."); return; }
      var ac = parseInt(val("pf-acertos"), 10) || 0, tot = parseInt(val("pf-total"), 10) || 0;
      if (!tot) { alert("Informe quantas questões teve o simulado."); return; }
      p.materia = mat; p.acertos = ac; p.total = tot;
    } else {
      var ac2 = parseInt(val("pf-acertos"), 10) || 0, tot2 = parseInt(val("pf-total"), 10) || cfg.total || 0;
      if (!tot2) { alert("Informe o total de questões."); return; }
      p.acertos = ac2; p.total = tot2;
    }
    state.provas.push(p); save(); markAtividade();
    var novos = checkBadges();
    closeModal(); refreshProvasTudo(inst);
    avisaConquistas(novos);
  }
  /* ==================== CARTÃO-RESPOSTA (responder na plataforma) ==========
     O aluno lê a prova no PDF oficial (link já existe na aba de provas), marca
     aqui o que assinalou, e o sistema corrige contra o gabarito da banca.

     A VERSÃO é obrigatória e não tem padrão: a mesma prova sai em cadernos com
     a ordem das questões trocada. Corrigir contra a versão errada devolve um
     número plausível e falso — o pior tipo de erro, porque ninguém percebe. */

  var CR_CSS = '<style>'
    + '.cr-grid{max-height:46vh;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:8px;margin-top:10px}'
    + '.cr-row{display:flex;align-items:center;gap:6px;padding:3px 2px}'
    + '.cr-n{width:30px;text-align:right;font-size:.78rem;color:var(--mut);flex:none;font-variant-numeric:tabular-nums}'
    + '.cr-o{flex:1;min-width:0;padding:6px 0;border:1px solid var(--line);background:transparent;color:var(--mut);'
    + 'border-radius:8px;font:inherit;font-size:.78rem;font-weight:700;cursor:pointer}'
    + '.cr-o.on{background:var(--cyan);border-color:var(--cyan);color:#04222b}'
    + '.cr-row.certa .cr-o.on{background:#2fa64a;border-color:#2fa64a;color:#fff}'
    + '.cr-row.errada .cr-o.on{background:#ff5b6e;border-color:#ff5b6e;color:#fff}'
    + '.cr-row.errada .cr-o.gab{border-color:#2fa64a;color:#2fa64a}'
    + '.cr-resumo{display:flex;gap:14px;flex-wrap:wrap;margin:12px 0}'
    + '.cr-card{flex:1;min-width:90px;border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center}'
    + '.cr-card b{display:block;font-size:1.5rem;line-height:1.1}'
    + '.cr-card span{font-size:.72rem;color:var(--mut)}'
    + '</style>';

  function openCartao(inst) {
    var eds = window.Gabaritos ? Gabaritos.edicoes(inst) : [];
    if (!eds.length) { alert("Ainda não tenho o gabarito oficial desta prova cadastrado."); return; }
    window._cr = { inst: inst, ed: eds[0], respostas: [] };
    var ed = window._cr.ed;

    var linhas = "";
    for (var i = 0; i < ed.total; i++) {
      linhas += '<div class="cr-row" data-row="' + i + '"><span class="cr-n">' + (i + 1) + '</span>'
        + ["A", "B", "C", "D", "E"].map(function (L) {
            return '<button class="cr-o" data-q="' + i + '" data-a="' + L + '">' + L + '</button>';
          }).join("")
        + '</div>';
    }

    document.getElementById("modal-root").innerHTML = CR_CSS
      + '<div class="overlay" id="cr-overlay"><div class="modal" style="max-width:620px">'
      + '<h3>📝 Responder na plataforma</h3>'
      + '<div class="field"><label>Edição</label>'
      + '<select id="cr-ed">' + eds.map(function (e, i) {
          return '<option value="' + i + '">' + esc(e.nome) + '</option>'; }).join("") + '</select></div>'
      + '<div class="field"><label>Versão do seu caderno *</label>'
      + '<select id="cr-ver"><option value="">— escolha a versão —</option>'
      + Gabaritos.versoesDe(ed).map(function (v) { return '<option value="' + v + '">Prova ' + v + '</option>'; }).join("")
      + '</select>'
      + '<div class="hint" style="margin-top:6px">Está impressa na <b>capa do caderno</b>. '
      + 'A ordem das questões muda de uma versão pra outra — corrigir pela versão errada dá um resultado errado <b>sem avisar</b>.</div></div>'
      + '<div class="field"><label>Data em que você fez</label><input id="cr-data" type="date" value="' + todayISO() + '"></div>'
      + '<div class="hint" id="cr-prog">0 de ' + ed.total + ' respondidas · deixar em branco vale como erro</div>'
      + '<div class="cr-grid" id="cr-grid">' + linhas + '</div>'
      + '<div class="modal-actions"><button class="btn ghost" id="cr-cancel">Cancelar</button>'
      + '<button class="btn done" id="cr-go">Corrigir</button></div>'
      + '</div></div>';

    document.getElementById("cr-overlay").onclick = function (e) { if (e.target === this) closeModal(); };
    document.getElementById("cr-cancel").onclick = closeModal;
    document.getElementById("cr-go").onclick = corrigirCartao;
    document.getElementById("cr-grid").onclick = function (e) {
      var b = e.target.closest ? e.target.closest(".cr-o") : null; if (!b) return;
      var q = +b.getAttribute("data-q"), a = b.getAttribute("data-a");
      // clicar de novo na mesma letra desmarca
      window._cr.respostas[q] = (window._cr.respostas[q] === a) ? "" : a;
      var row = b.parentNode;
      Array.prototype.forEach.call(row.querySelectorAll(".cr-o"), function (o) {
        o.classList.toggle("on", o.getAttribute("data-a") === window._cr.respostas[q]);
      });
      var n = window._cr.respostas.filter(function (x) { return !!x; }).length;
      document.getElementById("cr-prog").innerHTML = n + " de " + window._cr.ed.total
        + " respondidas · deixar em branco vale como erro";
    };
  }

  function corrigirCartao() {
    var cr = window._cr; if (!cr) return;
    var versao = val("cr-ver");
    if (!versao) { alert("Escolha a versão do seu caderno antes de corrigir.\n\nEla está na capa da prova. Sem isso o resultado sairia errado."); return; }
    var n = cr.respostas.filter(function (x) { return !!x; }).length;
    if (!n) { alert("Marque pelo menos uma resposta."); return; }
    if (n < cr.ed.total && !confirm("Você respondeu " + n + " de " + cr.ed.total + ".\nAs em branco contam como erro. Corrigir assim?")) return;

    var r = Gabaritos.corrigir(cr.ed, versao, cr.respostas);
    cr.resultado = r; cr.versao = versao;

    // pinta o cartão: verde no acerto, vermelho no erro + contorno no gabarito
    r.detalhe.forEach(function (d, i) {
      var row = document.querySelector('.cr-row[data-row="' + i + '"]'); if (!row) return;
      row.classList.remove("certa", "errada");
      if (!d.marcada) return;
      row.classList.add(d.ok ? "certa" : "errada");
      if (!d.ok) {
        var g = row.querySelector('.cr-o[data-a="' + d.certa + '"]');
        if (g) g.classList.add("gab");
      }
    });

    var pctAc = Math.round(r.acertos / r.total * 100);
    document.getElementById("cr-prog").innerHTML =
      '<div class="cr-resumo">'
      + '<div class="cr-card"><b style="color:#2fa64a">' + r.acertos + '</b><span>acertos</span></div>'
      + '<div class="cr-card"><b style="color:#ff5b6e">' + r.erros + '</b><span>erros</span></div>'
      + '<div class="cr-card"><b>' + r.brancos + '</b><span>em branco</span></div>'
      + '<div class="cr-card"><b style="color:var(--cyan)">' + pctAc + '%</b><span>de ' + r.total + '</span></div>'
      + '</div>'
      + '<div class="hint">Corrigido pelo gabarito oficial da <b>Prova ' + versao + '</b> · '
      + 'conferido em ' + esc(cr.ed.conferido) + '. Verde = acertou · vermelho = errou, com o gabarito contornado.'
      + (cr.ed.assuntos ? '' : '<br>O diagnóstico por assunto ainda não está disponível para esta edição.')
      + '</div>';

    var acoes = document.querySelector("#cr-overlay .modal-actions");
    acoes.innerHTML = '<button class="btn ghost" id="cr-cancel2">Fechar</button>'
      + '<button class="btn done" id="cr-save">Salvar na linha de evolução</button>';
    document.getElementById("cr-cancel2").onclick = closeModal;
    document.getElementById("cr-save").onclick = salvarCartao;
    document.getElementById("cr-grid").scrollTop = 0;
  }

  function salvarCartao() {
    var cr = window._cr; if (!cr || !cr.resultado) return;
    state.provas.push({
      id: "prova-" + Date.now(), instituicao: cr.inst, tipo: "passado",
      nome: cr.ed.nome + " · " + cr.versao, data: val("cr-data") || todayISO(),
      acertos: cr.resultado.acertos, total: cr.resultado.total
    });
    save(); markAtividade();
    var novos = checkBadges();
    closeModal(); refreshProvasTudo(cr.inst);
    avisaConquistas(novos);
  }

  function rmProva(id) {
    if (!confirm("Excluir este registro?")) return;
    var alvo = (state.provas.filter(function (p) { return p.id === id; })[0] || {}).instituicao;
    state.provas = state.provas.filter(function (p) { return p.id !== id; });
    save(); refreshProvasTudo(alvo);
  }

  /* ---------------- conquistas (gamificação) ----------------
     Marcos simples que reconhecem progresso: primeiro simulado, sequência de dias
     com atividade registrada e bater a meta de aproveitamento que o estudante definir. */
  function melhorAproveitamento() {
    var best = 0;
    state.registros.forEach(function (r) { best = Math.max(best, pct(r.total, 180)); });
    state.provas.forEach(function (p) { best = Math.max(best, notaProva(p).pct); });
    return best;
  }
  function calcStreakVest() {
    function has(k) { return !!state.dias[k]; }
    var d = new Date(); d.setHours(0, 0, 0, 0);
    function iso(dt) { return dt.getFullYear() + "-" + ("0" + (dt.getMonth() + 1)).slice(-2) + "-" + ("0" + dt.getDate()).slice(-2); }
    if (!has(iso(d))) d.setDate(d.getDate() - 1); // hoje ainda não teve atividade não zera a sequência
    var n = 0;
    while (has(iso(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function markAtividade(min) { var k = todayISO(); state.dias[k] = (state.dias[k] || 0) + (min || 1); save(); }
  var BADGES = [
    { k: "primeiro-simulado", nome: "Primeiro Simulado", icone: "🥇", desc: "Registre seu primeiro resultado — ENEM ou outro vestibular.",
      done: function () { return state.registros.length > 0 || state.provas.length > 0; } },
    { k: "streak-30", nome: "30 Dias Seguidos", icone: "🔥", desc: "Registre atividade (prova, simulado ou Pomodoro) por 30 dias seguidos.",
      done: function () { return calcStreakVest() >= 30; } },
    { k: "meta-alcancada", nome: "Meta Alcançada", icone: "🎯", desc: "Bata a meta de aproveitamento que você definir abaixo.",
      done: function () { return !!state.meta && melhorAproveitamento() >= state.meta; } }
  ];
  function checkBadges() {
    var novos = [];
    BADGES.forEach(function (b) {
      var ja = state.badges.some(function (x) { return x.k === b.k; });
      if (!ja && b.done()) { state.badges.push({ k: b.k, data: todayISO() }); novos.push(b); }
    });
    if (novos.length) save();
    return novos;
  }
  function avisaConquistas(novos) {
    if (!novos.length) return;
    alert("🏅 Nova conquista desbloqueada: " + novos.map(function (b) { return b.icone + " " + b.nome; }).join(", ") + "!");
  }
  function badgesHTML() {
    var cards = BADGES.map(function (b) {
      var earned = state.badges.filter(function (x) { return x.k === b.k; })[0];
      var on = !!earned;
      return '<div class="sim-card" style="' + (on ? "border-left:3px solid var(--gold)" : "opacity:.55") + '">'
        + '<div class="sim-head"><div><b>' + b.icone + ' ' + esc(b.nome) + '</b> '
        + (on ? '<span class="tipo-tag sim">conquistado</span>' : '<span class="tipo-tag" style="background:var(--chip);color:var(--mut)">bloqueado</span>')
        + '</div></div>'
        + '<div class="muted" style="font-size:.85rem;margin-top:4px">' + esc(b.desc) + '</div>'
        + (on ? '<div class="muted" style="font-size:.78rem;margin-top:4px">🗓️ ' + fmtBR(earned.data) + '</div>' : "")
        + '</div>';
    }).join("");
    return '<div class="box"><h2>🏅 Conquistas</h2>'
      + '<div class="hint">Marcos que mostram sua evolução na preparação.</div>'
      + cards
      + '<div class="field" style="margin-top:10px;max-width:280px"><label>🎯 Sua meta de aproveitamento (%)</label>'
      + '<input id="bd-meta" type="number" min="1" max="100" value="' + (state.meta || "") + '" placeholder="Ex.: 70"></div>'
      + '<div class="hint" style="margin-top:2px">Defina a % de acertos que você quer bater em qualquer prova ou simulado — ao alcançar, a conquista acima é desbloqueada.</div>'
      + '</div>';
  }
  function wireBadges() {
    var el = document.getElementById("bd-meta"); if (!el) return;
    el.onchange = function () {
      var v = parseInt(el.value, 10);
      state.meta = (v > 0 && v <= 100) ? v : 0; save();
      var novos = checkBadges();
      refreshBadges();
      avisaConquistas(novos);
    };
  }

  /* ---------------- provas dos últimos anos (uma versão por aba) ---------------- */
  function enemProvasHTML() {
    var e = EXAMS.filter(function (x) { return x.key === "ENEM"; })[0];
    var opts = '<option value="">ano…</option>' + e.anos.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join("");
    return '<div class="box"><h2>📚 Provas do ENEM dos últimos anos</h2>'
      + '<div class="hint">Escolha o ano — os links da prova e do gabarito daquela edição abrem direto.</div>'
      + '<div class="pv-row"><select id="pv-ano-enem" class="pv-sel">' + opts + '</select></div>'
      + '<div id="pv-out-enem" class="pv-out"></div></div>';
  }
  function wireEnemProvas() {
    var an = document.getElementById("pv-ano-enem"), out = document.getElementById("pv-out-enem");
    if (!an) return;
    var e = EXAMS.filter(function (x) { return x.key === "ENEM"; })[0];
    an.onchange = function () {
      if (!an.value) { out.innerHTML = ""; return; }
      var links = e.edicao(parseInt(an.value, 10));
      if (!links) { out.innerHTML = '<div class="hint">Não achei os links dessa edição ainda.</div>'; return; }
      out.innerHTML = '<div class="pv-links">'
        + links.map(function (l) { return '<a class="pv-link" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + ' ↗</a>'; }).join("")
        + '</div><div class="hint" style="margin-top:8px">ENEM ' + an.value + ' — PDFs oficiais.</div>';
    };
  }
  function outrosProvasHTML() {
    var opts = '<option value="">escolha o vestibular…</option>'
      + EXAMS.filter(function (e) { return e.key !== "ENEM"; }).map(function (e) { return '<option value="' + e.key + '">' + esc(e.nome) + '</option>'; }).join("");
    return '<div class="box"><h2>📚 Provas dos últimos anos</h2>'
      + '<div class="hint">Escolha o vestibular e o ano — os links da prova e do gabarito daquela edição abrem direto.</div>'
      + '<div class="pv-row"><select id="pv-vest" class="pv-sel">' + opts + '</select>'
      + '<select id="pv-ano" class="pv-sel" disabled><option value="">ano…</option></select></div>'
      + '<div id="pv-out" class="pv-out"></div></div>';
  }
  function wireOutrosProvas() {
    var vs = document.getElementById("pv-vest"), an = document.getElementById("pv-ano"), out = document.getElementById("pv-out");
    if (!vs) return;
    vs.onchange = function () {
      var e = EXAMS.filter(function (x) { return x.key === vs.value; })[0];
      out.innerHTML = "";
      if (!e) { an.disabled = true; an.innerHTML = '<option value="">ano…</option>'; return; }
      if (!e.anos || !e.edicao) {
        an.disabled = true; an.innerHTML = '<option value="">—</option>';
        out.innerHTML = '<div class="hint" style="margin-top:10px">Links diretos por ano do <b>' + esc(e.nome) + '</b> ainda não mapeados — por enquanto, o acervo oficial:</div>'
          + '<a class="pv-link" href="' + esc(e.hub) + '" target="_blank" rel="noopener">Abrir acervo oficial ↗</a>';
        return;
      }
      an.disabled = false;
      an.innerHTML = '<option value="">ano…</option>' + e.anos.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join("");
    };
    an.onchange = function () {
      var e = EXAMS.filter(function (x) { return x.key === vs.value; })[0];
      if (!e || !e.edicao || !an.value) { out.innerHTML = ""; return; }
      var links = e.edicao(parseInt(an.value, 10));
      if (!links) { out.innerHTML = '<div class="hint">Não achei os links dessa edição ainda.</div>'; return; }
      out.innerHTML = '<div class="pv-links">'
        + links.map(function (l) { return '<a class="pv-link" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + ' ↗</a>'; }).join("")
        + '</div><div class="hint" style="margin-top:8px">' + esc(e.nome) + ' ' + an.value + ' — PDFs oficiais.'
        + (e.hub ? ' Quer outro ano? <a href="' + esc(e.hub) + '" target="_blank" rel="noopener">acervo oficial ↗</a>' : '') + '</div>';
    };
  }

  /* ---------------- Pomodoro ---------------- */
  function fmtClock(s) { var m = Math.floor(s / 60), ss = s % 60; return ("0" + m).slice(-2) + ":" + ("0" + ss).slice(-2); }
  function fmtMin(m) { return m < 60 ? m + " min" : Math.floor(m / 60) + "h" + ("0" + (m % 60)).slice(-2); }
  var PRESETS = [[25, 5], [50, 10], [15, 3]];
  function pomodoroHTML() {
    var p = state.pomo;
    return '<div class="box"><h2>⏱️ Pomodoro — foco pro vestibular</h2>'
      + '<div class="hint">Blocos de foco com descanso. Cada foco completo conta como um ciclo e soma no seu tempo estudado.</div>'
      + '<div class="pomo"><div class="pomo-phase focus" id="pomo-phase">Foco</div>'
      + '<div class="pomo-clock" id="pomo-clock">' + fmtClock(p.focus * 60) + '</div>'
      + '<div class="pomo-btns"><button class="btn green" id="pomo-start">▶ Iniciar</button>'
      + '<button class="btn ghost" id="pomo-reset">↺ Reiniciar</button></div>'
      + '<div class="pomo-presets">' + PRESETS.map(function (pr) {
        var sel = (p.focus === pr[0] && p.brk === pr[1]) ? " sel" : "";
        return '<button class="pomo-preset' + sel + '" data-f="' + pr[0] + '" data-b="' + pr[1] + '">' + pr[0] + '/' + pr[1] + ' min</button>';
      }).join("") + '</div>'
      + '<div class="pomo-stats">Ciclos: <b id="pomo-cycles">' + p.cycles + '</b> · Tempo focado: <b id="pomo-total">' + fmtMin(p.totalMin) + '</b></div>'
      + '</div></div>';
  }
  function wirePomodoro() {
    var st = document.getElementById("pomo-start"); if (!st) return;
    if (!pomo.running) { pomo.mode = "focus"; pomo.remaining = state.pomo.focus * 60; }
    updatePomoUI(); updatePomoBtn();
    st.onclick = pomoToggle;
    document.getElementById("pomo-reset").onclick = pomoReset;
    Array.prototype.forEach.call(document.querySelectorAll(".pomo-preset"), function (b) {
      b.onclick = function () { pomoPreset(parseInt(b.getAttribute("data-f"), 10), parseInt(b.getAttribute("data-b"), 10)); };
    });
  }
  function pomoTick() { pomo.remaining--; if (pomo.remaining <= 0) { pomoPhaseEnd(); return; } updatePomoUI(); }
  function pomoToggle() {
    if (pomo.running) { pomo.running = false; clearInterval(pomo.timer); }
    else { pomo.running = true; pomo.timer = setInterval(pomoTick, 1000); }
    updatePomoBtn();
  }
  function pomoPhaseEnd() {
    clearInterval(pomo.timer);
    try { if (navigator.vibrate) navigator.vibrate(200); } catch (e) {}
    if (pomo.mode === "focus") {
      state.pomo.cycles++; state.pomo.totalMin += state.pomo.focus; save();
      var c = document.getElementById("pomo-cycles"); if (c) c.textContent = state.pomo.cycles;
      var t = document.getElementById("pomo-total"); if (t) t.textContent = fmtMin(state.pomo.totalMin);
      markAtividade();
      avisaConquistas(checkBadges());
      refreshBadges();
      pomo.mode = "break"; pomo.remaining = state.pomo.brk * 60;
    } else {
      pomo.mode = "focus"; pomo.remaining = state.pomo.focus * 60;
    }
    pomo.timer = setInterval(pomoTick, 1000); // segue rodando pro próximo bloco
    updatePomoUI();
  }
  function pomoReset() {
    clearInterval(pomo.timer); pomo.running = false; pomo.mode = "focus"; pomo.remaining = state.pomo.focus * 60;
    updatePomoUI(); updatePomoBtn();
  }
  function pomoPreset(f, b) {
    state.pomo.focus = f; state.pomo.brk = b; save();
    clearInterval(pomo.timer); pomo.running = false; pomo.mode = "focus"; pomo.remaining = f * 60;
    Array.prototype.forEach.call(document.querySelectorAll(".pomo-preset"), function (x) {
      x.classList.toggle("sel", parseInt(x.getAttribute("data-f"), 10) === f && parseInt(x.getAttribute("data-b"), 10) === b);
    });
    updatePomoUI(); updatePomoBtn();
  }
  function updatePomoUI() {
    var clk = document.getElementById("pomo-clock"); if (clk) clk.textContent = fmtClock(Math.max(0, pomo.remaining));
    var ph = document.getElementById("pomo-phase"); if (ph) { ph.textContent = pomo.mode === "focus" ? "Foco" : "Descanso"; ph.className = "pomo-phase " + (pomo.mode === "focus" ? "focus" : "brk"); }
  }
  function updatePomoBtn() { var st = document.getElementById("pomo-start"); if (st) st.innerHTML = pomo.running ? "⏸ Pausar" : "▶ Iniciar"; }

  /* ---------------- histórico ---------------- */
  function histHTML() {
    if (!state.registros.length) return "";
    var rows = state.registros.slice().sort(function (a, b) { return (b.data || "").localeCompare(a.data || ""); }).map(function (r) {
      return '<div class="hrow"><span><b>' + esc(r.vest) + ' ' + esc(r.ano) + '</b> · ' + fmtBR(r.data) + '</span>'
        + '<span class="muted">' + r.total + '/180 (' + pct(r.total, 180) + '%)</span>'
        + '<button class="del" onclick="_vdel(\'' + r.id + '\')">remover</button></div>';
    }).join("");
    return '<div class="box"><h2>🗂️ Histórico do ENEM</h2>' + rows + '</div>';
  }
  window._vdel = function (id) {
    if (!confirm("Remover este resultado?")) return;
    state.registros = state.registros.filter(function (r) { return r.id !== id; });
    save(); refreshDynamic();
  };

  /* ---------------- migração única: traz p/ cá os registros de vestibular (FUVEST/UNICAMP/PUC...)
     que ficavam presos na aba "Vestibular" do Painel de Estudos, agora descontinuada ali. ---------------- */
  function migrarDoEstudos() {
    if (state.migradoEstudos) return;
    if (!window.Cloud || !window.Cloud.user || !window.Cloud.firestore) return;
    var uid = window.Cloud.user.uid;
    window.Cloud.firestore().collection("users").doc(uid).collection("panels").doc("estudos-lab").get().then(function (snap) {
      state.migradoEstudos = true;
      if (!snap.exists || !snap.data() || !snap.data().blob) { save(); return; }
      var blob = snap.data().blob, raw = null;
      Object.keys(blob).forEach(function (k) {
        if (k.indexOf("painel-estudos") !== 0) return;
        try { var parsed = JSON.parse(blob[k]); if (parsed && parsed.vest && parsed.vest.provas) raw = parsed; } catch (e) {}
      });
      if (!raw) { save(); return; }
      var existingIds = {}; state.provas.forEach(function (p) { existingIds[p.id] = true; });
      var added = 0;
      raw.vest.provas.forEach(function (p) {
        if (!p || !p.id || existingIds[p.id]) return;
        if (!VESTIBULARES[p.instituicao]) return; // ENEM (formato TRI antigo) fica de fora — o corretor por questão já cobre o ENEM
        state.provas.push(p); existingIds[p.id] = true; added++;
      });
      // metas, exercícios e dias estudados (streak/heatmap) vinham da aba "Vestibular" do
      // Painel de Estudos, removida de lá — traz o que o aluno já tinha registrado, uma vez só.
      var metaIds = {}; state.metas.forEach(function (m) { metaIds[m.id] = true; });
      (raw.vest.metas || []).forEach(function (m) { if (m && m.id && !metaIds[m.id]) { state.metas.push(m); metaIds[m.id] = true; added++; } });
      var exIds = {}; state.exercicios.forEach(function (e) { exIds[e.id] = true; });
      (raw.vest.exercicios || []).forEach(function (e) { if (e && e.id && !exIds[e.id]) { state.exercicios.push(e); exIds[e.id] = true; added++; } });
      Object.keys(raw.vest.dias || {}).forEach(function (k) { state.dias[k] = (state.dias[k] || 0) + (raw.vest.dias[k] || 0); });
      save();
      refreshHeatmap();
      if (added) { refreshDesemp(); refreshMetas(); refreshExercicios(); }
    }).catch(function () { /* offline/sem permissão agora — tenta de novo no próximo login */ });
  }

  load();
  render();
  migrarDoEstudos();
})();
