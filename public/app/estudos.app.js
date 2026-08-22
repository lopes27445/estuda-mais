
/* ============================ DADOS BASE ============================ */
// "Hoje" dinâmico: usa a data REAL do computador (ver hojeMidnight), então os
// contadores "faltam X dias / amanhã / hoje / venceu" se atualizam sozinhos a cada dia.

/* Provas do 3º Bimestre · AV1 (17 a 31/08/2026) — Calendário oficial COC Atibaia */
const PROVAS = [
  { id:"pr-ing", disc:"Inglês", data:"2026-08-17", area:"Linguagens", prof:"Profa. Elen",
    topics:["Livro único · Mód. 8 e 9 — Present Tenses","Simple Present","Present Continuous","Present Perfect","Present Perfect Continuous"]},
  { id:"pr-hist", disc:"História", data:"2026-08-18", area:"Humanas", prof:"Prof. Daniel",
    topics:["Frente 62 · Livros 4 e 5 · Mód. 10 a 13","Tema — Período Regencial","Tema — Segundo Reinado"]},
  { id:"pr-fis", disc:"Física", data:"2026-08-19", area:"Natureza", prof:"Profs. Medina e Bruno BB",
    topics:["Frente 1 (Medina) · Livro 5 · Mód. 27–30 — Dinâmica","Frente 2 (Bruno BB) · Livro 4 · Mód. 23 e 24 — Geradores Elétricos","Frente 2 (Bruno BB) · Livro 5 · Mód. 25 e 26 — Receptores Elétricos","Frente 3 (Bruno BB) · Livro 5 · Mód. 15 — Ondulatória"]},
  { id:"pr-gram", disc:"Gramática", data:"2026-08-20", area:"Linguagens", prof:"Profa. Vanessa",
    topics:["Livro 5 · Mód. 13 — Frase, período e oração","Livro 5 · Mód. 14 — Termos da oração: estrutura e classificação"]},
  { id:"pr-filo", disc:"Filosofia", data:"2026-08-21", area:"Humanas", prof:"Prof. Bruno Rudã",
    topics:["Livro 4 · Mód. 11 e 12","Maquiavel (estudar também o material extra do professor)","Hobbes, Locke e Rousseau — Contratualismo","A transição da filosofia política na baixa Idade Média para a modernidade"]},
  { id:"pr-mat2", disc:"Matemática 2", data:"2026-08-24", area:"Matemática", prof:"Frente 2 · Prof. Gabriel",
    topics:["Frente 2 (Gabriel) · Livro 6 · Mód. 32–34","Equações trigonométricas em R","Funções trigonométricas"]},
  { id:"pr-geo", disc:"Geografia", data:"2026-08-25", area:"Humanas", prof:"Prof. Josias",
    topics:["Frente 171 · Livro 4 · Mód. 21 — O sistema capitalista","Frente 171 · Livro 4 · Mód. 22 — Geografia e Indústria","Frente 171 · Livro 4 · Mód. 23 — A nova geografia industrial","Frente 171 · Livro 4 · Mód. 24 — Industrialização brasileira"]},
  { id:"pr-qui", disc:"Química", data:"2026-08-26", area:"Natureza", prof:"Profs. Marcus e Felipe",
    topics:["Frente 1 (Marcus) · Livro 4 · Mód. 20–24 — Ácidos e Bases de Arrhenius","Frente 2 (Marcus) · Livro 4 · Mód. 20 — Leis Ponderais","Frente 3 (Felipe) · Livro 4 Mód. 14 e Livro 5 Mód. 15 — Isomeria plana (função, cadeia e posição)"]},
  { id:"pr-lit", disc:"Literatura", data:"2026-08-27", area:"Linguagens", prof:"Profa. Juliana",
    topics:["Livros 3 e 4 · Mód. 13 — Vanguardas e Semana de Arte Moderna","Mód. 15 — Fernando Pessoa","Mód. 16 — Pré-Modernismo","Mód. 17 e 18 — 1ª Geração Moderna"]},
  { id:"pr-mat13", disc:"Matemática 1 e 3", data:"2026-08-28", area:"Matemática", prof:"Prof. Zell", note:"Frente 13 (Zell): módulos e temas não especificados no comunicado — confirmar com o professor.",
    topics:["Frente 11 · Livros 4 e 5 · Mód. 21–26 — Função do 2º grau e Inequações","Frente 13 — módulos/temas a confirmar"]},
  { id:"pr-bio", disc:"Biologia", data:"2026-08-31", area:"Natureza", prof:"Profs. Brunna e Fabiano",
    topics:["Frente 1 (Brunna) · Livros 4 e 5 · Mód. 20–26 — Núcleo celular, replicação, transcrição e tradução","Frente 2 (Brunna) · Livro 5 · Mód. 25–27 — Protocordados, agnatos e anfíbios","Frente 3 (Fabiano) · Livros 4 e 5 · Mód. 12 e 13 — Biomas Brasileiros"]},
  { id:"pr-red", disc:"Redação", data:"2026-08-27", area:"Linguagens", prof:"Prof. Ademir", note:"Envio da foto da redação manuscrita na Redação Online — 27 e 28/08.",
    topics:["Texto dissertativo-argumentativo modelo ENEM (com proposta de intervenção)","Estudar pelos materiais e slides do professor — portal Jornada COC"]},
];

/* Produção Concreta do 3º Bimestre 2026 — Calendário oficial COC Atibaia (Turmas A/B).
   Química e Inglês têm entregas em datas diferentes → viram cards separados por entrega. */
