
const KEY = "painel-notas-3em-2026";
const META = 24, BASE = 6, NBIM = 4;
const AREAS = {
  Natureza:  {cls:"nat", dif:1.00, rotulo:"Natureza"},
  Linguagens:{cls:"lin", dif:0.90, rotulo:"Linguagens"},
  Exatas:    {cls:"exa", dif:0.65, rotulo:"Exatas"},
  Humanas:   {cls:"hum", dif:0.40, rotulo:"Humanas"}
};
const emptyBim = ()=>({av1:"",av2:"",pc:"",ave:"",medManual:""});
function esc(s) { return (s == null ? "" : "" + s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  // aspas tambem: sem isto, qualquer valor dentro de value="..." ou
  // href="..." fecha o atributo e injeta outro (V-06 da auditoria).
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
function SEED(){
  const mk = (name,area,b1,extra)=>Object.assign({id:name.toLowerCase().replace(/[^a-z]/g,""),name,area,
    bims:[Object.assign(emptyBim(),b1),emptyBim(),emptyBim(),emptyBim()]}, extra);
  // Boletim EM BRANCO: cada usuário (você e seus amigos) começa sem notas e
  // preenche as suas. A lista de matérias é a mesma da turma (3ª EM).
  return {
    bimAtual:3,
    subjects:[
      mk("Biologia","Natureza"),
      mk("Física","Natureza"),
      mk("Química","Natureza"),
      mk("Matemática","Exatas"),
      mk("Língua Portuguesa","Linguagens"),
      mk("Língua Inglesa","Linguagens",null,{semAV2:true}),
      mk("Geografia","Humanas"),
      mk("História","Humanas"),
      mk("Sociologia","Humanas"),
      mk("Filosofia","Humanas")
    ],
    conflitos:[]
  };
}

let state;
function load(){ try{ state = JSON.parse(localStorage.getItem(KEY)); }catch(e){ state=null; }
  if(!state||!state.subjects) state = SEED(); if(!state.conflitos) state.conflitos=[];
  // Inglês não tem AV2 nesta turma — média = (AV1+PC+AVE)/2. Marca isso em quem já
  // tinha o boletim salvo antes dessa flag existir (senão o cálculo ficaria errado).
  const ing=state.subjects.find(s=>s.name==="Língua Inglesa"); if(ing&&!ing.semAV2){ ing.semAV2=true; save(); }
}
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); agendarPublicacao(); }

/* ---------- C1: importar o boletim oficial da escola (Activesoft) ----------
   O aluno sobe o PDF e as notas entram sozinhas. Nada é gravado antes de ele
   ver o que vai entrar — a conferência é obrigatória, porque um erro de
   leitura aqui viraria nota errada no painel sem ninguém perceber. */
function importarBoletim(ev){
  const f=ev.target.files[0]; if(!f) return; ev.target.value="";
  if(!window.pdfjsLib){ alert("O leitor de PDF ainda está carregando. Tente de novo em 1 segundo."); return; }
  if(!window.Activesoft){ alert("Módulo de leitura não carregou. Recarregue a página."); return; }
  if(f.size > 15*1024*1024){ alert("Arquivo muito grande (limite 15 MB)."); return; }

  const r=new FileReader();
  r.onload=e=>{
    const buf=e.target.result;
    const b=new Uint8Array(buf,0,5);
    if(!(b[0]===0x25&&b[1]===0x50&&b[2]===0x44&&b[3]===0x46)){ alert("Esse arquivo não é um PDF de verdade."); return; }
    pdfjsLib.getDocument({data:buf, isEvalSupported:false}).promise
      .then(pdf=>{
        if(pdf.numPages>10) throw new Error("O boletim tem "+pdf.numPages+" páginas — esperava no máximo 10.");
        const pgs=[]; for(let i=1;i<=pdf.numPages;i++) pgs.push(i);
        return pgs.reduce((cad,n)=>cad.then(acc=>
          pdf.getPage(n).then(p=>p.getTextContent()).then(tc=>{
            tc.items.forEach(it=>{
              if(!it.str||!it.str.trim()) return;
              // transform[4]=x, [5]=y; y do PDF cresce pra cima, invertemos
              acc.push({x:it.transform[4], y:-it.transform[5], t:it.str.trim()});
            });
            return acc;
          })
        ), Promise.resolve([]));
      })
      .then(tokens=>{
        const lido=Activesoft.parseTokens(tokens);
        previewBoletim(lido);
      })
      .catch(err=>alert("Não consegui ler o boletim: "+(err&&err.message||err)
        +"\n\nSe o problema continuar, você ainda pode digitar as notas na mão."));
  };
  r.readAsArrayBuffer(f);
}

function previewBoletim(lido){
  // aplica numa CÓPIA: o painel real só muda se você confirmar
  const copia=JSON.parse(JSON.stringify(state.subjects));
  const res=Activesoft.paraPainel(lido, copia);
  const i=lido.info;

  const linhas=copia.map((s,idx)=>{
    const antes=state.subjects[idx];
    const cels=s.bims.map((b,bi)=>{
      const m=medArred(b,s.semAV2), mAntes=medArred(antes.bims[bi],antes.semAV2);
      const mudou = String(m)!==String(mAntes);
      return `<td style="text-align:center;padding:3px 6px${mudou?";color:var(--green);font-weight:800":""}">${m==null?"—":fmt(m)}</td>`;
    }).join("");
    return `<tr><td style="padding:3px 6px">${esc(s.name)}</td>${cels}</tr>`;
  }).join("");

  const naoAchou = res.naoAchadas.length
    ? `<div style="color:var(--gold);font-size:.82rem;margin-top:8px">⚠ Não encontrei no boletim: ${res.naoAchadas.map(esc).join(", ")} — essas ficam como estão.</div>` : "";

  document.getElementById("modal-root").innerHTML =
    `<div class="overlay" id="bo-ov"><div class="modal" style="max-width:620px">
      <h3>📄 Conferir antes de gravar</h3>
      <div class="muted" style="font-size:.85rem;line-height:1.6">
        <b>${esc(i.aluno||"—")}</b>${i.matricula?" · matrícula "+esc(i.matricula):""}<br>
        ${i.serie?esc(i.serie)+"ª série":""}${i.turma?" "+esc(i.turma):""}${i.ano?" · "+esc(i.ano):""}${i.emissao?" · emitido em "+esc(i.emissao):""}
      </div>
      <div style="max-height:44vh;overflow:auto;margin-top:12px;border:1px solid var(--line);border-radius:10px">
        <table style="width:100%;border-collapse:collapse;font-size:.84rem">
          <tr style="position:sticky;top:0;background:var(--card)"><th style="text-align:left;padding:4px 6px">Matéria</th>
          <th>1º</th><th>2º</th><th>3º</th><th>4º</th></tr>${linhas}
        </table>
      </div>
      <div class="muted" style="font-size:.8rem;margin-top:8px">Em <b style="color:var(--green)">verde</b>, o que muda. ${res.casadas.length} de ${copia.length} matérias encontradas.</div>
      ${naoAchou}
      <div class="modal-actions"><button class="btn ghost" id="bo-x">Cancelar</button>
      <button class="btn done" id="bo-ok">Gravar estas notas</button></div>
    </div></div>`;

  document.getElementById("bo-ov").onclick=e=>{ if(e.target===e.currentTarget) fecharBoletim(); };
  document.getElementById("bo-x").onclick=fecharBoletim;
  document.getElementById("bo-ok").onclick=()=>{
    state.subjects=copia; save(); fecharBoletim(); renderAll();
    if(window.Cloud && Cloud.flushSync) Cloud.flushSync();
    alert("✅ Notas importadas do boletim. Confira e ajuste o que precisar — lembrando que a nota oficial é sempre a da escola.");
  };
}
function fecharBoletim(){ const m=document.getElementById("modal-root"); if(m) m.innerHTML=""; }

