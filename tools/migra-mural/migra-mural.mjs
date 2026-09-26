/**
 * migra-mural.mjs — tira o mural da raiz do banco (A1 / V-09).
 *
 * O PROBLEMA
 * O mural vivia em `murals/{itemId}/posts/{postId}`, na RAIZ. Esse caminho não
 * carrega escola nem série, então a regra não tinha o que checar e a condição
 * inteira virava "está logado": QUALQUER conta criada no Estuda+ — inclusive
 * sem matrícula, inclusive sem relação nenhuma com a escola — lia todo recado
 * de toda prova de toda turma. E era enumerável.
 *
 * O DESTINO
 *   schools/{escola}/series/{serie}/{itens|itens-lab2|itens-lab3}/{itemId}/posts/
 * Lá a regra exige `series/{serie}/membros/{uid}`, que só a coordenação grava.
 *
 * ANTES DE RODAR: baixe a chave de serviço em
 *   console.firebase.google.com → ⚙️ Configurações do projeto
 *   → "Contas de serviço" → "Gerar nova chave privada"
 * e salve como  .secrets/service-account.json  (já está no .gitignore).
 * É a MESMA chave que o set-admin-claim.mjs pede (V-10).
 *
 * USO — sempre em dois tempos, nunca direto:
 *   node tools/migra-mural/migra-mural.mjs backfill           → só relata
 *   node tools/migra-mural/migra-mural.mjs backfill --executar
 *   node tools/migra-mural/migra-mural.mjs posts
 *   node tools/migra-mural/migra-mural.mjs posts --executar
 *   node tools/migra-mural/migra-mural.mjs limpeza --executar  (só no fim)
 *
 * Sem --executar nada é escrito. A sequência completa, com o plano de volta,
 * está no RUNBOOK.md ao lado.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { initializeApp } from "firebase-admin/app";
import { credencial, PROJETO } from "../credencial.mjs";
import { getFirestore } from "firebase-admin/firestore";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const chave = resolve(raiz, ".secrets/service-account.json");
const ESCOLA = "coc-atibaia";
const SERIES = ["1", "2", "3"];
/* de onde → para onde. O sufixo de ambiente PRECISA ser preservado: sem ele o
   mural do lab3 cairia no de produção, que é justamente o que o env.js evita. */
const AMBIENTES = {
  "murals": "itens",
  "murals-lab2": "itens-lab2",
  "murals-lab3": "itens-lab3"
};

const fase = process.argv[2];
const executar = process.argv.includes("--executar");

if (!["backfill", "posts", "limpeza"].includes(fase)) {
  console.error("Uso: node tools/migra-mural/migra-mural.mjs <backfill|posts|limpeza> [--executar]");
  process.exit(1);
}
/* Esta ferramenta PRECISA da chave de serviço. O set-admin-claim roda com o
   login do Firebase CLI, mas o cliente do Firestore do firebase-admin só
   aceita chave de serviço ou ADC — com o login do CLI ele recusa na hora de
   abrir o banco (conferido em 25/09/2026). */
if (!existsSync(chave)) {
  console.error("Falta .secrets/service-account.json — veja o cabeçalho deste arquivo.\n" +
    "(Esta ferramenta não funciona com o login do Firebase CLI; só com a chave.)");
  process.exit(1);
}
const cred = credencial();
initializeApp({ credential: cred.credential, projectId: PROJETO });
console.log(`(credencial: ${cred.via})`);
const db = getFirestore();

const marca = executar ? "APLICANDO" : "SIMULAÇÃO (nada será escrito)";
console.log(`\n=== migra-mural · fase "${fase}" · ${marca} ===\n`);

/* ---------------------------------------------------------------- backfill
   Todo aluno JÁ aprovado precisa do vínculo, senão o mural fecha na cara de
   quem sempre teve acesso. A série sai do id da sala ("3A" → "3"). */
async function backfill() {
  /* CORREÇÃO 26/09/2026 — mesmo defeito do posts(): a matrícula é gravada em
     `salas/{sala}/alunos/{uid}` sem ninguém criar `salas/{sala}`, e listar
     `salas` não devolve documento fantasma. A simulação dizia "0 aprovados"
     com 1 aprovado no banco. Agora busca por collectionGroup e filtra aqui
     (filtrar no servidor exigiria um índice de grupo que não existe). */
  const grupo = await db.collectionGroup("alunos").get();
  const aprovados = grupo.docs.filter((a) =>
    a.ref.path.startsWith(`schools/${ESCOLA}/salas/`) && a.get("status") === "aprovado");
  let achados = 0, escritos = 0;
  const lote = db.batch();

  for (const a of aprovados) {
    const sala = a.ref.parent.parent;              // salas/{sala}
    const serie = String(sala.id).charAt(0);
    if (!SERIES.includes(serie)) {
      console.warn(`  ! sala "${sala.id}" não começa com série conhecida — pulando ${a.id}`);
      continue;
    }
    achados++;
    const destino = db.doc(`schools/${ESCOLA}/series/${serie}/membros/${a.id}`);
    const ja = await destino.get();
    if (ja.exists) continue;
    escritos++;
    console.log(`  + membro ${serie}/${a.id}  (sala ${sala.id})`);
    if (executar) {
      lote.set(destino, {
        uid: a.id, nome: (a.data() || {}).nome || "Aluno",
        sala: sala.id, desde: Date.now()
      });
    }
  }
  if (executar && escritos) await lote.commit();
  console.log(`\n  aprovados encontrados: ${achados} · vínculos a criar: ${escritos}`);
}

