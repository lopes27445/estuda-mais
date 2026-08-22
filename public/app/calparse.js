/* calparse.js — parser do comunicado da escola (calendário de Provas / Produção
   Concreta) → cards estruturados. Ancorado na MATÉRIA; coleta as datas com
   lookahead. Funciona tanto com texto COLADO (uma célula por linha) quanto com o
   texto extraído de PDF (data+matéria+prof numa linha só). Best-effort: o
   professor revisa o rascunho antes de publicar. Roda no navegador e no Node. */
(function (root) {
  "use strict";

  var DISC = ["Matemática 1 e 3", "Matemática 2", "Língua Portuguesa", "Língua Inglesa",
    "Inglês", "História", "Física", "Gramática", "Filosofia", "Matemática",
    "Geografia", "Química", "Literatura", "Biologia", "Redação", "Sociologia"];

  var AREA = {
    "Biologia": "Natureza", "Física": "Natureza", "Química": "Natureza",
    "História": "Humanas", "Geografia": "Humanas", "Filosofia": "Humanas", "Sociologia": "Humanas",
    "Inglês": "Linguagens", "Língua Inglesa": "Linguagens", "Gramática": "Linguagens",
    "Literatura": "Linguagens", "Redação": "Linguagens", "Língua Portuguesa": "Linguagens",
    "Matemática": "Matemática", "Matemática 2": "Matemática", "Matemática 1 e 3": "Matemática"
  };

  var DATE_G = /(\d{1,2})\s*(?:e\s*\d{1,2}\s*)?[\/.]\s*(\d{1,2})/g;
  var DATE_LEAD = /^(\d{1,2}\s*(?:e\s*\d{1,2}\s*)?[\/.]\s*\d{1,2})\s+/;

  function norm(s) { return (s || "").replace(/​/g, "").replace(/[ \t]+/g, " ").trim(); }
  function pad(n) { return ("0" + n).slice(-2); }
  function toISO(d, m, ano) { return ano + "-" + pad(m) + "-" + pad(d); }
  function fmtBR(iso) { var p = iso.split("-"); return p[2] + "/" + p[1]; }
  function uniqSort(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }).sort(); }
  function collectDates(str, ano) {
    var out = [], m; DATE_G.lastIndex = 0;
    while ((m = DATE_G.exec(str))) out.push(toISO(m[1], m[2], ano));
    return out;
  }
  function isTopicStart(l) { return /^([-–•]|\d|Livros?|M[óo]dulo|Tema|Frente|Prof|Proposta|Gênero|Grupo)/i.test(l); }

  // remove do início tokens "estruturais" (datas, Turma X, Nª entrega, 3A/3B, parênteses…)
  var STRUCT = [
    { re: /^Turma\s+[0-9A-D]+(\s*\/\s*[0-9A-D]+)?/i, marker: true },
    { re: /^\d+ª\s*entrega/i, marker: true },
    { re: /^\d?\s*[A-D]\s*\/\s*\d?\s*[A-D]\b/i, marker: true },
    { re: /^\d{1,2}\s*(?:e\s*\d{1,2}\s*)?[\/.]\s*\d{1,2}/, marker: true },
    { re: /^\([^)]*\)/, marker: false },
    { re: /^Textos?\s*:?/i, marker: false },
    { re: /^Editorial\b/i, marker: false },
    { re: /^_+/, marker: false },
    { re: /^[\s:.\-–]+/, marker: false }
  ];
  function stripStruct(s) {
    var n = s, changed = true, had = false;
    while (changed) {
      changed = false;
      for (var k = 0; k < STRUCT.length; k++) {
        var m = n.match(STRUCT[k].re);
        if (m && m[0].length) { if (STRUCT[k].marker) had = true; n = n.slice(m[0].length); changed = true; }
      }
    }
    return { rest: n.trim(), had: had };
  }
  function discPrefix(s) { for (var i = 0; i < DISC.length; i++) if (s.indexOf(DISC[i]) === 0) return DISC[i]; return null; }

  // linha "abre" um item? (matéria em contexto de cabeçalho)
  function anchorInfo(line) {
    var sp = stripStruct(line);
    var disc = discPrefix(sp.rest);
    if (!disc) return null;
    var after = sp.rest.slice(disc.length).replace(/^[\s:.\-–]+/, "").trim();
    if (sp.had || after === "" || /^Prof/i.test(after)) return { disc: disc, after: after };
    return null; // evita falso-positivo (ex.: "Geografia e Indústria" no meio do conteúdo)
  }
  function isPurelyStructural(line) { return stripStruct(line).rest === ""; }
  // Uma data solta pertence ao PRÓXIMO item se, olhando adiante (pulando outras
  // datas/estruturais e fragmentos de nota), a próxima coisa "de verdade" for uma
  // matéria (âncora) e NÃO um conteúdo (Proposta/Livro/Módulo…).
  function nextIsAnchor(lines, i) {
    var budget = 10;
    for (var j = i + 1; j < lines.length && budget > 0; j++) {
      var l = lines[j]; if (!l) continue; budget--;
      if (anchorInfo(l)) return true;
      if (isPurelyStructural(l)) { budget++; continue; }        // outra data/entrega: não conta no orçamento
      if (isTopicStart(l) || /^Modalidade|^Proposta/i.test(l)) return false; // é conteúdo deste item
      // senão: fragmento de nota (ex.: parêntese quebrado) → continua olhando
    }
    return false;
  }

  function parse(text, ano) {
    ano = ano || (new Date().getFullYear());
    var raw = String(text || "").split(/\r?\n/);

    var tipo = /Produção Concreta/i.test(text) ? "pc" : /Calendário de Provas/i.test(text) ? "provas" : null;
    var iHead = -1, iConteudo = -1;
    for (var k = 0; k < raw.length; k++) {
      var nk = norm(raw[k]);
      if (iHead < 0 && /^(Data|Entrega)\b/i.test(nk)) { iHead = k; if (!tipo) tipo = /Entrega/i.test(nk) ? "pc" : "provas"; }
      if (iHead >= 0 && iConteudo < 0 && /^Conteúdo/i.test(nk)) { iConteudo = k; break; }
    }
    if (!tipo) tipo = "provas";

    var regras = raw.slice(0, iHead >= 0 ? iHead : 0).map(norm).filter(Boolean)
      .filter(function (l) { return !/^Calendário|^\d+º?\s*Bim|^_+$|^Data$|^Entrega$|^Disciplina$/i.test(l); }).join("\n");

    var start = iConteudo >= 0 ? iConteudo + 1 : (iHead >= 0 ? iHead + 1 : 0);
    var lines = raw.slice(start).map(norm);

    var items = [], cur = null, pending = [];
    function flush() { if (cur) items.push(cur); cur = null; }
    function newItem(disc) { return { tipo: tipo, disc: disc, area: AREA[disc] || "", data: "", datas: [], prof: "", mod: "", topics: [], note: "" }; }
    function addContent(it, ln) {
      if (/^Modalidade/i.test(ln)) { it.mod = ln.replace(/^Modalidade\s*[-:]\s*/i, ""); return; }
      if (/^Prof[a]?\b/i.test(ln) && !/Frente|Livro|M[óo]dulo|Tema/i.test(ln) && ln.length < 40) { it.prof = (it.prof ? it.prof + " · " : "") + ln; return; }
      if (/^\(/.test(ln)) { it.note = (it.note ? it.note + " " : "") + ln.replace(/[()]/g, ""); return; }
      if (it.topics.length && !isTopicStart(ln)) it.topics[it.topics.length - 1] += " " + ln;
      else it.topics.push(ln);
    }

    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i]; if (!ln) continue;
      if (/Ensino Médio COC|Rede Única/i.test(ln)) continue;

      var a = anchorInfo(ln);
      if (a) {
        flush();
        cur = newItem(a.disc);
        collectDates(ln, ano).forEach(function (d) { cur.datas.push(d); });     // datas no cabeçalho do item
        pending.forEach(function (pl) { collectDates(pl, ano).forEach(function (d) { cur.datas.push(d); }); });
        pending = [];
        if (a.after) addContent(cur, a.after);
        continue;
      }
      if (!cur) { pending.push(ln); continue; } // antes do 1º item

      if (isPurelyStructural(ln)) {
        // data solta: pertence ao PRÓXIMO item se logo vem uma matéria; senão é entrega deste
        if (nextIsAnchor(lines, i)) pending.push(ln);
        else collectDates(ln, ano).forEach(function (d) { cur.datas.push(d); });
        continue;
      }
      // linha de conteúdo — tira uma data no início (ex.: "10/09 Proposta …")
      var lead = ln.match(DATE_LEAD);
      if (lead) { collectDates(lead[1], ano).forEach(function (d) { cur.datas.push(d); }); ln = ln.slice(lead[0].length).trim(); }
      if (ln) addContent(cur, ln);
    }
    flush();

    items.forEach(function (it) {
      it.datas = uniqSort(it.datas);
      if (it.datas.length) {
        it.data = it.datas[0];
        if (it.datas.length > 1) it.note = (it.note ? it.note + " · " : "") + "Entregas: " + it.datas.map(fmtBR).join(", ");
      }
      it.topics = it.topics.map(norm).filter(Boolean);
      delete it.datas;
    });

    return { tipo: tipo, ano: ano, regras: regras, items: items };
  }

  var api = { parse: parse, DISC: DISC, AREA: AREA };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.CalParse = api;
})(this);