/* ---------- B1: publicar a situação por matéria para os professores --------
   As notas cruas continuam num blob privado que só o dono lê. O que sai daqui
   é uma PROJEÇÃO por matéria — médias dos bimestres e situação — gravada em
   schools/{escola}/salas/{sala}/materias/{materia}/notas/{uid}, que só o
   professor daquela matéria naquela sala (e a coordenação) consegue ler.

   Duas honestidades embutidas:
   1. Quem grava é o navegador do aluno, porque sem backend não existe outro
      caminho. Logo o professor vê a foto do último acesso, não o agora — por
      isso `atualizado` vai junto e a tela dele mostra a data.
   2. Se a matrícula ainda está pendente, NADA é publicado e o aviso de
      visibilidade não aparece. O aviso só existe quando é verdade. */
let _pubTimer = null;
function agendarPublicacao(){ clearTimeout(_pubTimer); _pubTimer = setTimeout(publicarNotas, 1500); }

function publicarNotas(){
  if(!(window.Cloud && Cloud.user && Cloud.firestore && Cloud.firestore() && window.EP && window.Escola)) return;
  if(window.EP.role !== "aluno") return;
  const sala = Escola.salaId(window.EP.serie, window.EP.turma);
  if(!sala) return;
  const db = Cloud.firestore(), uid = Cloud.user.uid;
  const raiz = db.collection("schools").doc(Cloud.school()).collection("salas").doc(sala);

  raiz.collection("alunos").doc(uid).get().then(function(s){
    if(!s.exists || s.data().status !== "aprovado") return;   // pendente: não publica nada
    const agora = Date.now();
    const nome = Cloud.user.displayName || Cloud.user.email || "Aluno";
    let publicadas = 0;
    state.subjects.forEach(function(sub){
      const mat = Escola.materiaPorNome(sub.name);
      if(!mat) return;                    // matéria fora da lista canônica não é publicada
      const r = resumo(sub), st = statusOf(r);
      publicadas++;
      raiz.collection("materias").doc(mat.id).collection("notas").doc(uid).set({
        nome: nome,
        status: st.cls==="green" ? "ok" : (st.cls==="red" ? "risco" : "atencao"),
        acc: Math.round(r.acc*100)/100,
        // precisa pode ser Infinity quando não há bimestre restante — o
        // Firestore não aceita Infinity, então vira um teto numérico
        precisa: isFinite(r.precisa) ? Math.round(Math.min(99, r.precisa)*100)/100 : 99,
        fechou: !!r.fechou,
        medias: sub.bims.map(function(b){ const v = medArred(b, sub.semAV2); return v==null ? null : v; }),
        atualizado: agora
      }).catch(function(){});
    });
    avisoVisibilidade(publicadas);
  }).catch(function(){});
}

function avisoVisibilidade(n){
  if(!n) return;
  const host = document.querySelector(".oficial");
  if(!host || document.getElementById("aviso-visivel")) return;
  const d = document.createElement("div");
  d.id = "aviso-visivel";
  d.style.cssText = "margin-top:8px;padding-top:8px;border-top:1px solid rgba(58,214,255,.25)";
  d.innerHTML = "👁️ <b>Seus professores acompanham a sua situação.</b> Cada professor vê apenas "
    + "a matéria que leciona para a sua turma — médias dos bimestres e se você está tranquilo, "
    + "em atenção ou em risco. A coordenação vê todas.";
  host.appendChild(d);
}

/* ---------- math helpers ---------- */
function num(v){ if(v===""||v==null) return null;
  if(String(v).trim().toUpperCase()==="DISP") return "DISP";
  const n=parseFloat(String(v).replace(",",".")); return isNaN(n)?null:n; }
function round05(x){ return Math.round(x*2)/2; }
function fmt(x){ return x==null?"—":x.toFixed(1).replace(".",","); }

// returns {raw, parcial} or null. semAV2: matéria sem 2ª prova (ex.: Inglês) —
// média = (AV1 + PC + AVE) ÷ 2 em vez de (AV1 + AV2 + PC + AVE) ÷ 3.
/* DISP = prova dispensada. Conferido contra o boletim oficial em 26/08/2026:
   o componente dispensado SAI da conta e o divisor cai de 3 para 2.
   O código antigo copiava a nota da outra prova no lugar da dispensada, e isso
   dava média errada — Redação com AV1 7,6 e AV2 dispensada dava 7,5 aqui e
   8,0 no boletim da escola. Matéria sem AV2 (semAV2) segue a mesma regra. */
function mediaBim(b, semAV2){
  let a1=num(b.av1), a2=num(b.av2), pc=num(b.pc), ave=num(b.ave);
  const dispensou = semAV2 || a1==="DISP" || a2==="DISP";
  if(a1==="DISP") a1=null;
  if(a2==="DISP") a2=null;
  const provas=[a1,a2].filter(v=>typeof v==="number");
  if(provas.length >= (dispensou?1:2)){
    const sum = provas.reduce((t,v)=>t+v,0)+(typeof pc==="number"?pc:0)+(typeof ave==="number"?ave:0);
    const parcial = !(typeof pc==="number") || !(typeof ave==="number");
    return {raw: sum/(dispensou?2:3), parcial};
  }
  const m=num(b.medManual);
  if(typeof m==="number") return {raw:m, parcial:false};
  return null;
}
function medArred(b, semAV2){ const m=mediaBim(b, semAV2); return m?round05(m.raw):null; }