/* ------------------------------------------------------------------ posts
   O caminho antigo não sabe a série — é exatamente o defeito que estamos
   corrigindo. Ela é reconstruída pelo itemId, olhando onde a prova/PC foi
   publicada. Post cujo item sumiu do calendário NÃO é descartado em silêncio:
   é listado no fim para decisão humana. */
/* Provas e produções EMBUTIDAS no app (PROVAS/PC em estudos.app.js) só
   aparecem para a 3ª série — builtin() devolve [] para as outras —, então um
   post num item embutido é da 3ª. Sem isto, o recado de `murals/pr-ing`
   (achado em 26/09/2026) ficava órfão. Os ids saem do próprio fonte para não
   existir uma segunda lista que desatualiza. */
function itensEmbutidos() {
  const src = readFileSync(resolve(raiz, "public/app/estudos.app.js"), "utf8");
  return [...src.matchAll(/id:"((?:pr|pc)-[a-z0-9-]+)"/g)].map((m) => m[1]);
}

async function mapaItemParaSerie() {
  const mapa = new Map();
  for (const serie of SERIES) {
    for (const tipo of ["provas", "pc"]) {
      const q = await db.collection(`schools/${ESCOLA}/series/${serie}/${tipo}`).get();
      q.docs.forEach((d) => mapa.set(d.id, serie));
    }
  }
  for (const id of itensEmbutidos()) if (!mapa.has(id)) mapa.set(id, "3");
  return mapa;
}

/* CORREÇÃO 26/09/2026: a versão anterior listava `db.collection("murals")`
   e descia em cada item. Só que o app antigo gravava o recado direto em
   `murals/{item}/posts/{post}` SEM criar `murals/{item}` — no Firestore isso
   é um documento "fantasma", que a listagem da coleção não devolve. A
   simulação dizia "0 posts" com o mural cheio, e a limpeza nunca apagaria
   nada. Agora os posts são achados por collectionGroup e agrupados pelo item
   do caminho, exista o documento pai ou não. */
async function postsAntigos() {
  const todos = await db.collectionGroup("posts").get();
  const porOrigem = {};
  for (const p of todos.docs) {
    const item = p.ref.parent.parent;            // murals/{item}
    const col = item && item.parent;             // murals
    if (!col || col.parent !== null) continue;   // só coleções de raiz
    if (!(col.id in AMBIENTES)) continue;
    const grupo = (porOrigem[col.id] = porOrigem[col.id] || new Map());
    if (!grupo.has(item.id)) grupo.set(item.id, []);
    grupo.get(item.id).push(p);
  }
  return porOrigem;
}

async function posts() {
  const mapa = await mapaItemParaSerie();
  console.log(`  itens de calendário conhecidos: ${mapa.size}\n`);
  let movidos = 0;
  const orfaos = [];
  const porOrigem = await postsAntigos();

  for (const [origem, destinoCol] of Object.entries(AMBIENTES)) {
    const itens = porOrigem[origem];
    if (!itens || !itens.size) continue;
    console.log(`  --- ${origem} → ${destinoCol} (${itens.size} item(ns)) ---`);

    for (const [itemId, ps] of itens) {
      const serie = mapa.get(itemId);
      if (!serie) {
        orfaos.push({ origem, itemId, posts: ps.length });
        continue;
      }
      const lote = db.batch();
      ps.forEach((p) => {
        const destino = db.doc(
          `schools/${ESCOLA}/series/${serie}/${destinoCol}/${itemId}/posts/${p.id}`
        );
        if (executar) lote.set(destino, p.data());
      });
      movidos += ps.length;
      console.log(`    ${itemId} → série ${serie} · ${ps.length} post(s)`);
      if (executar) await lote.commit();
    }
  }

  console.log(`\n  posts movidos: ${movidos}`);
  if (orfaos.length) {
    console.log(`\n  ⚠️  ${orfaos.length} item(ns) SEM série correspondente no calendário.`);
    console.log("     Não foram movidos e não foram apagados. Decida um a um:");
    orfaos.forEach((o) => console.log(`       ${o.origem}/${o.itemId} · ${o.posts} post(s)`));
  }
}

/* ---------------------------------------------------------------- limpeza
   Só depois de conferir o mural novo no app, com aluno de verdade. Apagar é
   o único passo sem volta desta migração. */
async function limpeza() {
  if (!executar) {
    console.log("  Simulação: listando o que SERIA apagado.\n");
  }
  let total = 0;
  const porOrigem = await postsAntigos();   // mesma correção do posts(): pais fantasmas
  for (const origem of Object.keys(AMBIENTES)) {
    const itens = porOrigem[origem];
    if (!itens) continue;
    for (const [itemId, ps] of itens) {
      total += ps.length;
      console.log(`  - ${origem}/${itemId} · ${ps.length} post(s)`);
      if (executar) {
        const lote = db.batch();
        ps.forEach((p) => lote.delete(p.ref));
        await lote.commit();
        await db.doc(`${origem}/${itemId}`).delete();
      }
    }
  }
  console.log(`\n  posts ${executar ? "apagados" : "que seriam apagados"}: ${total}`);
}

const fases = { backfill, posts, limpeza };
fases[fase]()
  .then(() => {
    if (!executar) console.log("\n  Nada foi escrito. Repita com --executar quando conferir.\n");
    process.exit(0);
  })
  .catch((e) => { console.error("\nFALHOU:", e && e.message || e); process.exit(1); });