const PC = [
  { id:"pc-qui1", disc:"Química", data:"2026-08-14", mod:"Individual", prof:"Frente 1 · Prof. Marcus",
    desc:"1ª entrega (de 4) · exercícios ENEM",
    topics:["5 exercícios ENEM de cada módulo trabalhado no período"]},
  { id:"pc-ing-txt", disc:"Inglês", data:"2026-08-17", mod:"Individual / grupo", prof:"Profa. Elen",
    desc:"Projeto “COC Global Times” — entrega de textos (Grupos A/B/D)",
    topics:["Continuidade do projeto COC Global Times","Textos conforme os temas da proposta oficial (Jornada COC)"]},
  { id:"pc-qui2", disc:"Química", data:"2026-08-28", mod:"Individual", prof:"Frente 1 · Prof. Marcus",
    desc:"2ª entrega (de 4) · exercícios ENEM",
    topics:["5 exercícios ENEM de cada módulo trabalhado no período"]},
  { id:"pc-filo", disc:"Filosofia", data:"2026-08-31", mod:"Individual", prof:"Prof. Bruno",
    topics:["Texto crítico-reflexivo a partir de uma pesquisa","Tema relacionado aos filósofos estudados no bimestre (Maquiavel, Hobbes, Locke, Rousseau)"]},
  { id:"pc-socio", disc:"Sociologia", data:"2026-09-08", mod:"Individual", prof:"Prof. Barbosa",
    desc:"Pergunta para pesquisa",
    topics:["Pesquisar: quais são as principais funções do Estado e como elas contribuem para a organização da sociedade?"]},
  { id:"pc-hist", disc:"História", data:"2026-09-10", mod:"Individual · online", prof:"Prof. Daniel",
    topics:["Exercícios na Plataforma COC","Frente 62 · Módulos 10 a 13","Frente 61 · Módulos 30 e 31 — Revolução Industrial"]},
  { id:"pc-mat", disc:"Matemática", data:"2026-09-10", mod:"Grupo (até 5)", prof:"Frentes 1, 2 e 3 · Profs. Zell e Gabriel",
    topics:["Correção da parte de Matemática dos últimos 5 anos do ENEM","Questões + resoluções comentadas e analisadas","Pode incluir outro ano pertinente aos seus estudos"]},
  { id:"pc-red", disc:"Redação", data:"2026-09-10", mod:"Individual", prof:"Profa. Ademir",
    topics:["3 textos dissertativo-argumentativos modelo ENEM (com proposta de intervenção)","Entregas semanais — última proposta em 10/09"]},
  { id:"pc-geo", disc:"Geografia", data:"2026-09-11", mod:"Individual · online", prof:"Prof. Josias",
    note:"Entregas fora do prazo NÃO serão aceitas.",
    topics:["Lista de exercícios — Jornada COC","Livro 04 · Frente 171","Mód. 21 — O sistema capitalista","Mód. 22 — Geografia e Indústria","Mód. 23 — A nova geografia industrial","Mód. 24 — Industrialização brasileira"]},
  { id:"pc-fis", disc:"Física", data:"2026-09-11", mod:"Individual", prof:"Frentes 1 e 2 · Profs. Bruno BB e Medina",
    topics:["Lista de exercícios"]},
  { id:"pc-lit", disc:"Literatura", data:"2026-09-11", mod:"Individual · online", prof:"Profa. Juliana",
    topics:["Lista de exercícios na Plataforma COC (online)"]},
  { id:"pc-bio", disc:"Biologia", data:"2026-09-11", mod:"Individual · online", prof:"Frentes 1 e 2 · Profs. Brunna e Fabiano",
    topics:["Lista de exercícios no Portal COC","Conteúdos das frentes de Biologia (ficha de produção concreta)"]},
  { id:"pc-qui3", disc:"Química", data:"2026-09-11", mod:"Individual / grupo", prof:"Frente 2 · Prof. Felipe",
    desc:"3ª entrega (de 4) · exercícios ENEM",
    topics:["5 exercícios ENEM de cada módulo trabalhado no período"]},
  { id:"pc-ing-ed", disc:"Inglês", data:"2026-09-14", mod:"Grupo", prof:"Profa. Elen",
    desc:"“COC Global Times” — Editorial (Grupo C)",
    topics:["Editorial do jornal digital","Entrega via e-mail + pasta com os trabalhos da sala"]},
  { id:"pc-qui4", disc:"Química", data:"2026-09-25", mod:"Individual / grupo", prof:"Frente 2 · Prof. Felipe",
    desc:"4ª entrega (de 4) · exercícios ENEM",
    topics:["5 exercícios ENEM de cada módulo trabalhado no período"]},
];

/* ============================ ESTADO ============================ */
const KEY="painel-estudos-3em-3bim-2026";
const KEY_PREV="painel-estudos-3em-2bim-2026"; // bimestre anterior — só p/ herdar o histórico
let state = load();
let view="provas", showDone=false;
const ui={open:{}, openNotes:{}, openMural:{}};

function load(){
  let raw={}; try{ raw=JSON.parse(localStorage.getItem(KEY)||"{}"); }catch(e){ raw={}; }
  // Virada de bimestre: se este bimestre ainda não tem estado próprio, herda SÓ o histórico
  // acumulado (Vestibular, config do Pomodoro e tempo estudado). Provas/PC/planejador começam zerados.
  if(!localStorage.getItem(KEY) && localStorage.getItem(KEY_PREV)){
    try{
      const prev=JSON.parse(localStorage.getItem(KEY_PREV)||"{}");
      raw={v:2, vest:prev.vest||{}, pomo:prev.pomo||{}, study:prev.study||{}};
    }catch(e){ raw={}; }
  }
  if(raw && raw.v===2) return normalize(raw);
  // migração do formato antigo {id:{done,studied}}
  const items={};
  Object.keys(raw||{}).forEach(k=>{ const v=raw[k]; if(v&&typeof v==="object"&&("done"in v||"studied"in v)) items[k]={done:!!v.done,studied:v.studied||[],notes:"",links:[]}; });
  return normalize({v:2, items});
}
function normalize(s){
  s.v=2; s.items=s.items||{}; s.custom=s.custom||[]; s.overrides=s.overrides||{};
  s.hidden=s.hidden||[]; s.study=s.study||{}; s.pomo=s.pomo||{}; if(!s.pomo.focus) s.pomo.focus=25;
  s.plan=s.plan||{}; if(s.plan.available==null) s.plan.available=120; s.plan.manual=s.plan.manual||[]; s.plan.start=s.plan.start||"";
  s.vest=s.vest||{}; s.vest.metas=s.vest.metas||[]; s.vest.simulados=s.vest.simulados||[]; s.vest.dias=s.vest.dias||{}; s.vest.provas=s.vest.provas||[]; s.vest.exercicios=s.vest.exercicios||[];
  return s;
}
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function st(id){ if(!state.items[id]) state.items[id]={done:false,studied:[],notes:"",links:[]}; const o=state.items[id]; o.studied=o.studied||[]; o.links=o.links||[]; if(o.notes==null)o.notes=""; return o; }