// per-subject summary
function resumo(s){
  let acc=0, feitos=0;
  s.bims.forEach(b=>{ const m=medArred(b, s.semAV2); if(m!=null){ acc+=m; feitos++; } });
  const restantes = NBIM - feitos;
  const faltam = Math.max(0, META - acc);
  const precisa = restantes>0 ? faltam/restantes : (acc>=META?0:Infinity);
  const fechou = acc>=META;
  return {acc, feitos, restantes, faltam, precisa, fechou};
}
function statusOf(r){
  if(r.fechou) return {cls:"green", txt:"✓ Já fechou os 24"};
  if(r.restantes===0) return {cls:"red", txt:`Faltaram ${fmt(r.faltam)} → recuperação`};
  if(r.precisa>10) return {cls:"red", txt:"Só com recuperação"};
  if(r.precisa>9)  return {cls:"red", txt:"Risco alto"};
  if(r.precisa>7.5)return {cls:"orange", txt:"Atenção"};
  if(r.precisa>6)  return {cls:"gold", txt:"Atenção leve"};
  return {cls:"green", txt:"Tranquilo"};
}

/* ---------- render painel ---------- */
let openEd = {}; // subjId -> bim index open
function renderCards(){
  const wrap=document.getElementById("cards"); wrap.innerHTML="";
  state.subjects.forEach(s=>{
    const r=resumo(s), st=statusOf(r), a=AREAS[s.area];
    const pct=Math.min(100, r.acc/META*100);
    const barcls = r.fechou?"green":(st.cls==="red"?"red":(st.cls==="green"?"green":"gold"));
    let linha;
    if(r.fechou) linha=`<b>Já garantiu os 24 pts</b> 🎉 — pode focar energia em outra matéria.`;
    else if(r.restantes===0) linha=`Fechou o ano com <b>${fmt(r.acc)}</b>. Faltaram <b>${fmt(r.faltam)}</b> pts.`;
    else linha=`Acumulado <b>${fmt(r.acc)}</b>/24 · faltam <b>${fmt(r.faltam)}</b> pts → precisa de <b>${r.precisa>10?"+10 (impossível)":fmt(round05(r.precisa))}</b> por bimestre nos ${r.restantes} restantes.`;

    const bimcells = s.bims.map((b,i)=>{
      const m=medArred(b, s.semAV2), mb=mediaBim(b, s.semAV2);
      const cls = m==null?"empty":(mb&&mb.parcial?"parc":"");
      const sel = openEd[s.id]===i?"sel":"";
      return `<div class="bim ${cls} ${sel}" onclick="toggleEd('${safeId(s.id)}',${i})">
        <div class="bl">B${i+1}</div><div class="bv">${fmt(m)}</div></div>`;
    }).join("");

    const ei = openEd[s.id];
    let editor="";
    if(ei!=null){
      const b=s.bims[ei], mb=mediaBim(b, s.semAV2);
      const av2Field = s.semAV2
        ? `<div class="field"><label>AV2</label><input value="— não há —" disabled style="opacity:.5"><span class="lim">esta matéria não tem 2ª prova</span></div>`
        : `<div class="field"><label>AV2</label><input inputmode="decimal" value="${esc(b.av2)}" onchange="setF('${safeId(s.id)}',${ei},'av2',this.value)"><span class="lim">prova/DISP · 10</span></div>`;
      editor=`<div class="editor open">
        <div class="ehead">✎ Notas do ${ei+1}º bimestre — ${esc(s.name)}</div>
        <div class="fields">
          <div class="field"><label>AV1</label><input inputmode="decimal" value="${esc(b.av1)}" onchange="setF('${safeId(s.id)}',${ei},'av1',this.value)"><span class="lim">prova · máx 10</span></div>
          ${av2Field}
          <div class="field"><label>PC</label><input inputmode="decimal" value="${esc(b.pc)}" onchange="setF('${safeId(s.id)}',${ei},'pc',this.value)"><span class="lim">produção · máx 6</span></div>
          <div class="field"><label>AVE</label><input inputmode="decimal" value="${esc(b.ave)}" onchange="setF('${safeId(s.id)}',${ei},'ave',this.value)"><span class="lim">externa · máx 4</span></div>
        </div>
        <div class="emed">Média deste bimestre: <span class="v">${mb?fmt(round05(mb.raw)):"—"}</span>
          ${mb?`<span class="muted">(bruta ${fmt(mb.raw)}${mb.parcial?" · parcial, faltam notas":""}${s.semAV2?" · média = (AV1+PC+AVE)÷2":""})</span>`:`<span class="muted">${s.semAV2?"— preencha ao menos a AV1, ou use a média direta abaixo":"— preencha as duas provas, ou use a média direta abaixo"}</span>`}</div>
        <div class="field" style="max-width:200px;margin-top:8px"><label>Ou digite a média direto</label><input inputmode="decimal" value="${esc(b.medManual)}" onchange="setF('${safeId(s.id)}',${ei},'medManual',this.value)" placeholder="ex.: 7,5"><span class="lim">útil p/ matérias com sub-disciplinas</span></div>
      </div>`;
    }

    const card=document.createElement("div");
    card.className=`card u-${st.cls}`;
    card.innerHTML=`
      <div class="crow">
        <div><div class="disc">${esc(s.name)}</div>
          <select class="tag ${a.cls}" style="appearance:auto;background:var(--chip)" onchange="setArea('${safeId(s.id)}',this.value)">
            ${Object.keys(AREAS).map(k=>`<option value="${k}" ${k===s.area?"selected":""}>${AREAS[k].rotulo}</option>`).join("")}
          </select>
        </div>
        <div class="stpill ${st.cls}">${st.txt}</div>
      </div>
      <div class="bims">${bimcells}</div>
      <div class="accbar"><i class="${barcls}" style="width:${pct}%"></i></div>
      <div class="calcline">${linha}</div>
      ${editor}`;
    wrap.appendChild(card);
  });
  renderStats();
}

function renderStats(){
  document.getElementById("stMat").textContent=state.subjects.length;
  let g=0,o=0,r=0, somaMed=0, cMed=0;
  state.subjects.forEach(s=>{
    const rs=resumo(s), st=statusOf(rs);
    if(st.cls==="green")g++; else if(st.cls==="gold"||st.cls==="orange")o++; else r++;
    s.bims.forEach(b=>{const m=medArred(b, s.semAV2); if(m!=null){somaMed+=m;cMed++;}});
  });
  document.getElementById("stSit").innerHTML=
    `<span class="mini g">${g} ok</span><span class="mini o">${o} atenção</span><span class="mini r">${r} risco</span>`;
  document.getElementById("stMedia").innerHTML = (cMed? (somaMed/cMed).toFixed(1).replace(".",",") : "—")+`<small> /10 média geral</small>`;
  document.getElementById("bimAtual").value=state.bimAtual||2;
}

