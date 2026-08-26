/* activesoft.js — leitor do boletim do Activesoft (Portal do Responsável).
   ============================================================================
   Lê o PDF que a escola emite e devolve as notas estruturadas, para o aluno
   não precisar digitar nada.

   COMO ELE SE ORIENTA: não usa posição fixa de coluna. Ele acha a linha de
   cabeçalho (a que tem "AV1") e usa a posição de cada rótulo como âncora; cada
   valor é atribuído à âncora mais próxima. Assim o parser sobrevive a mudança
   de margem, de fonte ou de quantidade de bimestres — que é justamente o que
   quebra parser de boletim escrito com coordenada chumbada.

   ESTRUTURA DO BOLETIM (COC Atibaia / Activesoft, conferido em 26/08/2026):
   - Cada bimestre tem 10 colunas:
       AV1 AV2 PC AVE MED F | REC-MED REC-F | BIM-MED BIM-F
   - Matérias podem ter SUB-DISCIPLINAS. "Biologia" aparece como linha-mãe só
     com a média, e "Biologia 1/2/3" abaixo com as notas cheias. O Estuda+
     trabalha no nível da mãe, então nesses casos importamos a média pronta.
   - "DISP" (dispensado) aparece no lugar de uma prova.

   Recebe TOKENS ({x, y, t}), não um PDF — assim a lógica é testável sem
   navegador e sem precisar de um boletim real no repositório.
   ============================================================================ */