/* ============================ HELPERS ============================ */
function esc(s){ return (s==null?"":""+s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function fmtData(iso){ if(!iso) return "--"; const p=iso.split("-"); return p[2]+"/"+p[1]; }
function hojeMidnight(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
function diasFalta(iso){ const p=iso.split("-").map(Number); const a=new Date(p[0],p[1]-1,p[2]); a.setHours(0,0,0,0); return Math.round((a-hojeMidnight())/864e5); }
function urgencia(d){
  if(d<0) return {cls:"past",card:"u-green",txt:"venceu"};
  if(d===0) return {cls:"red",card:"u-red",txt:"é HOJE"};
  if(d===1) return {cls:"red",card:"u-red",txt:"amanhã"};
  if(d<=3) return {cls:"orange",card:"u-orange",txt:"faltam "+d+" dias"};
  if(d<=6) return {cls:"gold",card:"u-gold",txt:"faltam "+d+" dias"};
  return {cls:"green",card:"",txt:"faltam "+d+" dias"};
}
function diasLabel(iso){ const d=diasFalta(iso); return d<0?"venceu":d===0?"hoje":d===1?"amanhã":"em "+d+" dias"; }
// Estuda+: usa o conteúdo PUBLICADO no admin (Firestore) para a série do aluno.
// Se ainda não há publicação: 3ª série cai no calendário hardcoded (legado); as
// outras séries ficam vazias ("em breve os professores lançam").
function builtin(v){
  if(window._RPROVAS!==undefined) return v==="provas" ? (window._RPROVAS||[]) : (window._RPC||[]);
  if(window.EP && String(window.EP.serie)!=="3") return [];
  return v==="provas"?PROVAS:PC;
}
// carrega provas/PC/regras publicados da série antes de renderizar
function loadSerieContent(done){
  if(!(window.Cloud && Cloud.firestore && window.EP)){ done(); return; }
  var db=Cloud.firestore(), serie=String(window.EP.serie);
  var base=db.collection("schools").doc(Cloud.school()).collection("series").doc(serie);
  Promise.all([ base.collection("provas").get(), base.collection("pc").get(), base.collection("meta").doc("regras").get() ])
   .then(function(res){
     var pv=res[0].docs.map(function(d){var o=d.data(); o.id=d.id; return o;});
     var pc=res[1].docs.map(function(d){var o=d.data(); o.id=d.id; return o;});
     if(pv.length||pc.length){ window._RPROVAS=pv; window._RPC=pc; }
     window._REGRAS = res[2].exists ? res[2].data() : null;
     done();
   }).catch(function(){ done(); });
}
function allItems(v){
  const hid=new Set(state.hidden);
  const base=builtin(v).filter(i=>!hid.has(i.id)).map(i=>Object.assign({_builtin:true,kind:v},i,state.overrides[i.id]||{}));
  const cust=state.custom.filter(c=>c.kind===v).map(c=>Object.assign({_builtin:false},c));
  return base.concat(cust);
}
function disciplinas(){ const s=new Set(); allItems("provas").forEach(i=>s.add(i.disc)); allItems("pc").forEach(i=>s.add(i.disc)); return [...s].sort(); }
function clampFocus(f){ f=parseInt(f)||25; return Math.max(5,Math.min(120,f)); }
function shortBreak(f){ return Math.max(3,Math.min(20,Math.round(f/5))); }
function longBreak(f){ return Math.max(10,Math.min(40,Math.round(f/5*3))); }

/* ============================ CARD ============================ */
function cardHTML(item, view){
  const s=st(item.id), d=diasFalta(item.data), u=urgencia(d);
  const topics=item.topics||[]; const total=topics.length;
  const feitos=Math.min(s.studied.length,total);
  const pct=total?Math.round(feitos/total*100):(s.done?100:0);
  const done=s.done;
  const tags=(view==="provas"?`<span class="tag area">${esc(item.area||"")}</span>`:`<span class="tag">${esc(item.mod||"")}</span>`)
    +(item._builtin?"":`<span class="tag custom">criado por você</span>`);
  const note=item.note?`<div class="meta" style="color:var(--gold)">⚠ ${esc(item.note)}</div>`:"";
  const desc=item.desc?`<div class="meta">${esc(item.desc)}</div>`:"";
  const topicsHTML=topics.map((t,i)=>{const ck=s.studied.includes(i);return `<div class="topic ${ck?'checked':''}" onclick="toggleTopic('${item.id}',${i},event)"><span class="box">${ck?'✓':''}</span><span>${esc(t)}</span></div>`;}).join("");
  const studyLabel=view==="provas"?"estudado":"feito";
  const pwrap = total?`<div class="pwrap"><div class="pbar"><i style="width:${pct}%"></i></div><div class="pnum">${feitos}/${total} ${studyLabel}</div></div>`:"";

  return `<div class="card ${u.card} ${done?'done':''}" id="card-${item.id}">
    <div class="crow">
      <div><div class="disc">${esc(item.disc)}</div><div class="meta">${esc(item.prof||"")}</div><div>${tags}</div></div>
      <div class="date"><div class="d">${fmtData(item.data)}</div><div class="left ${u.cls}">${done?'concluído':u.txt}</div></div>
    </div>
    ${desc}${note}${pwrap}
    <div class="panel" id="topics-${item.id}">${topicsHTML||'<div class="meta">Sem itens cadastrados.</div>'}</div>
    <div class="panel notes" id="notes-${item.id}">
      <textarea placeholder="Anotações, dúvidas, dicas do professor..." oninput="onNote('${item.id}',this)">${esc(s.notes)}</textarea>
      <div class="linklist" id="links-${item.id}">${linksHTML(item.id)}</div>
      <div class="linkform">
        <input class="url" id="lu-${item.id}" placeholder="colar link (vídeo, PDF, site)...">
        <input class="lbl" id="ll-${item.id}" placeholder="nome (opcional)">
        <button class="btn cyan small" onclick="addLink('${item.id}')">+ link</button>
      </div>
    </div>
    <div class="panel notes mural" id="mural-${item.id}"></div>
    <div class="actions">
      ${done?`<button class="btn reopen" onclick="reopen('${item.id}')">↩ Reabrir</button>`:`<button class="btn done" onclick="conclude('${item.id}')">✓ Concluir</button>`}
      ${total?`<button class="btn toggle" onclick="togglePanel('topics','${item.id}')">☰ ${view==='provas'?'Conteúdos':'Etapas'}</button>`:""}
      <button class="btn toggle" onclick="togglePanel('notes','${item.id}')">📝 Notas${(s.links.length||s.notes)?' •':''}</button>
      <button class="btn toggle" onclick="muralToggle('${item.id}')">🧲 Mural</button>
      <div class="spacer"></div>
      <button class="iconbtn" title="Editar" onclick="openEdit('${view}','${item.id}')">✎</button>
      <button class="iconbtn" title="Excluir" onclick="del('${view}','${item.id}',${item._builtin})">🗑</button>
    </div>
  </div>`;
}
function linksHTML(id){
  return st(id).links.map((l,i)=>`<span class="chip"><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label||l.url)}</a><button onclick="rmLink('${id}',${i})" title="remover">×</button></span>`).join("");
}

/* ============================ RENDER ============================ */
function render(){
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===view));
  updateStats(); renderHighlight();
  const c=document.getElementById("content");
  if(view==="provas"||view==="pc") c.innerHTML=listView(view);
  else if(view==="planejador") c.innerHTML=plannerView();
  else if(view==="foco"){ c.innerHTML=focoView(); refreshTimerUI(); refreshStudyBars(); }
  if(view==="provas"||view==="pc"){
    Object.keys(ui.open).forEach(id=>{const e=document.getElementById("topics-"+id); if(e&&ui.open[id])e.classList.add("open");});
    Object.keys(ui.openNotes).forEach(id=>{const e=document.getElementById("notes-"+id); if(e&&ui.openNotes[id])e.classList.add("open");});
    Object.keys(ui.openMural).forEach(id=>{const e=document.getElementById("mural-"+id); if(e&&ui.openMural[id]){e.classList.add("open"); muralLoad(id);}});
  }
}
function listView(view){
  const data=allItems(view).sort((a,b)=>(a.data||"").localeCompare(b.data||""));
  if(window.EP && String(window.EP.serie)!=="3" && data.length===0){
    return `<div class="empty" style="margin-top:16px;padding:26px">📚 O calendário da <b>${window.EP.serie}ª série</b> ainda não foi lançado.<br><span class="muted">Em breve os professores publicam as provas e produções aqui pelo Estuda+. Você já pode usar o Planejador e o Pomodoro normalmente — e o Painel Vestibular funciona à parte.</span></div>`;
  }
  const pend=data.filter(i=>!st(i.id).done), done=data.filter(i=>st(i.id).done);
  let h="";
  if(window._REGRAS && window._REGRAS[view]){
    h+=`<details style="background:linear-gradient(180deg,var(--card),var(--card2));border:1px solid var(--line);border-left:4px solid var(--gold);border-radius:12px;padding:12px 15px;margin-bottom:14px">
      <summary style="cursor:pointer;font-weight:700;color:var(--gold)">📋 Regras e orientações (${view==="provas"?"provas":"produções"})</summary>
      <div style="color:var(--txt);font-size:.86rem;line-height:1.6;margin-top:10px">${esc(window._REGRAS[view]).replace(/\n/g,"<br>")}</div></details>`;
  }
  h+=`<div class="toolbar"><h2>${view==="provas"?"Provas":"Produções"} pendentes — por data mais próxima</h2>
    <button class="btn ghost small" onclick="toggleShowDone()">${showDone?"Ocultar":"Mostrar"} concluídos (${done.length})</button></div>`;
  h+=`<div class="grid">${pend.length?pend.map(i=>cardHTML(i,view)).join(""):'<div class="empty">🎉 Nada pendente aqui!</div>'}</div>`;
  if(showDone) h+=`<div class="section-done"><div class="toolbar"><h2>✅ Concluídos</h2></div><div class="grid">${done.length?done.map(i=>cardHTML(i,view)).join(""):'<div class="empty">Nada concluído ainda.</div>'}</div></div>`;
  return h;
}
function streakBadge(){
  const n=calcStreak();
  if(!n) return "";
  return `<div class="streak" title="${n} dia(s) seguidos estudando">🔥 ${n}</div>`;
}
function updateStats(){
  const sb=document.getElementById("s-streak"); if(sb) sb.innerHTML=streakBadge();
  const pp=allItems("provas").filter(i=>!st(i.id).done).length, pc=allItems("pc").filter(i=>!st(i.id).done).length;
  setT("s-provas",pp); setT("s-pc",pc); setT("b-provas",pp); setT("b-pc",pc);
  let tot=0,f=0; allItems("provas").forEach(i=>{const t=(i.topics||[]).length; tot+=t; f+=Math.min(st(i.id).studied.length,t);});
  const pct=tot?Math.round(f/tot*100):0; setT("s-prog",pct+"%"); document.getElementById("s-progbar").style.width=pct+"%";
  const all=[...allItems("provas"),...allItems("pc")].filter(i=>!st(i.id).done).sort((a,b)=>(a.data||"").localeCompare(b.data||""));
  const n=all.find(i=>diasFalta(i.data)>=0)||all[0];
  setT("s-next", n?`${n.disc} · ${fmtData(n.data)} (${urgencia(diasFalta(n.data)).txt})`:"tudo feito ✅");
}
function setT(id,v){const e=document.getElementById(id); if(e)e.textContent=v;}

/* ============================ PRIORIDADE / FOCO AGORA ============================ */
function pendingForPlan(){
  const list=[];
  allItems("provas").forEach(i=>{const s=st(i.id); if(s.done)return; const tot=(i.topics||[]).length; const left=tot-Math.min(s.studied.length,tot); if(tot>0&&left<=0)return; list.push({item:i,kind:"provas",left:Math.max(left,1)});});
  allItems("pc").forEach(i=>{const s=st(i.id); if(s.done)return; const tot=(i.topics||[]).length||1; const left=tot-Math.min(s.studied.length,tot); list.push({item:i,kind:"pc",left:Math.max(left,1)});});
  return list;
}
function planWeight(e){ const d=diasFalta(e.item.data); const dd=d<0?0:d; return (1/(dd+1))*e.left; }
function reason(e){ const lbl=diasLabel(e.item.data); return e.kind==="provas"?`prova ${lbl} · ${e.left} módulo(s) a estudar`:`entrega ${lbl}${e.left>1?` · ${e.left} etapas`:""}`; }
function renderHighlight(){
  const box=document.getElementById("focus-now");
  const cand=pendingForPlan().map(e=>({...e,w:planWeight(e)})).sort((a,b)=>b.w-a.w);
  if(!cand.length){box.classList.add("hide");return;}
  box.classList.remove("hide");
  const top=cand.slice(0,3).map(e=>`<b>${esc(e.item.disc)}</b> <span class="muted">(${reason(e)})</span>`).join(" &nbsp;·&nbsp; ");
  box.innerHTML=`<div class="fn-title">🎯 Foco agora</div><div class="fn-body">${top}</div><button class="btn gold small" onclick="setView('planejador')">🗓️ Montar plano do dia</button>`;
}

/* ============================ AÇÕES DE CARD ============================ */
function setView(v){view=v;render();}
function toggleShowDone(){showDone=!showDone;render();}
function togglePanel(kind,id){const map=kind==="topics"?ui.open:ui.openNotes; map[id]=!map[id]; const e=document.getElementById(kind+"-"+id); if(e)e.classList.toggle("open",!!map[id]);}

/* ---------- Mural de materiais (compartilhado com a turma) ---------- */
function muralToggle(id){
  ui.openMural[id]=!ui.openMural[id];
  const e=document.getElementById("mural-"+id); if(!e)return;
  e.classList.toggle("open",!!ui.openMural[id]);
  if(ui.openMural[id]) muralLoad(id);
}
function muralShell(id, inner){
  return `<div style="font-size:.82rem;color:var(--mut);margin-bottom:8px">🧲 Materiais que a turma compartilhou aqui — <b>todo mundo vê</b>.</div>
    <div id="mural-list-${id}">${inner}</div>
    <div class="linkform" style="margin-top:8px">
      <input class="url" id="mu-url-${id}" placeholder="colar link de material (PDF, vídeo, resumo)...">
      <input class="lbl" id="mu-lbl-${id}" placeholder="nome (opcional)">
      <button class="btn cyan small" onclick="muralAdd('${id}','link')">+ material</button>
    </div>
    <div class="linkform" style="margin-top:6px">
      <input class="url" id="mu-txt-${id}" placeholder="ou deixe uma dica/recado pra turma...">
      <button class="btn toggle small" onclick="muralAdd('${id}','texto')">+ recado</button>
    </div>`;
}
function muralLoad(id){
  const e=document.getElementById("mural-"+id); if(!e)return;
  if(!e.dataset.init){ e.innerHTML=muralShell(id,'<div class="meta">Carregando…</div>'); e.dataset.init="1"; }
  if(!(window.Cloud&&Cloud.mural)){ const l=document.getElementById("mural-list-"+id); if(l)l.innerHTML='<div class="meta">Entre na sua conta para ver o mural.</div>'; return; }
  Cloud.mural.list(id).then(posts=>{
    const l=document.getElementById("mural-list-"+id); if(l)l.innerHTML=muralPostsHTML(id,posts);
  }).catch(()=>{
    const l=document.getElementById("mural-list-"+id); if(l)l.innerHTML='<div class="meta">Não consegui carregar agora (sem conexão?). Tente reabrir.</div>';
  });
}
function muralPostsHTML(id,posts){
  if(!posts.length) return '<div class="meta">Ninguém postou material aqui ainda. Seja o primeiro! 🚀</div>';
  const myUid=Cloud.mural.myUid();
  return posts.map(p=>{
    const mine=p.uid===myUid;
    const del=mine?`<button onclick="muralRemove('${id}','${p.id}')" title="remover" style="background:none;border:none;color:var(--mut);cursor:pointer;font-size:.9rem;line-height:1">×</button>`:"";
    if(p.tipo==="link"){
      const url=safeUrl(p.url)||"#";
      return `<span class="chip" style="margin:0 6px 6px 0"><a href="${esc(url)}" target="_blank" rel="noopener">${esc(p.label||p.url)}</a><span style="color:var(--mut);font-size:.72rem">· ${esc(p.nome||"aluno")}</span>${del}</span>`;
    }
    return `<div style="background:var(--surface);border:1px solid var(--line);border-radius:9px;padding:8px 10px;margin-bottom:6px;font-size:.85rem;display:flex;gap:8px;align-items:flex-start">
      <span style="flex:1">${esc(p.texto)} <span style="color:var(--mut);font-size:.72rem">— ${esc(p.nome||"aluno")}</span></span>${del}</div>`;
  }).join("");
}
function muralAdd(id,tipo){
  if(!(window.Cloud&&Cloud.mural)) return;
  let post;
  if(tipo==="link"){
    const uEl=document.getElementById("mu-url-"+id), lEl=document.getElementById("mu-lbl-"+id);
    const url=safeUrl(uEl.value); if(!url){uEl.style.borderColor="var(--red)";return;}
    post={tipo:"link", url, label:(lEl.value||"").trim()};
  } else {
    const tEl=document.getElementById("mu-txt-"+id); const texto=(tEl.value||"").trim();
    if(!texto){tEl.style.borderColor="var(--red)";return;}
    post={tipo:"texto", texto:texto.slice(0,400)};
  }
  Cloud.mural.add(id,post).then(()=>{
    ["mu-url-","mu-lbl-","mu-txt-"].forEach(p=>{const el=document.getElementById(p+id); if(el){el.value="";el.style.borderColor="";}});
    muralLoad(id);
  }).catch(()=>alert("Não consegui postar agora. Tente de novo."));
}
function muralRemove(id,postId){
  if(!confirm("Remover este material do mural?"))return;
  Cloud.mural.remove(id,postId).then(()=>muralLoad(id)).catch(()=>alert("Não consegui remover agora."));
}
function toggleTopic(id,idx,ev){ev.stopPropagation(); const s=st(id); const i=s.studied.indexOf(idx); if(i>=0)s.studied.splice(i,1); else s.studied.push(idx); save(); render();}
function conclude(id){st(id).done=true;save();render();}
function reopen(id){st(id).done=false;save();render();}
function onNote(id,el){st(id).notes=el.value;save();}
function safeUrl(u){u=(u||"").trim(); if(!u)return""; if(/^javascript:/i.test(u))return""; if(!/^https?:\/\//i.test(u)){ if(/^[\w.-]+\.\w/.test(u)) u="https://"+u; else return ""; } return u;}
function addLink(id){const uEl=document.getElementById("lu-"+id),lEl=document.getElementById("ll-"+id); const url=safeUrl(uEl.value); if(!url){uEl.style.borderColor="var(--red)";return;} st(id).links.push({url,label:(lEl.value||"").trim()}); save(); uEl.value="";lEl.value=""; document.getElementById("links-"+id).innerHTML=linksHTML(id);}
function rmLink(id,i){st(id).links.splice(i,1);save();document.getElementById("links-"+id).innerHTML=linksHTML(id);}

/* ============================ ADD / EDIT / DELETE ============================ */
let formCtx=null;
let simRows=[];
function openAdd(){openForm({mode:"add",view:(view==="pc"?"pc":"provas")});}
function openEdit(v,id){const it=allItems(v).find(x=>x.id===id); openForm({mode:"edit",view:v,id,it});}
function openForm(opt){
  formCtx=opt; const it=opt.it||{};
  const kind=opt.mode==="edit"?(it.kind||opt.view):opt.view;
  const cat=kind==="provas"?(it.area||""):(it.mod||"");
  const lockKind=opt.mode==="edit"&&it._builtin;
  document.getElementById("modal-root").innerHTML=`<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="modal">
    <h3>${opt.mode==="add"?"Adicionar item":"Editar item"}</h3>
    <div class="field"><label>Tipo</label><div class="radio-row">
      <label><input type="radio" name="f-kind" value="provas" ${kind==="provas"?"checked":""} ${lockKind?"disabled":""}> 📝 Prova</label>
      <label><input type="radio" name="f-kind" value="pc" ${kind==="pc"?"checked":""} ${lockKind?"disabled":""}> 📦 Produção</label>
    </div></div>
    <div class="field"><label>Disciplina *</label><input id="f-disc" value="${esc(it.disc||"")}" placeholder="Ex.: Geografia"></div>
    <div class="field"><label>Data de entrega/prova *</label><input id="f-data" type="date" value="${esc(it.data||"")}"></div>
    <div class="field"><label>Professor</label><input id="f-prof" value="${esc(it.prof||"")}" placeholder="Ex.: Prof. Josias"></div>
    <div class="field"><label>Área (prova) / Modalidade (produção)</label><input id="f-cat" value="${esc(cat)}" placeholder="Ex.: Humanas  /  Individual"></div>
    <div class="field"><label>Descrição (opcional)</label><input id="f-desc" value="${esc(it.desc||"")}" placeholder="Breve descrição do trabalho"></div>
    <div class="field"><label>Conteúdos / Etapas — um por linha</label><textarea id="f-topics" placeholder="Módulo 1...&#10;Módulo 2...">${esc((it.topics||[]).join("\n"))}</textarea></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn done" onclick="saveForm()">Salvar</button>
    </div>
  </div></div>`;
}
function closeModal(){document.getElementById("modal-root").innerHTML="";formCtx=null;}
function val(id){return (document.getElementById(id).value||"").trim();}
function saveForm(){
  const disc=val("f-disc"), data=val("f-data");
  if(!disc||!data){alert("Preencha pelo menos Disciplina e Data.");return;}
  const kindSel=document.querySelector('input[name=f-kind]:checked').value;
  const topics=val("f-topics").split("\n").map(s=>s.trim()).filter(Boolean);
  const obj={disc,data,prof:val("f-prof"),desc:val("f-desc"),topics};
  if(kindSel==="provas")obj.area=val("f-cat"); else obj.mod=val("f-cat");
  const o=formCtx;
  if(o.mode==="add"){ obj.id="u-"+Date.now(); obj.kind=kindSel; state.custom.push(obj); }
  else if(o.it._builtin){ state.overrides[o.id]=Object.assign({},state.overrides[o.id],obj); }
  else { const c=state.custom.find(x=>x.id===o.id); if(c)Object.assign(c,obj,{kind:kindSel}); }
  save(); closeModal(); render();
}
function del(v,id,isBuiltin){
  const it=allItems(v).find(x=>x.id===id); if(!confirm("Excluir \""+(it?it.disc:id)+"\"?"))return;
  if(isBuiltin){ if(!state.hidden.includes(id))state.hidden.push(id); } else { state.custom=state.custom.filter(x=>x.id!==id); }
  delete state.items[id]; save(); render();
}
function restoreDefaults(){ if(!confirm("Restaurar itens padrão? Isso desfaz edições e exclusões dos itens originais (suas anotações e checks continuam)."))return; state.overrides={}; state.hidden=[]; save(); render(); }

/* ============================ BACKUP ============================ */
function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download="painel-estudos-backup-"+new Date().toISOString().slice(0,10)+".json"; a.click(); URL.revokeObjectURL(a.href);
}
function importData(input){
  const f=input.files[0]; if(!f)return; const r=new FileReader();
  r.onload=e=>{ try{ const d=JSON.parse(e.target.result); state=normalize(d); save(); render(); alert("Backup importado com sucesso!"); }catch(err){ alert("Arquivo inválido."); } input.value=""; };
  r.readAsText(f);
}

/* ============================ EXPORTAR P/ CALENDÁRIO (.ics) ============================ */
function pad2(n){return String(n).padStart(2,"0");}
function icsEsc(s){return (s==null?"":""+s).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");}
function icsDate(iso){return iso.replace(/-/g,"");}
function icsDatePlus1(iso){const p=iso.split("-").map(Number);const d=new Date(p[0],p[1]-1,p[2]+1);return d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate());}
function exportICS(){
  const now=new Date();
  const stamp=now.getUTCFullYear()+pad2(now.getUTCMonth()+1)+pad2(now.getUTCDate())+"T"+pad2(now.getUTCHours())+pad2(now.getUTCMinutes())+pad2(now.getUTCSeconds())+"Z";
  const items=[...allItems("provas").map(i=>({i,prova:true})),...allItems("pc").map(i=>({i,prova:false}))].filter(o=>!st(o.i.id).done);
  if(!items.length){alert("Nenhum prazo pendente para exportar.");return;}
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Painel de Estudos COC//PT-BR//","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:Prazos - Estudos 3EM"];
  items.forEach(o=>{
    const it=o.i, titulo=(o.prova?"📝 Prova: ":"📦 Entrega: ")+it.disc;
    const det=[]; if(it.prof)det.push(it.prof);
    if(o.prova&&it.area)det.push("Área: "+it.area); if(!o.prova&&it.mod)det.push("Modalidade: "+it.mod);
    if(it.note)det.push(it.note); if(it.desc)det.push(it.desc);
    if((it.topics||[]).length)det.push((o.prova?"Conteúdos:":"Etapas:")+"\n- "+it.topics.join("\n- "));
    L.push("BEGIN:VEVENT","UID:"+it.id+"@painel-estudos-coc","DTSTAMP:"+stamp,
      "DTSTART;VALUE=DATE:"+icsDate(it.data),"DTEND;VALUE=DATE:"+icsDatePlus1(it.data),
      "SUMMARY:"+icsEsc(titulo),"DESCRIPTION:"+icsEsc(det.join("\n")),"CATEGORIES:"+(o.prova?"PROVA":"PRODUCAO"));
    L.push("BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+icsEsc("Amanhã: "+titulo),"TRIGGER:-PT15H","END:VALARM"); // véspera ~9h
    L.push("BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+icsEsc("Hoje: "+titulo),"TRIGGER:PT7H","END:VALARM");     // no dia ~7h
    L.push("END:VEVENT");
  });
  L.push("END:VCALENDAR");
  const blob=new Blob([L.join("\r\n")],{type:"text/calendar;charset=utf-8"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download="prazos-estudos-3em.ics"; a.click(); URL.revokeObjectURL(a.href);
}

/* ============================ PLANEJADOR ============================ */
function plannerView(){
  const av=state.plan.available||120, h=Math.floor(av/60), m=av%60;
  return `<div class="box">
    <h3>🗓️ Recomendação automática</h3>
    <div class="hint">Diga quanto tempo você tem hoje e o painel monta um cronograma priorizando o que vence antes e o que você ainda não estudou — já com as pausas do Pomodoro.</div>
    <div class="inline">
      <div class="field"><label>Horas</label><input class="num" id="pl-h" type="number" min="0" max="16" value="${h}"></div>
      <div class="field"><label>Minutos</label><input class="num" id="pl-m" type="number" min="0" max="59" step="5" value="${m}"></div>
      <div class="field"><label>Começar às (opcional)</label><input id="pl-start" type="time" value="${esc(state.plan.start)}"></div>
      <button class="btn cyan" onclick="genPlan()">⚡ Gerar plano</button>
    </div>
    <div id="plan-result"></div>
  </div>
  <div class="box">
    <h3>✍️ Plano manual</h3>
    <div class="hint">Prefere montar você mesma? Adicione as atividades e o tempo de cada uma. (Pode clicar em "usar recomendação" para começar a partir do plano automático.)</div>
    <div id="manual-list">${manualRows()}</div>
    <div class="inline" style="margin-top:6px">
      <button class="btn ghost small" onclick="addManual()">+ Atividade</button>
      <button class="btn ghost small" onclick="fillManualFromAuto()">↧ Usar recomendação como base</button>
    </div>
    <div class="total-line" id="manual-total"></div>
  </div>`;
}
function readAvail(){ const h=parseInt(document.getElementById("pl-h").value)||0, m=parseInt(document.getElementById("pl-m").value)||0; return h*60+m; }
function genPlan(){
  const av=readAvail(); state.plan.available=av; state.plan.start=document.getElementById("pl-start").value||""; save();
  const out=document.getElementById("plan-result");
  if(av<10){out.innerHTML='<div class="empty">Informe quanto tempo você tem hoje.</div>';return;}
  const focus=clampFocus(state.pomo.focus), sb=shortBreak(focus), lb=longBreak(focus);
  const cand=pendingForPlan().map(e=>({...e,w:planWeight(e)})).sort((a,b)=>b.w-a.w);
  if(!cand.length){out.innerHTML='<div class="empty">🎉 Nada pendente para estudar agora!</div>';return;}
  // quantos blocos de foco cabem
  let N=0,t=0; while(N<40){const add=focus+(N>0?sb:0); if(t+add<=av){t+=add;N++;}else break;}
  let seq=[];
  if(N===0){ seq=[{type:"focus",disc:cand[0].item.disc,why:reason(cand[0]),min:av}]; }
  else{
    const sumW=cand.reduce((s,e)=>s+e.w,0)||1;
    const alloc=cand.map(e=>({e,raw:N*e.w/sumW,n:0})); alloc.forEach(a=>a.n=Math.floor(a.raw));
    let left=N-alloc.reduce((s,a)=>s+a.n,0);
    alloc.slice().sort((a,b)=>(b.raw-Math.floor(b.raw))-(a.raw-Math.floor(a.raw))).forEach(a=>{if(left>0){a.n++;left--;}});
    if(alloc.every(a=>a.n===0))alloc[0].n=1;
    alloc.sort((a,b)=>b.e.w-a.e.w);
    let fcount=0;
    alloc.forEach(a=>{for(let k=0;k<a.n;k++){ seq.push({type:"focus",disc:a.e.item.disc,why:reason(a.e),min:focus}); fcount++; seq.push({type:"break",min:(fcount%4===0?lb:sb)});}});
    if(seq.length&&seq[seq.length-1].type==="break")seq.pop(); // remove pausa final
  }
  // relógio
  let clock=null; const stt=state.plan.start;
  if(stt){const [hh,mm]=stt.split(":").map(Number); clock=new Date(); clock.setHours(hh,mm,0,0);}
  let html='<div class="sched">';
  seq.forEach(sl=>{
    let times="";
    if(clock){const a=hhmm(clock); clock=new Date(clock.getTime()+sl.min*60000); times=`<span class="clock">${a}–${hhmm(clock)}</span>`;}
    if(sl.type==="focus") html+=`<div class="slot focus">${times}<span class="lbl">📚 <b>${esc(sl.disc)}</b><br><small>${esc(sl.why)}</small></span><span class="dur">${sl.min}min</span></div>`;
    else html+=`<div class="slot break">${times}<span class="lbl">☕ Pausa</span><span class="dur">${sl.min}min</span></div>`;
  });
  html+='</div>';
  const totalStudy=seq.filter(s=>s.type==="focus").reduce((s,x)=>s+x.min,0);
  html+=`<div class="hint" style="margin-top:12px">Total: <b style="color:var(--cyan)">${totalStudy}min de estudo</b> em ${seq.filter(s=>s.type==="focus").length} blocos · pausas de ${sb}min (longa ${lb}min). Ajuste os tempos no <b>Pomodoro</b>.</div>`;
  out.innerHTML=html; window._lastPlan=seq;
}
function hhmm(d){return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");}
function manualRows(){
  const m=state.plan.manual;
  if(!m.length) return '<div class="meta">Nenhuma atividade ainda.</div>';
  return m.map((r,i)=>`<div class="manrow"><input class="mlbl" value="${esc(r.label)}" oninput="editManual(${i},'label',this.value)" placeholder="Atividade"><input class="mmin" type="number" min="0" step="5" value="${r.min}" oninput="editManual(${i},'min',this.value)"> <span class="muted" style="font-size:.8rem">min</span><button class="iconbtn" onclick="rmManual(${i})">×</button></div>`).join("");
}
function refreshManual(){ const l=document.getElementById("manual-list"); if(l)l.innerHTML=manualRows(); const tot=state.plan.manual.reduce((s,r)=>s+(parseInt(r.min)||0),0); const av=state.plan.available||0; const el=document.getElementById("manual-total"); if(el){el.textContent=`Planejado: ${tot}min`+(av?` de ${av}min disponíveis`:""); el.className="total-line "+(av&&tot>av?"over":"ok");} }
function addManual(){state.plan.manual.push({label:"",min:25});save();refreshManual();}
function editManual(i,k,v){state.plan.manual[i][k]=k==="min"?(parseInt(v)||0):v;save();refreshManual();}
function rmManual(i){state.plan.manual.splice(i,1);save();refreshManual();}
function fillManualFromAuto(){ if(!window._lastPlan){genPlan();} if(!window._lastPlan)return; state.plan.manual=window._lastPlan.filter(s=>s.type==="focus").map(s=>({label:s.disc+" — "+s.why,min:s.min})); save(); refreshManual(); }

/* ============================ POMODORO ============================ */
let timer={phase:"focus",remaining:(state.pomo.focus||25)*60,running:false,endAt:0,cycle:0,subject:""};
let tickHandle=null;
function focoView(){
  const focus=clampFocus(state.pomo.focus), sb=shortBreak(focus), lb=longBreak(focus);
  const discs=disciplinas(); if(!timer.subject)timer.subject=discs[0]||"Geral";
  const presets=[15,25,30,50].map(p=>`<button class="preset ${focus===p?'sel':''}" onclick="setFocus(${p})">${p}min</button>`).join("");
  const opts=discs.concat(["Geral"]).map(dz=>`<option ${dz===timer.subject?"selected":""}>${esc(dz)}</option>`).join("");
  return `<div class="pomo-wrap">
    <div class="box timer">
      <div class="phase ${timer.phase==='focus'?'focus':'brk'}" id="pm-phase"></div>
      <div class="clockbig" id="pm-time">25:00</div>
      <div class="forwhat" id="pm-for"></div>
      <div class="dots" id="pm-dots"></div>
      <div class="actions" style="justify-content:center">
        <button class="btn done" id="pm-start" onclick="pomoToggle()">▶ Iniciar</button>
        <button class="btn ghost" onclick="pomoReset()">↺ Reiniciar</button>
        <button class="btn toggle" onclick="pomoSkip()">⏭ Pular</button>
      </div>
    </div>
    <div class="box">
      <h3>⚙️ Configurar foco</h3>
      <div class="hint">Escolha o tempo de foco — o descanso é calculado automaticamente.</div>
      <div class="presets">${presets}</div>
      <div class="inline">
        <div class="field"><label>Foco personalizado (min)</label><input class="num" id="pm-custom" type="number" min="5" max="120" step="5" value="${focus}" onchange="setFocus(this.value)"></div>
        <div class="field"><label>Estudando</label><select id="pm-subj" onchange="timer.subject=this.value;refreshTimerUI()">${opts}</select></div>
      </div>
      <div class="breakinfo">Pausa curta: <b>${sb}min</b> · Pausa longa (a cada 4 focos): <b>${lb}min</b></div>
      <h3 style="margin-top:18px">📊 Tempo estudado por matéria</h3>
      <div class="studybars" id="studybars"></div>
      <button class="btn ghost small" style="margin-top:10px" onclick="resetStudy()">zerar tempos</button>
    </div>
  </div>`;
}
function setFocus(v){ state.pomo.focus=clampFocus(v); save(); if(!timer.running&&timer.phase==="focus")timer.remaining=state.pomo.focus*60; if(view==="foco")render(); }
function curPhaseSeconds(){const f=clampFocus(state.pomo.focus); if(timer.phase==="focus")return f*60; if(timer.phase==="long")return longBreak(f)*60; return shortBreak(f)*60;}
function pomoToggle(){ if(timer.running){timer.running=false; if(tickHandle){clearInterval(tickHandle);tickHandle=null;}} else { if(view==="foco"){const sj=document.getElementById("pm-subj"); if(sj)timer.subject=sj.value;} timer.running=true; timer.endAt=Date.now()+timer.remaining*1000; if("Notification"in window&&Notification.permission==="default")Notification.requestPermission(); tickHandle=setInterval(tick,250);} refreshTimerUI(); }
function pomoReset(){ timer.running=false; if(tickHandle){clearInterval(tickHandle);tickHandle=null;} timer.phase="focus"; timer.cycle=0; timer.remaining=clampFocus(state.pomo.focus)*60; refreshTimerUI(); }
function pomoSkip(){ finishPhase(true); }
function tick(){ if(!timer.running)return; timer.remaining=Math.max(0,Math.round((timer.endAt-Date.now())/1000)); if(timer.remaining<=0)finishPhase(false); refreshTimerUI(); }
function finishPhase(skipped){
  if(timer.phase==="focus"){
    if(!skipped){ const f=clampFocus(state.pomo.focus); state.study[timer.subject]=(state.study[timer.subject]||0)+f; logDia(f); save(); refreshStudyBars(); }
    timer.cycle++; beep(); notify("✅ Foco concluído!", "Hora da pausa.");
    timer.phase=(timer.cycle%4===0)?"long":"short";
  } else { beep(); notify("☕ Pausa encerrada!", "Bora focar de novo."); timer.phase="focus"; }
  timer.remaining=curPhaseSeconds();
  if(timer.running)timer.endAt=Date.now()+timer.remaining*1000;
  refreshTimerUI();
}
function refreshTimerUI(){
  if(view!=="foco")return;
  const ph=document.getElementById("pm-phase"); if(!ph)return;
  const mm=String(Math.floor(timer.remaining/60)).padStart(2,"0"), ss=String(timer.remaining%60).padStart(2,"0");
  document.getElementById("pm-time").textContent=mm+":"+ss;
  ph.textContent=timer.phase==="focus"?"● FOCO":(timer.phase==="long"?"● PAUSA LONGA":"● PAUSA");
  ph.className="phase "+(timer.phase==="focus"?"focus":"brk");
  document.getElementById("pm-for").textContent=timer.phase==="focus"?("📚 "+timer.subject):"Relaxe um pouco 🙂";
  const st0=document.getElementById("pm-start"); if(st0)st0.textContent=timer.running?"⏸ Pausar":"▶ Iniciar";
  document.getElementById("pm-dots").innerHTML=[0,1,2,3].map(i=>`<i class="${i<(timer.cycle%4||(timer.cycle&&timer.phase==='long'?4:0))?'on':''}"></i>`).join("");
}
function refreshStudyBars(){
  const el=document.getElementById("studybars"); if(!el)return;
  const ent=Object.entries(state.study).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  if(!ent.length){el.innerHTML='<div class="meta">Nenhum tempo registrado ainda. Inicie um foco!</div>';return;}
  const max=Math.max(...ent.map(e=>e[1]));
  el.innerHTML=ent.map(([k,v])=>{const h=Math.floor(v/60),m=v%60; const lbl=(h?h+"h":"")+(m?m+"min":"")||"0"; return `<div class="sbrow"><div class="top"><span>${esc(k)}</span><span class="muted">${lbl}</span></div><div class="bar"><i style="width:${Math.round(v/max*100)}%"></i></div></div>`;}).join("");
}
function resetStudy(){ if(confirm("Zerar todos os tempos estudados?")){state.study={};save();refreshStudyBars();} }
function beep(){ try{const a=new (window.AudioContext||window.webkitAudioContext)(); const o=a.createOscillator(),g=a.createGain(); o.connect(g);g.connect(a.destination); o.type="sine";o.frequency.value=880; g.gain.setValueAtTime(.001,a.currentTime); g.gain.exponentialRampToValueAtTime(.3,a.currentTime+.02); g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.6); o.start();o.stop(a.currentTime+.6);}catch(e){} }
function notify(t,b){ try{ if("Notification"in window&&Notification.permission==="granted")new Notification(t,{body:b}); }catch(e){} }

/* ============================ VESTIBULAR ============================ */
function todayISO(){const d=new Date();return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());}
function isoToDate(iso){const p=iso.split("-").map(Number);return new Date(p[0],p[1]-1,p[2]);}
function dateISO(d){return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());}
function weekStartISO(d){const x=new Date(d);x.setHours(0,0,0,0);const dow=(x.getDay()+6)%7;x.setDate(x.getDate()-dow);return dateISO(x);}
function curWeek(){return weekStartISO(new Date());}
function logDia(min){const k=todayISO();state.vest.dias[k]=(state.vest.dias[k]||0)+min;save();}
function calcStreak(){
  const has=k=>(state.vest.dias[k]||0)>0;
  const d=new Date();d.setHours(0,0,0,0);
  if(!has(todayISO()))d.setDate(d.getDate()-1); // hoje ainda não estudou não zera o streak
  let n=0;
  while(has(dateISO(d))){n++;d.setDate(d.getDate()-1);}
  return n;
}

/* ============================ INIT ============================ */
// Estuda+: subtítulo reflete a série/turma do aluno
(function(){ try{ var sub=document.querySelector("header .sub"); if(sub&&window.EP){ sub.textContent = window.EP.serie+"ª série do EM · turma "+(window.EP.turma||"—")+" · COC Atibaia"; } }catch(e){} })();
loadSerieContent(function(){ render(); });
// Re-renderiza quando o dia muda (painel aberto durante a virada de data),
// mantendo "faltam X dias / amanhã / hoje" sempre certos sem precisar recarregar.
let _lastDay=new Date().toDateString();
setInterval(()=>{ const d=new Date().toDateString(); if(d!==_lastDay){ _lastDay=d; checkPush(); render(); } }, 60000);

/* ---------- Notificações push: avisa na véspera de cada prova/entrega (opt-in) ---------- */
function checkPush(){
  if(!("Notification" in window) || Notification.permission!=="granted") return;
  try{
    var shown=JSON.parse(localStorage.getItem(KEY+":push")||"{}");
    var all=[...allItems("provas"),...allItems("pc")].filter(i=>i.data&&diasFalta(i.data)===1);
    all.forEach(function(i){
      if(shown[i.id]) return;
      shown[i.id]=1; try{ localStorage.setItem(KEY+":push", JSON.stringify(shown)); }catch(e){}
      var n=new Notification("🔔 Amanhã: "+i.disc, { body:(i.data?fmtData(i.data)+" · ":"")+"Dê uma olhada no checklist hoje!", icon:"icons/icon-192.png" });
      setTimeout(function(){ try{ n.close(); }catch(e){} }, 15000);
    });
  }catch(e){}
}
function askPush(){
  if(!("Notification" in window)){ alert("Seu aparelho não suporta notificações."); return; }
  Notification.requestPermission().then(function(p){
    if(p==="granted"){ checkPush(); alert("✅ Notificações ativadas! Você será avisado na véspera de cada prova e produção."); }
    else { alert("Notificações não autorizadas — você pode ativar depois em Ajustes do navegador."); }
  });
}
if("Notification" in window && Notification.permission==="granted") checkPush();