/* ---------- edit actions ---------- */
function toggleEd(id,i){ openEd[id] = (openEd[id]===i)?null:i; renderCards(); }
function setF(id,i,f,v){ const s=state.subjects.find(x=>x.id===id); s.bims[i][f]=v.trim(); save(); renderCards(); }
function setArea(id,v){ const s=state.subjects.find(x=>x.id===id); s.area=v; save(); renderCards(); }
function setBimAtual(v){ state.bimAtual=+v; save(); }

/* ---------- calculadora ---------- */
function calc(){
  // matérias sem 2ª prova (ex.: Língua Inglesa) usam (AV1+PC+AVE)÷2 em vez de ÷3
  const semAV2=!!(document.getElementById("cSemAv2")||{}).checked;
  const divisor=semAV2?2:3;
  const f2=document.getElementById("cAv2Field"); if(f2) f2.style.opacity=semAV2?".4":"";
  const av2El=document.getElementById("cAv2"); if(av2El) av2El.disabled=semAV2;
  const b={av1:val("cAv1"),av2:semAV2?"":val("cAv2"),pc:val("cPc"),ave:val("cAve"),medManual:""};
  const m=mediaBim(b, semAV2);
  const out=document.getElementById("cOut"), ex=document.getElementById("cExtra");
  if(m){ out.textContent=fmt(round05(m.raw));
    ex.innerHTML=`Nota bruta: <b style="color:var(--txt)">${fmt(m.raw)}</b> → arredondada pro 0,5 mais próximo.${semAV2?" <span class='muted'>(média = (AV1+PC+AVE)÷2)</span>":""}${m.parcial?" <span style='color:var(--orange)'>(parcial — falta PC ou AVE)</span>":""}${round05(m.raw)>=6?" ✅ passou do 6.":" ⚠️ abaixo de 6."}`;
  } else { out.textContent="—"; ex.textContent=semAV2?"Preencha pelo menos a AV1.":"Preencha pelo menos AV1 e AV2."; }
  // meta
  const goal=num(val("cGoal")), go=document.getElementById("cGoalOut");
  if(typeof goal!=="number"){ go.textContent="Digite uma média desejada."; return; }
  const a1=num(val("cAv1")),a2=semAV2?null:num(val("cAv2")),pc=num(val("cPc")),ave=num(val("cAve"));
  const campos=[["AV1",a1,10]].concat(semAV2?[]:[["AV2",a2,10]]).concat([["PC",pc,6],["AVE",ave,4]]);
  const vazios=campos.filter(c=>typeof c[1]!=="number");
  const somaTem=campos.reduce((t,c)=>t+(typeof c[1]==="number"?c[1]:0),0);
  const precisoTotal=goal*divisor; // soma necessária
  const falta=precisoTotal-somaTem;
  if(vazios.length===0){ go.innerHTML=`Tudo preenchido. Soma atual = <b>${fmt(somaTem)}</b>, dá média <b>${fmt(round05(somaTem/divisor))}</b>.`; return; }
  if(vazios.length===1){ const c=vazios[0];
    if(falta<=0) go.innerHTML=`Você já garante <b>${fmt(goal)}</b> mesmo zerando ${c[0]}. 🎉`;
    else if(falta>c[2]) go.innerHTML=`Pra média <b>${fmt(goal)}</b> precisaria de <b>${fmt(falta)}</b> em ${c[0]}, mas o máximo é ${c[2]}. <span style="color:var(--red)">Não dá só com ${c[0]}.</span>`;
    else go.innerHTML=`Pra fechar média <b>${fmt(goal)}</b>, você precisa de <b style="color:var(--cyan)">${fmt(falta)}</b> em <b>${c[0]}</b> (máx ${c[2]}).`;
  } else {
    go.innerHTML=`Faltam <b>${fmt(Math.max(0,falta))}</b> pts no total (somando ${vazios.map(c=>c[0]).join(" + ")}) pra chegar na média ${fmt(goal)}. Preencha mais campos pra eu detalhar.`;
  }
}
function val(id){ return document.getElementById(id).value; }

/* ---------- sacrifício ---------- */
function renderConflicts(){
  const wrap=document.getElementById("conflicts"); wrap.innerHTML="";
  if(state.conflitos.length===0) addConflict(true);
  state.conflitos.forEach((c,i)=>{
    const row=document.createElement("div"); row.className="conflict";
    row.innerHTML=`
      <div class="num">${i+1}</div>
      <div class="fg"><label>Matéria</label>
        <select class="sel" onchange="setConf(${i},'subjId',this.value)">
          ${state.subjects.map(s=>`<option value="${esc(s.id)}" ${s.id===c.subjId?"selected":""}>${esc(s.name)}</option>`).join("")}
        </select></div>
      <div class="fg"><label>Tipo</label>
        <select class="sel" onchange="setConf(${i},'tipo',this.value)">
          ${["Prova","Produção/Trabalho"].map(t=>`<option ${t===c.tipo?"selected":""}>${t}</option>`).join("")}
        </select></div>
      <div class="fg"><label>Média esperada neste bim (opcional)</label>
        <input class="sel note" inputmode="decimal" value="${esc(c.nota||"")}" placeholder="ex.: 6" onchange="setConf(${i},'nota',this.value)"></div>
      <button class="btn ghost small" onclick="delConf(${i})" style="margin-left:auto">✕</button>`;
    wrap.appendChild(row);
  });
}
function addConflict(silent){ const def=state.subjects[0].id;
  state.conflitos.push({subjId:def,tipo:"Prova",nota:""}); save(); if(!silent) renderConflicts(); else renderConflicts(); }
function setConf(i,f,v){ state.conflitos[i][f]=(typeof v==="string"?v.trim():v); save(); }
function delConf(i){ state.conflitos.splice(i,1); save(); renderConflicts(); document.getElementById("verdict").innerHTML=""; }