(function () {
  "use strict";

  var TOL_LINHA = 3.5;   // dois tokens na mesma linha visual variam pouco em y
  var TOL_COLUNA = 14;   // distância máxima até a âncora da coluna
  var COLS = ["av1", "av2", "pc", "ave", "med", "faltas", "recMed", "recF", "bimMed", "bimF"];

  function agrupaLinhas(tokens) {
    var t = tokens.slice().sort(function (a, b) { return (a.y - b.y) || (a.x - b.x); });
    var linhas = [];
    t.forEach(function (tk) {
      var ult = linhas[linhas.length - 1];
      if (ult && Math.abs(tk.y - ult.y) <= TOL_LINHA) ult.tokens.push(tk);
      else linhas.push({ y: tk.y, tokens: [tk] });
    });
    linhas.forEach(function (l) { l.tokens.sort(function (a, b) { return a.x - b.x; }); });
    return linhas;
  }

  /* A linha de cabeçalho dá as âncoras. Os rótulos se repetem por bimestre, e
     é a ordem que diz a qual bloco cada um pertence. */
  function lerCabecalho(linhas) {
    for (var i = 0; i < linhas.length; i++) {
      var rot = linhas[i].tokens.filter(function (tk) {
        return /^(AV1|AV2|PC|AVE|MED|F|M)$/.test(tk.t);
      });
      if (!rot.length || rot[0].t !== "AV1") continue;
      var blocos = [], atual = null;
      rot.forEach(function (tk) {
        if (tk.t === "AV1") { atual = { x: {} }; blocos.push(atual); }
        if (!atual) return;
        var n = Object.keys(atual.x).length;
        if (n < COLS.length) atual.x[COLS[n]] = tk.x;
      });
      blocos = blocos.filter(function (b) { return b.x.av1 != null && b.x.med != null; });
      if (blocos.length) return { linha: i, blocos: blocos, xTabela: rot[0].x };
    }
    return null;
  }

  /* Cada valor pertence a UMA coluna: a mais próxima dele.
     Fazer o contrário — cada coluna procurando o valor mais próximo — faz um
     mesmo número ser contado em duas colunas vizinhas, porque as colunas de
     média e de falta ficam a menos de uma tolerância uma da outra. */
  function distribuiPorColuna(valores, ancoras) {
    var out = {};
    valores.forEach(function (tk) {
      var melhorChave = null, melhorDist = TOL_COLUNA;
      ancoras.forEach(function (a) {
        var d = Math.abs(tk.x - a.x);
        if (d < melhorDist) { melhorDist = d; melhorChave = a.chave; }
      });
      if (melhorChave && out[melhorChave] == null) {
        out[melhorChave] = (tk.t === "-") ? "" : tk.t;
      }
    });
    return out;
  }

  function ehNota(v) { return /^(\d{1,2}([.,]\d)?|DISP)$/i.test(String(v || "").trim()); }

  function parseTokens(tokens) {
    var linhas = agrupaLinhas(tokens);
    var cab = lerCabecalho(linhas);
    if (!cab) throw new Error("Não reconheci o formato deste PDF — a tabela de notas não foi encontrada.");

    var info = lerIdentificacao(linhas, cab.linha);
    var disciplinas = [];

    for (var i = cab.linha + 1; i < linhas.length; i++) {
      var toks = linhas[i].tokens;
      var nome = toks.filter(function (tk) { return tk.x < cab.xTabela - 2; })
                     .map(function (tk) { return tk.t; }).join(" ").trim();
      if (!nome || nome.length > 60) continue;
      if (/^(Assinatura|Observa|Legenda|Activesoft|Esta )/i.test(nome)) continue;

      var valores = toks.filter(function (tk) { return tk.x >= cab.xTabela - 2; });
      if (!valores.length) continue;

      // âncoras de TODOS os bimestres de uma vez: assim um valor do 2º bimestre
      // não é capturado por uma coluna da ponta do 1º.
      var ancoras = [];
      cab.blocos.forEach(function (b, bi) {
        COLS.forEach(function (c) {
          if (b.x[c] != null) ancoras.push({ chave: bi + "." + c, x: b.x[c] });
        });
      });
      var mapa = distribuiPorColuna(valores, ancoras);
      var bims = cab.blocos.map(function (b, bi) {
        var o = {};
        COLS.forEach(function (c) { o[c] = mapa[bi + "." + c] || ""; });
        return o;
      });
      // linha só de rótulo (sem nenhuma nota em nenhum bimestre) não interessa
      var temAlgo = bims.some(function (b) {
        return ehNota(b.av1) || ehNota(b.med) || ehNota(b.bimMed);
      });
      if (!temAlgo) continue;

      disciplinas.push({
        nome: nome,
        // linha-mãe de matéria com sub-disciplinas: só traz média, sem AV1
        agregada: !bims.some(function (b) { return ehNota(b.av1); }),
        bimestres: bims
      });
    }
    if (!disciplinas.length) throw new Error("Li o PDF mas não achei nenhuma disciplina com nota.");
    return { info: info, disciplinas: disciplinas };
  }

  function lerIdentificacao(linhas, ateLinha) {
    var txt = linhas.slice(0, ateLinha).map(function (l) {
      return l.tokens.map(function (tk) { return tk.t; }).join(" ");
    }).join("\n");
    var out = { aluno: "", matricula: "", serie: "", turma: "", ano: "", emissao: "" };
    var m;
    if ((m = txt.match(/Aluno\(a\)\s*:?\s*(.+)/i))) out.aluno = m[1].trim();
    if ((m = txt.match(/Matr[ií]cula\s*:?\s*([\w-]+)/i))) out.matricula = m[1].trim();
    if ((m = txt.match(/Emiss[ãa]o\s*:?\s*([\d/]+)/i))) out.emissao = m[1].trim();
    // ano letivo: só o que aparece na linha do curso. Procurar "\d{4}" solto no
    // documento inteiro pegava o CEP e o número da rua do cabeçalho da escola.
    var linhaCurso = (txt.match(/.*S[ÉE]RIE.*/i) || [""])[0];
    if ((m = linhaCurso.match(/\b(20\d{2})\b/))) out.ano = m[1];

    /* Série e turma.
       Duas armadilhas que só apareceram lendo um boletim de verdade:
       1. o cabeçalho tem duas colunas na mesma altura, então os tokens saem
          embaralhados quando ordenados por x — não dá pra confiar na ordem
          das palavras da "linha";
       2. a turma vem como "3° B", com sinal de grau, e não como "3ª SÉRIE B".
       Por isso a busca é pelo padrão dígito + grau + letra isolada, varrendo
       tudo e ficando com a última ocorrência (a primeira é o nome do curso).

       O \b sozinho não bastava: em JavaScript ele considera "É" um separador,
       então "3ª SÉRIE" casava com a turma "S". Daí a espiada negativa por
       qualquer letra, acentuada inclusive. E a busca fica só nas linhas que
       falam de SÉRIE, pra "3º" seguido de "B B B" no cabeçalho da tabela não
       virar turma. */
    var comSerie = linhas.slice(0, ateLinha).map(function (l) {
      return l.tokens.map(function (tk) { return tk.t; }).join(" ");
    }).filter(function (l) { return /S[ÉE]RIE/i.test(l); });

    var naoLetra = "(?![A-Za-zÀ-ÿ])";
    comSerie.forEach(function (linha) {
      var achou, re = new RegExp("\\b(\\d)\\s*[ªº°]\\s*([A-H])" + naoLetra, "g");
      while ((achou = re.exec(linha)) !== null) { out.serie = achou[1]; out.turma = achou[2].toUpperCase(); }
      // formato alternativo, sem o grau colado: "3ª SÉRIE B"
      var alt = linha.match(new RegExp("S[ÉE]RIE\\s+([A-H])" + naoLetra, "i"));
      if (alt) out.turma = alt[1].toUpperCase();
      var s = linha.match(/(\d)\s*[ªº°]?\s*S[ÉE]RIE/i);
      if (s && !out.serie) out.serie = s[1];
    });
    return out;
  }

  /* Converte a leitura para o formato do painel de notas.
     Matéria agregada (com sub-disciplinas) entra pela média pronta, que é
     exatamente para o que o campo "média direta" do painel existe. */
  function paraPainel(lido, subjects) {
    function achaLinha(nomeSubject) {
      var alvo = normaliza(nomeSubject);
      for (var i = 0; i < lido.disciplinas.length; i++) {
        if (normaliza(lido.disciplinas[i].nome) === alvo) return lido.disciplinas[i];
      }
      return null;
    }
    var casadas = [], naoAchadas = [], mudancas = [];
    subjects.forEach(function (s) {
      var d = achaLinha(s.name);
      if (!d) { naoAchadas.push(s.name); return; }
      casadas.push(s.name);
      d.bimestres.forEach(function (b, i) {
        if (i >= s.bims.length) return;
        var destino = s.bims[i], antes = JSON.stringify(destino);
        if (d.agregada) {
          var med = b.bimMed || b.med;
          if (ehNota(med)) destino.medManual = String(med).replace(".", ",");
        } else {
          if (ehNota(b.av1)) destino.av1 = String(b.av1).replace(".", ",");
          if (ehNota(b.av2)) destino.av2 = String(b.av2).replace(".", ",");
          if (ehNota(b.pc)) destino.pc = String(b.pc).replace(".", ",");
          if (ehNota(b.ave)) destino.ave = String(b.ave).replace(".", ",");
        }
        if (JSON.stringify(destino) !== antes) mudancas.push(s.name + " · " + (i + 1) + "º bim");
      });
    });
    return { casadas: casadas, naoAchadas: naoAchadas, mudancas: mudancas };
  }

  function normaliza(s) {
    return String(s || "").toLowerCase()
      .normalize ? String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim()
                 : String(s || "").toLowerCase().trim();
  }

  window.Activesoft = {
    parseTokens: parseTokens,
    paraPainel: paraPainel,
    ehNota: ehNota,
    _normaliza: normaliza
  };
})();
