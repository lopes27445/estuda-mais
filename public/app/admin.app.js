/* admin.app.js — tela de administração do Estuda+ (staff: professor/coordenação).
   Colar comunicado → CalParse → revisar → publicar por série no Firestore.
   Estrutura: schools/coc-atibaia/series/{serie}/provas|pc/{id} + meta/regras. */
(function () {
  "use strict";
  var db, SCHOOL = "coc-atibaia", serie = "3", draft = null, draftTipo = "provas";

  function esc(s) { return (s == null ? "" : "" + s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // aspas tambem: sem isto, qualquer valor dentro de value="..." ou
    // href="..." fecha o atributo e injeta outro (V-06 da auditoria).
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function base() { return db.collection("schools").doc(SCHOOL).collection("series").doc(String(serie)); }

  function boot() {
    var host = document.getElementById("admin-root");
    if (!window.EP) {
      host.innerHTML = '<p class="amut">Conectando…</p>';
      // não logado: mostra o motivo em vez de "Conectando…" infinito.
      // Só aparece depois de 2s, pra não piscar durante o boot normal.
      if (!boot._gateTimer) boot._gateTimer = setTimeout(function () {
        if (!window.EP && host.innerHTML.indexOf("Conectando") !== -1) {
          host.innerHTML = '<div class="restrito">🔒 Para usar esta área, <b>entre com sua conta</b> no botão “Entrar” do canto superior.<br><span style="font-size:.85rem">Somente professores e coordenação têm acesso — alunos veem os demais painéis.</span></div>';
        }
      }, 2000);
      return;
    }
    if (window.EP.role !== "professor" && window.EP.role !== "coordenacao") {
      host.innerHTML = '<div class="restrito">🔒 Área restrita a <b>professores e coordenação</b>.<br>Você está como aluno. Se você é professor(a), peça à coordenação para cadastrar o seu e-mail.</div>';
      return;
    }
    db = Cloud.firestore();
    // multi-turma: mantém a série que o staff escolheu antes (persiste por aparelho)
    serie = Cloud.getAdminSerie() || String(window.EP.serie || "3");
    Cloud.setAdminSerie(serie);
    render();
  }
  window._ADMIN_BOOT = boot;
  // proteção contra corrida: se o cloud.js já definiu EP (onReady disparou antes
  // deste script carregar), executa o boot imediatamente.
  if (window.EP) { try { boot(); } catch (e) {} }

  function render() {
    var host = document.getElementById("admin-root");
    host.innerHTML =
      '<div class="arow"><label>Série:</label>'
      + '<select id="a-serie">' + [1, 2, 3].map(function (s) { return '<option value="' + s + '" ' + (String(s) === String(serie) ? "selected" : "") + '>' + s + 'ª série</option>'; }).join("") + '</select>'
      + '<span class="amut">Você edita o calendário desta série.</span></div>'
      + '<div class="abox"><h3>📋 Adicionar o comunicado da escola</h3>'
      + '<p class="amut">Envie o <b>PDF</b> ou o <b>Word (.docx)</b> do comunicado (Provas ou Produção Concreta) — o sistema lê e monta os cards. Ou cole o texto, se preferir. Você sempre revisa antes de publicar.</p>'
      + '<label class="abtn" style="display:inline-flex;cursor:pointer;margin-bottom:10px">📎 Enviar PDF ou Word do comunicado<input type="file" id="a-file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style="display:none"></label>'
      + '<div id="a-filestatus" class="amut" style="margin-bottom:8px"></div>'
      + '<textarea id="a-paste" placeholder="…ou cole aqui o texto do comunicado"></textarea>'
      + '<button class="abtn" id="a-parse">Analisar »</button></div>'
      + '<div id="a-risk"></div><div id="a-review"></div><div id="a-published"></div>';
    document.getElementById("a-serie").onchange = function () { serie = this.value; Cloud.setAdminSerie(serie); draft = null; render(); };
    document.getElementById("a-parse").onclick = doParse;
    document.getElementById("a-file").onchange = onFile;
    loadPublished();
    loadRisco();
  }

  /* ============================ ALUNOS EM RISCO ============================
     Mostra os resumos IDENTIFICADOS que os alunos optaram por compartilhar no
     Painel de Notas (botão "Compartilhar resumo com professores" — opt-in,
     escola não vê nota de quem não autorizou).
     Fonte: schools/{school}/series/{serie}/risco/{uid}. */
  function loadRisco() {
    var host = document.getElementById("a-risk"); if (!host) return;
    if (!Cloud.user) { host.innerHTML = ""; return; }
    db.collection("schools").doc(Cloud.school()).collection("series").doc(String(serie)).collection("risco")
      .get().then(function (q) {
        if (q.empty) {
          host.innerHTML = '<div class="abox"><h3>🚨 Alunos em risco — ' + serie + 'ª série</h3>'
            + '<p class="amut">Nenhum aluno compartilhou o resumo ainda. Os alunos ativam em <b>Notas → 📤 → Compartilhar resumo com professores</b>.</p></div>';
          return;
        }
        var rows = q.docs.map(function (d) {
          var o = d.data();
          var pct = o.pctMeta || 0;
          var cls = pct >= 80 ? "#2fa64a" : (pct >= 50 ? "#ffc24b" : "#ff5b6e");
          return '<div class="apub-row">' + esc(o.nome || "Aluno(a)")
            + '<span style="margin-left:auto;font-weight:800;color:' + cls + '">' + Math.round(pct) + '% da meta</span></div>';
        }).join("");
        var nRisco = q.docs.filter(function (d) { return (d.data().pctMeta || 0) < 50; }).length;
        host.innerHTML = '<div class="abox"><h3>🚨 Alunos em risco — ' + serie + 'ª série (' + q.docs.length + ' compartilharam' + (nRisco ? ', <b style="color:#ff5b6e">' + nRisco + ' em risco</b>' : '') + ')</h3>'
          + '<p class="amut">⚠️ Estes dados <b>identificam o aluno</b> (nome e e-mail) e foram compartilhados por escolha dele, em Notas. Use só para acompanhamento pedagógico.</p>'
          + '<div id="a-risklist">' + rows + '</div></div>';
      }).catch(function () {
        host.innerHTML = '<div class="abox"><h3>🚨 Alunos em risco</h3><p class="amut">Não consegui carregar agora.</p></div>';
      });
  }

  function doParse() {
    var txt = document.getElementById("a-paste").value || "";
    if (txt.trim().length < 20) { alert("Envie um PDF ou cole o texto do comunicado primeiro."); return; }
    draft = CalParse.parse(txt, new Date().getFullYear());
    draftTipo = draft.tipo;
    renderReview();
  }

  function setFileStatus(t) { var el = document.getElementById("a-filestatus"); if (el) el.textContent = t || ""; }

  /* Limites de processamento (V-13 da auditoria). Sem eles, um arquivo enorme
     ou com milhares de páginas congela o navegador de quem está publicando —
     e nem precisa ser malicioso, um digitalizado pesado já basta. */
  var MAX_ARQUIVO_MB = 15;
  var MAX_PAGINAS = 60;
  var MAX_SEGUNDOS = 25;

  function comPrazo(promise, segundos, oQue) {
    return Promise.race([
      promise,
      new Promise(function (_, rej) {
        setTimeout(function () {
          rej(new Error(oQue + " demorou mais de " + segundos + "s e foi cancelado."));
        }, segundos * 1000);
      })
    ]);
  }

  // Confere a assinatura real do arquivo, não a extensão nem o tipo declarado —
  // os dois são escolhidos por quem envia. PDF começa com "%PDF-", DOCX é um
  // zip, que começa com "PK".
  function assinaturaOk(buf, isPdf) {
    var b = new Uint8Array(buf, 0, 5);
    if (isPdf) return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d;
    return b[0] === 0x50 && b[1] === 0x4b;
  }

  // Lê o PDF no próprio navegador (PDF.js) e reconstrói as linhas pela posição do texto.
  function pdfToText(buf) {
    if (!window.pdfjsLib) return Promise.reject(new Error("Leitor de PDF ainda carregando — tente de novo em 1 segundo."));
    // isEvalSupported:false desliga a avaliação dinâmica dentro do PDF.js. É a
    // defesa recomendada contra a classe de falha do CVE-2024-4367, e continua
    // valendo como cinto de segurança mesmo já estando numa versão corrigida.
    return pdfjsLib.getDocument({
      data: buf,
      isEvalSupported: false,
      disableAutoFetch: true,
      disableRange: true
    }).promise.then(function (pdf) {
      if (pdf.numPages > MAX_PAGINAS) {
        throw new Error("O PDF tem " + pdf.numPages + " páginas (limite: " + MAX_PAGINAS + "). Envie só as páginas do comunicado.");
      }
      var pages = [];
      for (var p = 1; p <= pdf.numPages; p++) pages.push(p);
      return pages.reduce(function (chain, p) {
        return chain.then(function (acc) {
          return pdf.getPage(p).then(function (page) { return page.getTextContent(); }).then(function (tc) {
            var lines = {};
            tc.items.forEach(function (it) {
              if (!it.str || !it.str.trim()) return;
              var y = Math.round(it.transform[5]);
              (lines[y] = lines[y] || []).push({ x: it.transform[4], s: it.str });
            });
            Object.keys(lines).map(Number).sort(function (a, b) { return b - a; }).forEach(function (y) {
              var line = lines[y].sort(function (a, b) { return a.x - b.x; }).map(function (o) { return o.s; }).join(" ");
              acc.push(line);
            });
            return acc;
          });
        });
      }, Promise.resolve([])).then(function (all) { return all.join("\n"); });
    });
  }

  // Word (.docx): converte pra HTML (preserva quebras de linha das células) e daí pra texto.
  function htmlToText(html) {
    return String(html || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|td|tr|h[1-6]|div|li)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
      .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  }
  function docxToText(buf) {
    if (!window.mammoth) return Promise.reject(new Error("Leitor de Word (DOCX) ainda carregando — tente de novo em 1 segundo."));
    return mammoth.convertToHtml({ arrayBuffer: buf }).then(function (res) { return htmlToText(res.value); });
  }

  function onFile(e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    e.target.value = ""; // permite reenviar o mesmo arquivo
    var name = (f.name || "").toLowerCase();
    var isPdf = /\.pdf$/.test(name) || f.type === "application/pdf";
    var isDocx = /\.docx$/.test(name) || f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!isPdf && !isDocx) { alert("Envie um arquivo PDF ou Word (.docx). (Se for outro formato, abra e cole o texto na caixa.)"); return; }
    if (f.size > MAX_ARQUIVO_MB * 1024 * 1024) {
      alert("Arquivo muito grande (" + (f.size / 1048576).toFixed(1) + " MB). O limite é " + MAX_ARQUIVO_MB + " MB.\nSe for um comunicado digitalizado, tente exportar em qualidade menor ou colar o texto na caixa.");
      return;
    }
    setFileStatus("📄 Lendo “" + f.name + "”…");
    var r = new FileReader();
    r.onload = function (ev) {
      if (!assinaturaOk(ev.target.result, isPdf)) {
        setFileStatus("");
        alert("Esse arquivo não é um " + (isPdf ? "PDF" : "Word (.docx)") + " de verdade — o nome diz que é, mas o conteúdo não bate.");
        return;
      }
      var p = comPrazo(
        isPdf ? pdfToText(ev.target.result) : docxToText(ev.target.result),
        MAX_SEGUNDOS,
        isPdf ? "A leitura do PDF" : "A leitura do Word"
      );
      p.then(function (txt) {
        document.getElementById("a-paste").value = txt;
        setFileStatus("✓ Documento lido. Confira os cards abaixo e ajuste o que precisar.");
        doParse();
      }).catch(function (err) {
        setFileStatus("");
        alert("Não consegui ler o arquivo: " + (err && err.message || err) + "\nSe der, abra o comunicado e cole o texto na caixa.");
      });
    };
    r.onerror = function () { setFileStatus(""); alert("Não consegui abrir o arquivo."); };
    r.readAsArrayBuffer(f);
  }

  function renderReview() {
    var host = document.getElementById("a-review");
    if (!draft) { host.innerHTML = ""; return; }
    var tipoNome = draftTipo === "pc" ? "Produção Concreta" : "Provas";
    host.innerHTML = '<div class="abox"><h3>✏️ Revisar — ' + tipoNome + ' (' + draft.items.length + ' itens)</h3>'
      + '<p class="amut">Confira e ajuste. Cada linha em "conteúdos" vira um item do checklist do aluno. Apague o que não for da sua matéria.</p>'
      + '<div id="a-items">' + draft.items.map(itemForm).join("") + '</div>'
      + '<div class="afield"><label>Regras / orientações (' + tipoNome + ')</label><textarea id="a-regras" rows="4">' + esc(draft.regras || "") + '</textarea></div>'
      + '<button class="abtn pub" id="a-pub">✓ Publicar ' + draft.items.length + ' itens na ' + serie + 'ª série (substitui os atuais de ' + tipoNome + ')</button></div>';
    document.getElementById("a-pub").onclick = publish;
  }

  function itemForm(it, i) {
    var catVal = draftTipo === "pc" ? it.mod : it.area;
    var catPh = draftTipo === "pc" ? "Modalidade (ex.: Individual)" : "Área (ex.: Humanas)";
    return '<div class="aitem" data-i="' + i + '">'
      + '<div class="ai-row"><input class="ai-disc" value="' + esc(it.disc) + '" placeholder="Matéria">'
      + '<input class="ai-data" type="date" value="' + esc(it.data) + '">'
      + '<button class="ai-del" onclick="_admDel(' + i + ')" title="remover">✕</button></div>'
      + '<input class="ai-prof" value="' + esc(it.prof) + '" placeholder="Professor(a)">'
      + '<input class="ai-cat" value="' + esc(catVal) + '" placeholder="' + catPh + '">'
      + '<textarea class="ai-topics" rows="3" placeholder="Conteúdos (um por linha)">' + esc((it.topics || []).join("\n")) + '</textarea>'
      + '<input class="ai-note" value="' + esc(it.note) + '" placeholder="Observação (opcional)"></div>';
  }
  window._admDel = function (i) { if (draft && draft.items[i]) { draft.items.splice(i, 1); renderReview(); } };

  function collectDraft() {
    var out = [];
    document.querySelectorAll("#a-items .aitem").forEach(function (el) {
      var disc = el.querySelector(".ai-disc").value.trim(); if (!disc) return;
      var o = {
        disc: disc, data: el.querySelector(".ai-data").value || "",
        prof: el.querySelector(".ai-prof").value.trim(),
        topics: el.querySelector(".ai-topics").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean),
        note: el.querySelector(".ai-note").value.trim()
      };
      var cat = el.querySelector(".ai-cat").value.trim();
      if (draftTipo === "pc") o.mod = cat; else o.area = cat;
      out.push(o);
    });
    return out;
  }

  /* O Firestore limita cada batch a 500 operações. Divide a lista em lotes e
     commita em sequência, pra publicar/apagar nunca falhar por volume. */
  var BATCH_MAX = 450; // margem: sobra espaço p/ o doc de regras no último lote
  function commitEmLotes(ops) {
    var lotes = [];
    for (var i = 0; i < ops.length; i += BATCH_MAX) lotes.push(ops.slice(i, i + BATCH_MAX));
    return lotes.reduce(function (chain, lote) {
      return chain.then(function () {
        var batch = db.batch();
        lote.forEach(function (op) { op(batch); });
        return batch.commit();
      });
    }, Promise.resolve());
  }

  function publish() {
    var items = collectDraft();
    if (!items.length) { alert("Nada para publicar."); return; }
    var tipoNome = draftTipo === "pc" ? "Produção Concreta" : "Provas";
    if (!confirm("Publicar " + items.length + " itens de " + tipoNome + " na " + serie + "ª série?\nIsso SUBSTITUI os itens atuais dessa categoria.")) return;
    var coll = base().collection(draftTipo);
    coll.get().then(function (q) {
      var ops = [];
      q.docs.forEach(function (d) { ops.push(function (b) { b.delete(d.ref); }); });
      items.forEach(function (it) { ops.push(function (b) { b.set(coll.doc(), it); }); });
      var reg = (document.getElementById("a-regras") || {}).value || "";
      ops.push(function (b) { b.set(base().collection("meta").doc("regras"), draftTipo === "pc" ? { pc: reg } : { provas: reg }, { merge: true }); });
      return commitEmLotes(ops);
    }).then(function () {
      alert("✅ Publicado! Os alunos da " + serie + "ª série já veem o novo calendário de " + tipoNome + ".");
      draft = null; render();
    }).catch(function (e) { alert("Erro ao publicar: " + (e && e.message || e)); });
  }

  function loadPublished() {
    var host = document.getElementById("a-published"); if (!host) return;
    Promise.all([base().collection("provas").get(), base().collection("pc").get()]).then(function (res) {
      function list(q) {
        if (q.empty) return '<p class="amut">— nada publicado —</p>';
        return q.docs.map(function (d) { return d.data(); }).sort(function (a, b) { return (a.data || "").localeCompare(b.data || ""); })
          .map(function (it) { return '<div class="apub-row">' + esc(it.data || "sem data") + ' · <b>' + esc(it.disc) + '</b></div>'; }).join("");
      }
      host.innerHTML = '<div class="abox"><h3>📌 Publicado agora na ' + serie + 'ª série</h3>'
        + '<div class="apub-grid"><div><h4>Provas (' + res[0].size + ')</h4>' + list(res[0]) + '</div>'
        + '<div><h4>Produção Concreta (' + res[1].size + ')</h4>' + list(res[1]) + '</div></div>'
        + '<button class="abtn danger" id="a-clear">Apagar TODO o conteúdo da ' + serie + 'ª série</button></div>';
      document.getElementById("a-clear").onclick = clearAll;
    }).catch(function () { host.innerHTML = '<div class="abox"><p class="amut">Não consegui carregar o conteúdo publicado.</p></div>'; });
  }

  function clearAll() {
    if (!confirm("Apagar TODO o conteúdo (provas + produções) da " + serie + "ª série?")) return;
    Promise.all([base().collection("provas").get(), base().collection("pc").get()]).then(function (res) {
      var ops = res[0].docs.concat(res[1].docs).map(function (d) { return function (b) { b.delete(d.ref); }; });
      return commitEmLotes(ops);
    }).then(function () { alert("Conteúdo apagado."); loadPublished(); }).catch(function (e) { alert("Erro: " + (e && e.message || e)); });
  }
})();