function analisar(){
  const cs=state.conflitos.filter(c=>c.subjId);
  if(cs.length<2){ document.getElementById("verdict").innerHTML=`<div class="hintbox">Adicione pelo menos <b>2</b> matérias em conflito pra eu comparar.</div>`; return; }
  const itens=cs.map(c=>{
    const s=state.subjects.find(x=>x.id===c.subjId);
    const r=resumo(s), a=AREAS[s.area];
    const curMed=num(c.nota);
    // incorpora a nota esperada do bim atual como mais um bimestre "feito"
    let acc=r.acc, feitos=r.feitos;
    if(typeof curMed==="number"){ acc+=round05(curMed); feitos++; }
    const restantes=Math.max(0,NBIM-feitos);
    const faltam=Math.max(0,META-acc);
    const precisa = acc>=META?0:(restantes>0?faltam/restantes:Infinity);
    const pressao = acc>=META?0:Math.min(100,(precisa/10)*100); // quão apertado é o futuro
    const difScore = a.dif*100;                                  // quão difícil de recuperar
    const tipoProd = /Produção/.test(c.tipo);
    // prioridade de PROTEGER (não sacrificar): mistura aperto + dificuldade; produção entregue = pontos baratos, não jogue fora
    let prioridade = 0.55*pressao + 0.45*difScore + (tipoProd?8:0);
    prioridade = Math.min(100, prioridade);
    return {s,a,r,curMed,acc,feitos,restantes,precisa,pressao,difScore,tipoProd,prioridade,
            seguraSacrificar: Math.max(0, 100-prioridade)};
  }).sort((x,y)=>y.prioridade-x.prioridade);

  const top=itens[0], bottom=itens[itens.length-1];
  const why=it=>{
    const parts=[];
    parts.push(`${it.a.rotulo}`);
    if(it.acc>=META) parts.push("já fechou o ano ✓");
    else if(it.precisa>10) parts.push("já está em situação de recuperação");
    else parts.push(`acumulado ${fmt(it.acc)}/24, precisa de ${fmt(round05(it.precisa))}/bim`);
    if(it.a.dif>=0.9) parts.push("área difícil pra você → custa caro recuperar depois");
    else if(it.a.dif<=0.4) parts.push("seu ponto forte → fácil de recuperar");
    if(it.tipoProd) parts.push("é entrega: faltar zera a PC e derruba a média direto");
    return parts.join(" · ");
  };

  let html=`<div class="verdict go">
    <h3>⚖️ Veredito</h3>
    <div class="big">👉 <span class="pri">Priorize ${esc(top.s.name)}</span>${itens.length>2?` e ${esc(itens[1].s.name)}`:""}.<br>
    Pode sacrificar <span class="sac">${esc(bottom.s.name)}</span>${bottom.tipoProd?" (mas tente pelo menos entregar algo)":""}.</div>`;

  itens.forEach((it,idx)=>{
    const rk = idx===0?"r1":(idx===itens.length-1?"r3":"r2");
    const tag = idx===0?"PRIORIZE":(idx===itens.length-1?"PODE SACRIFICAR":"intermediária");
    html+=`<div class="rankrow">
      <div class="rk ${rk}">${idx+1}</div>
      <div class="body">
        <div class="nm">${esc(it.s.name)} <span class="muted" style="font-weight:600;font-size:.82rem">— ${tag} · ${it.tipoProd?"produção/trabalho":"prova"}</span></div>
        <div class="why">${why(it)}.</div>
        <div class="scorebar"><i style="width:${it.prioridade.toFixed(0)}%"></i></div>
        <div class="muted" style="font-size:.74rem;margin-top:3px">prioridade de proteger: ${it.prioridade.toFixed(0)}/100</div>
      </div></div>`;
  });
  html+=`<div class="hintbox" style="margin-top:14px"><b>Lógica:</b> quanto mais apertada a sua meta dos 24 pts na matéria <i>e</i> quanto mais difícil ela é pra você (Natureza/Linguagens), maior a prioridade de proteger. Humanas, onde você vai bem, é a mais segura pra deixar pra depois — dá pra recuperar.</div></div>`;
  document.getElementById("verdict").innerHTML=html;
}

/* ---------- backup ---------- */
function exportar(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download="painel-notas-backup.json"; a.click(); URL.revokeObjectURL(url);
}
/* Saneamento da fronteira de importação (V-06 da auditoria).
   Antes, o backup era aceito inteiro com `state=d` — a única checagem era
   existir a chave `subjects`. As notas dos bimestres entram em value="…" e os
   ids entram dentro de onclick="f('…')", então um arquivo preparado conseguia
   fechar o atributo ou a string JS. Aqui tudo é recortado e tipado.
   Ids não são escapados e sim restritos: em handler inline o navegador
   decodifica a entidade antes do JS ler, então escape de HTML não protege. */
function safeId(v){ return String(v==null?"":v).replace(/[^A-Za-z0-9_-]/g,""); }
function _txt(v,lim){ return String(v==null?"":v).slice(0,lim||200); }
function _nota(v){ const s=String(v==null?"":v).trim().slice(0,6); return /^[0-9]*[.,]?[0-9]*$/.test(s)?s:""; }

function saneiaNotas(d){
  if(!d || typeof d!=="object" || !Array.isArray(d.subjects)) throw 0;
  const areas=Object.keys(AREAS);
  const subjects=d.subjects.slice(0,60).map((s,i)=>({
    id: safeId(s&&s.id) || ("s"+i),
    name: _txt(s&&s.name,120),
    area: areas.indexOf(s&&s.area)>=0 ? s.area : areas[0],
    semAV2: !!(s&&s.semAV2),
    bims: (Array.isArray(s&&s.bims)?s.bims:[]).slice(0,NBIM).map(b=>({
      av1:_nota(b&&b.av1), av2:_nota(b&&b.av2), pc:_nota(b&&b.pc),
      ave:_nota(b&&b.ave), medManual:_nota(b&&b.medManual)
    }))
  }));
  // completa bimestres faltantes pra não quebrar o render
  subjects.forEach(s=>{ while(s.bims.length<NBIM) s.bims.push({av1:"",av2:"",pc:"",ave:"",medManual:""}); });
  const ids=subjects.map(s=>s.id);
  const conflitos=(Array.isArray(d.conflitos)?d.conflitos:[]).slice(0,20)
    .map(c=>({ subjId: ids.indexOf(safeId(c&&c.subjId))>=0 ? safeId(c.subjId) : (ids[0]||""),
               tipo: _txt(c&&c.tipo,40), nota: _nota(c&&c.nota) }))
    .filter(c=>c.subjId);
  const bimAtual=Math.min(NBIM,Math.max(1,Number(d.bimAtual)||2));
  if(!subjects.length) throw 0;
  return {subjects, conflitos, bimAtual};
}

function importar(ev){ const f=ev.target.files[0]; if(!f) return;
  if(f.size > 2*1024*1024){ alert("Backup grande demais (limite 2 MB)."); ev.target.value=""; return; }
  const r=new FileReader();
  r.onload=e=>{ try{ state=saneiaNotas(JSON.parse(e.target.result));
    const ing=state.subjects.find(s=>s.name==="Língua Inglesa"); if(ing&&!ing.semAV2) ing.semAV2=true;
    save(); renderAll(); alert("Backup importado!"); }catch(err){ alert("Arquivo inválido."); } ev.target.value=""; };
  r.readAsText(f); }
function resetSeed(){
  if(!confirm("Limpar tudo e começar o boletim do zero? Você vai perder as notas que digitou.")) return;
  state=SEED(); save(); openEd={}; renderAll();
  // sincroniza com a nuvem IMEDIATAMENTE — sem isso, uma falha de conexão nos 600ms
  // seguintes faria os dados antigos voltarem na próxima abertura.
  if(window.Cloud && Cloud.flushSync) Cloud.flushSync();
}

/* ---------- compartilhar risco com professores (opt-in) ----------
   Grava um resumo (sem notas cruas, só situação por matéria) em
   schools/{school}/series/{serie}/risco/{uid} — só o próprio aluno escreve;
   professor/coordenação leem pra acompanhar quem está em risco. */
/* V-05 da auditoria. O que mudou:
   - o texto dizia "anônimo" e mandava nome, e-mail e uid. Agora diz a verdade
     ANTES de enviar, e o e-mail saiu (a equipe já identifica pelo nome+turma,
     então guardar o e-mail junto não servia a finalidade nenhuma).
   - grava QUAL consentimento e QUANDO. Sem isso não há como provar que houve.
   - dá pra revogar, e a revogação apaga o documento de verdade. */
const CONSENT_VERSAO = "2026-08-24";
const CONSENT_TEXTO =
  "Compartilhar com professores e coordenação:\n\n" +
  "• seu NOME e sua turma\n" +
  "• a situação de cada matéria (ok / atenção / risco)\n" +
  "• o quanto você já somou da meta do ano\n\n" +
  "NÃO é anônimo — a equipe vê que é você.\n" +
  "Finalidade: acompanhamento pedagógico, para te oferecerem ajuda.\n" +
  "Suas notas exatas não são enviadas.\n\n" +
  "Você pode desfazer quando quiser, no mesmo botão.\n\nConfirma?";

let _riscoPending=false;
function riscoRef(serie){
  return Cloud.firestore().collection("schools").doc(Cloud.school())
    .collection("series").doc(serie).collection("risco").doc(Cloud.user.uid);
}
function compartilharRisco(){
  if(!(window.Cloud && Cloud.user && Cloud.firestore())){ alert("Faça login primeiro."); return; }
  if(_riscoPending){ alert("Já tem um envio em andamento, aguarde."); return; }
  const serie=(window.EP && window.EP.serie) || "3";
  let jaCompartilhou=false;
  try{ jaCompartilhou = localStorage.getItem("educa-risco-ok")==="1"; }catch(e){}

  if(jaCompartilhou){
    if(confirm("Você já compartilha seu resumo.\n\nOK = atualizar com as notas de agora\nCancelar = parar de compartilhar e apagar o que a escola vê")) {
      // segue e atualiza
    } else { revogarRisco(serie); return; }
  } else if(!confirm(CONSENT_TEXTO)) { return; }

  const materias=state.subjects.map(s=>{
    const r=resumo(s), st=statusOf(r);
    return {id:s.id, name:s.name, acc:r.acc, precisa:r.precisa, fechou:r.fechou,
            status: st.cls==="green"?"ok":(st.cls==="red"?"risco":"atencao")};
  }).sort((a,b)=> a.status==="risco"?-1:1);
  let accTotal=0; materias.forEach(m=>accTotal+=m.acc);
  const pctMeta=Math.round(Math.min(100, accTotal/(META*state.subjects.length)*100));
  const doc={ nome:Cloud.user.displayName||Cloud.user.email||"Aluno",
    serie:serie, turma:(window.EP && window.EP.turma)||"—", pctMeta, materias,
    atualizado:Date.now(), consentVersao:CONSENT_VERSAO, consentEm:Date.now() };
  _riscoPending=true;
  riscoRef(serie).set(doc).then(function(){
      _riscoPending=false;
      const b=document.getElementById("btn-risco"); if(b) b.classList.add("on");
      try{ localStorage.setItem("educa-risco-ok","1"); }catch(e){}
      alert("✅ Resumo compartilhado. Para desfazer, clique no mesmo botão e escolha Cancelar.");
    }).catch(function(e){ _riscoPending=false; alert("Não consegui compartilhar: "+(e&&e.message||"erro de conexão")); });
}
function revogarRisco(serie){
  _riscoPending=true;
  riscoRef(serie).delete().then(function(){
    _riscoPending=false;
    const b=document.getElementById("btn-risco"); if(b) b.classList.remove("on");
    try{ localStorage.removeItem("educa-risco-ok"); }catch(e){}
    alert("✅ Compartilhamento desfeito. Seu resumo foi apagado e a escola não vê mais.");
  }).catch(function(e){ _riscoPending=false; alert("Não consegui desfazer: "+(e&&e.message||"erro")); });
}
function riscoUI(){
  const b=document.getElementById("btn-risco"); if(!b) return;
  try{
    const ok=localStorage.getItem("educa-risco-ok")==="1";
    b.classList.toggle("on", ok);
    b.title = ok ? "Resumo compartilhado com professores ✓ (clique p/ atualizar)" : "Compartilhar resumo de risco com professores (opt-in)";
  }catch(e){}
}

/* ---------- relatório mensal em PDF (p/ pais) — jsPDF em app/vendor/jspdf.umd.min.js ---- */
function relatorioPDF(){
  if(!(window.jspdf && window.jspdf.jsPDF)){ alert("Biblioteca de PDF ainda não carregou. Aguarde um instante e tente de novo."); return; }
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:"pt",format:"a4"});
  const W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight();
  const al=Cloud && Cloud.user ? (Cloud.user.displayName||Cloud.user.email||"Aluno") : "Aluno";
  const serie=(window.EP && window.EP.serie)||"3";
  const mes=("01 02 03 04 05 06 07 08 09 10 11 12".split(" "))[new Date().getMonth()]+"/"+new Date().getFullYear();
  doc.setFillColor(31,122,48); doc.rect(0,0,W,46,"F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(15);
  doc.text("estuda+ · Relatório mensal de notas", 24, 29);
  doc.setFontSize(9); doc.setFont("helvetica","normal");
  doc.text("COC Atibaia", W-24, 29, {align:"right"});
  doc.setTextColor(40,40,40);
  doc.setFontSize(11); doc.setFont("helvetica","bold");
  doc.text(al+"  ·  "+serie+"ª série do EM · 2026", 24, 72);
  doc.setFontSize(9); doc.setFont("helvetica","normal");
  doc.text("Gerado em "+new Date().toLocaleString("pt-BR"), W-24, 72, {align:"right"});
  doc.setFontSize(9); doc.setTextColor(120,120,120);
  doc.text("Meta: 24 pts/ano por matéria (média 6,0). Valores = médias bimestrais (arredondadas ao 0,5).", 24, 88);
  let acc=0, n=0;
  state.subjects.forEach(s=>{ const m=resumo(s).acc; if(m!=null){ acc+=m; n++; } });
  const g=acc&&n ? (acc/n).toFixed(1).replace(".",",") : "—";
  doc.setFontSize(10); doc.setTextColor(40,40,40);
  doc.text("Média geral do mês: "+g, 24, 106);
  let y=130;
  doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(31,122,48);
  doc.text("Desempenho por matéria", 24, y); y+=6;
  doc.setDrawColor(200,200,200); doc.line(24,y,W-24,y); y+=14;
  doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(110,110,110);
  doc.text("Matéria",24,y); doc.text("B1",250,y,{align:"right"}); doc.text("B2",300,y,{align:"right"});
  doc.text("B3",350,y,{align:"right"}); doc.text("B4",400,y,{align:"right"});
  doc.text("Acum.",450,y,{align:"right"}); doc.text("Situação",536,y,{align:"right"}); y+=10;
  doc.setFont("helvetica","normal"); doc.setTextColor(40,40,40); doc.setFontSize(9);
  let riscoN=0;
  state.subjects.forEach(s=>{
    if(y>H-150){ doc.addPage(); y=30; }
    doc.setFont("helvetica","normal");
    doc.text(s.name,24,y);
    s.bims.forEach((b,i)=>{ const m=medArred(b, s.semAV2); doc.text(m==null?"—":fmt(m), 250+i*50, y, {align:"right"}); });
    const r=resumo(s), st=statusOf(r);
    doc.text(fmt(r.acc)+"/24", 450, y, {align:"right"});
    if(st.cls==="red"){ riscoN++; doc.setTextColor(200,40,60); }
    else if(st.cls==="gold"||st.cls==="orange") doc.setTextColor(176,118,4);
    else doc.setTextColor(30,120,70);
    doc.text(st.txt, 536, y, {align:"right"});
    doc.setTextColor(40,40,40); y+=13;
  });
  y+=12;
  if(y>H-140){ doc.addPage(); y=30; }
  doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(31,122,48);
  doc.text("Como interpretar", 24, y); y+=14;
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(60,60,60);
  const linhas=[
    "· O aluno precisa somar 24 pontos ao longo do ano em cada matéria (meta de média 6,0).",
    "· O acumulado mostra quanto já foi somado até o mês atual.",
    "· \"precisa de X/bim\" indica a média mínima necessária nos bimestres restantes — acima de 10 é impossível só com provas regulares.",
    "· Situações: ✓ Já fechou os 24 · Risco alto / Só com recuperação / Atenção · Tranquilo.",
    riscoN>0 ? "⚠ Há "+riscoN+" matéria(s) em risco neste mês. Vale uma conversa de acompanhamento." : "✅ Nenhuma matéria em risco neste mês."
  ];
  linhas.forEach(l=>{ doc.text(l,24,y); y+=13; });
  y+=8;
  if(y>H-60){ doc.addPage(); y=30; }
  // C2 — o relatório vai pros pais: é aqui que o aviso mais importa, porque é
  // o único lugar em que a nota sai do app e circula como se fosse documento.
  y+=6;
  doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(120,90,10);
  doc.text("Material de apoio — a nota oficial é a do sistema da escola.", 24, y); y+=11;
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(140,140,140);
  doc.text("As notas deste relatório foram digitadas pelo próprio aluno para simulação e acompanhamento.", 24, y); y+=10;
  doc.text("Em caso de divergência, vale sempre o registro oficial da escola.", 24, y); y+=12;
  doc.setFontSize(8); doc.setTextColor(150,150,150);
  doc.text("estuda+ · painel do aluno · gerado em "+new Date().toLocaleString("pt-BR"), 24, y);
  doc.save("relatorio-notas-"+mes.replace("/","-")+".pdf");
}

/* ---------- nav ---------- */
function tab(v){
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.v===v));
  document.querySelectorAll(".view").forEach(s=>s.classList.toggle("active",s.id==="view-"+v));
  if(v==="evolucao") renderEvolucao();
}

/* ================= EVOLUÇÃO / PROJEÇÃO / RISCO ================= */
window._evoSubj = ""; // "" = geral; senão id da matéria
function setEvoSubj(id){ window._evoSubj = id; renderEvolucao(); }

// médias (arredondadas) por bimestre de uma matéria; null onde ainda não tem nota
function bimVals(s){ return s.bims.map(b=>medArred(b, s.semAV2)); }
// série "Geral": média das matérias que têm nota, por bimestre
function geralVals(){
  const out=[];
  for(let i=0;i<NBIM;i++){
    let soma=0,n=0;
    state.subjects.forEach(s=>{ const m=medArred(s.bims[i], s.semAV2); if(m!=null){soma+=m;n++;} });
    out.push(n?soma/n:null);
  }
  return out;
}
// preenche os bimestres futuros (null) com a média do que já saiu → projeção
function projetar(vals){
  const feitos=vals.filter(v=>v!=null);
  const media=feitos.length? feitos.reduce((a,b)=>a+b,0)/feitos.length : null;
  const cheia=vals.map(v=> v!=null? v : media);
  const projFlag=vals.map(v=> v==null && media!=null);
  const total=cheia.reduce((a,b)=>a+(b||0),0);
  return {cheia, projFlag, media, total, feitos:feitos.length};
}

function evoChartSVG(vals){
  const W=320,H=180, padL=34,padR=14,padT=16,padB=26;
  const xs=i=> padL + i*((W-padL-padR)/(NBIM-1));
  const ys=v=> padT + (10-v)/10*(H-padT-padB);
  const {cheia, projFlag, media}=projetar(vals);
  // linha alvo (6,0)
  const yAlvo=ys(BASE);
  // grades horizontais 0,2,4,6,8,10
  let grid="";
  for(let g=0;g<=10;g+=2){ const y=ys(g); grid+=`<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width="1"/><text x="${padL-6}" y="${(y+3).toFixed(1)}" fill="var(--mut)" font-size="9" text-anchor="end">${g}</text>`; }
  // segmentos: sólido entre reais consecutivos; tracejado quando envolve projeção
  let segs="";
  for(let i=0;i<NBIM-1;i++){
    if(cheia[i]==null||cheia[i+1]==null) continue;
    const dash=(projFlag[i]||projFlag[i+1])?'stroke-dasharray="5 4"':'';
    segs+=`<line x1="${xs(i).toFixed(1)}" y1="${ys(cheia[i]).toFixed(1)}" x2="${xs(i+1).toFixed(1)}" y2="${ys(cheia[i+1]).toFixed(1)}" stroke="var(--cyan)" stroke-width="2.5" ${dash} stroke-linecap="round"/>`;
  }
  // pontos + rótulos
  let pts="";
  for(let i=0;i<NBIM;i++){
    if(cheia[i]==null) continue;
    const proj=projFlag[i];
    const cor=proj?"var(--mut)":(cheia[i]>=BASE?"var(--green)":"var(--red)");
    pts+=`<circle cx="${xs(i).toFixed(1)}" cy="${ys(cheia[i]).toFixed(1)}" r="4.5" fill="${proj?'var(--bg2)':cor}" stroke="${cor}" stroke-width="2"/>`;
    pts+=`<text x="${xs(i).toFixed(1)}" y="${(ys(cheia[i])-9).toFixed(1)}" fill="${cor}" font-size="10" font-weight="700" text-anchor="middle">${fmt(cheia[i])}</text>`;
  }
  // eixo x
  let xlab="";
  for(let i=0;i<NBIM;i++){ xlab+=`<text x="${xs(i).toFixed(1)}" y="${H-8}" fill="var(--mut)" font-size="10" text-anchor="middle">B${i+1}</text>`; }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:520px;display:block">
    ${grid}
    <line x1="${padL}" y1="${yAlvo.toFixed(1)}" x2="${W-padR}" y2="${yAlvo.toFixed(1)}" stroke="var(--gold)" stroke-width="1.2" stroke-dasharray="3 3"/>
    <text x="${W-padR}" y="${(yAlvo-4).toFixed(1)}" fill="var(--gold)" font-size="9" text-anchor="end">meta 6,0</text>
    ${segs}${pts}${xlab}
  </svg>`;
}

function renderEvolucao(){
  const box=document.getElementById("evoContent"); if(!box) return;
  const selId=window._evoSubj;
  const sel = selId? state.subjects.find(s=>s.id===selId) : null;
  const vals = sel? bimVals(sel) : geralVals();
  const pr = projetar(vals);

  // ---- resumo de risco (todas as matérias) ----
  const risco = state.subjects.map(s=>({s, r:resumo(s), st:statusOf(resumo(s))}))
    .filter(x=> x.st.cls==="red"||x.st.cls==="orange"||x.st.cls==="gold")
    .sort((a,b)=> b.r.precisa - a.r.precisa);
  let riscoHTML;
  if(risco.length===0){
    riscoHTML=`<div class="hintbox" style="border-left-color:var(--green)">✅ Nenhuma matéria em risco no momento. Segue assim!</div>`;
  } else {
    riscoHTML=risco.map(x=>{
      const pill=`<span class="stpill ${x.st.cls}">${x.st.txt}</span>`;
      const linha = x.r.restantes>0
        ? `precisa de <b>${x.r.precisa>10?"+10 (impossível)":fmt(round05(x.r.precisa))}</b>/bim nos ${x.r.restantes} restantes`
        : `fechou com ${fmt(x.r.acc)}/24`;
      return `<div class="rankrow" style="border-top-color:var(--line)">
        <div class="rk ${x.st.cls==='red'?'r1':(x.st.cls==='orange'?'r2':'r3')}">!</div>
        <div class="body"><div class="nm">${s_name(x.s)} ${pill}</div>
        <div class="why">Acumulado <b>${fmt(x.r.acc)}</b>/24 · ${linha}.</div></div></div>`;
    }).join("");
  }

  // ---- projeção do selecionado ----
  const alvoTotal = sel? META : META; // 24 tanto p/ matéria quanto p/ "geral por matéria"
  let projTxt;
  if(pr.media==null){
    projTxt=`Ainda não há notas lançadas para projetar. Lance as médias em <b>Painel por matéria</b>.`;
  } else if(sel){
    const fecha = pr.total>=META;
    projTxt=`Mantendo a média de <b>${fmt(pr.media)}</b> (ritmo atual), <b>${s_name(sel)}</b> fecha o ano com <b style="color:${fecha?'var(--green)':'var(--red)'}">${fmt(pr.total)}</b>/24 pts. ${fecha?'✅ Bate a meta.':`⚠️ Faltam <b>${fmt(META-pr.total)}</b> — precisa subir a média nos bimestres que faltam.`}`;
  } else {
    projTxt=`Na média geral você está tirando <b>${fmt(pr.media)}</b>. No ritmo atual, o ano fecha em torno de <b>${fmt(pr.media)}</b> de média — a meta é <b>6,0</b> em cada matéria. Veja abaixo quem está fora do trilho.`;
  }

  // ---- seletor ----
  const opts=[`<option value="">Média geral</option>`].concat(
    state.subjects.map(s=>`<option value="${esc(s.id)}" ${s.id===selId?"selected":""}>${s_name(s)}</option>`)).join("");

  box.innerHTML=`
    <div class="panelbox">
      <h2 style="font-size:1.05rem;margin-bottom:4px">📈 Evolução por bimestre</h2>
      <p class="muted" style="font-size:.86rem;margin-bottom:12px">A linha cheia é o que já saiu; a <b>tracejada</b> é a projeção mantendo seu ritmo. A linha amarela é a meta 6,0.</p>
      <select class="sel" onchange="setEvoSubj(this.value)" style="margin-bottom:12px">${opts}</select>
      ${evoChartSVG(vals)}
      <div class="hintbox" style="margin-top:14px">${projTxt}</div>
    </div>
    <div class="panelbox">
      <h2 style="font-size:1.05rem;margin-bottom:10px">🚨 Matérias que pedem atenção</h2>
      ${riscoHTML}
    </div>`;
}
function s_name(s){ return esc(s.name); }

function renderAll(){ renderCards(); if(document.getElementById("view-evolucao")&&document.getElementById("view-evolucao").classList.contains("active")) renderEvolucao(); }

load(); riscoUI(); renderAll();
