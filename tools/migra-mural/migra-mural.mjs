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
  const salas = await db.collection(`schools/${ESCOLA}/salas`).get();
  let achados = 0, escritos = 0;
  const lote = db.batch();

  for (const sala of salas.docs) {
    const alunos = await sala.ref.collection("alunos").where("status", "==", "aprovado").get();
    for (const a of alunos.docs) {
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
  }
  if (executar && escritos) await lote.commit();
  console.log(`\n  aprovados encontrados: ${achados} · vínculos a criar: ${escritos}`);
}

/* ------------------------------------------------------------------ posts
   O caminho antigo não sabe a série — é exatamente o defeito que estamos
   corrigindo. Ela é reconstruída pelo itemId, olhando onde a prova/PC foi
   publicada. Post cujo item sumiu do calendário NÃO é descartado em silêncio:
   é listado no fim para decisão humana. */
async function mapaItemParaSerie() {
  const mapa = new Map();
  for (const serie of SERIES) {
    for (const tipo of ["provas", "pc"]) {
      const q = await db.collection(`schools/${ESCOLA}/series/${serie}/${tipo}`).get();
      q.docs.forEach((d) => mapa.set(d.id, serie));
    }
  }
  return mapa;
}

async function posts() {
  const mapa = await mapaItemParaSerie();
  console.log(`  itens de calendário conhecidos: ${mapa.size}\n`);
  let movidos = 0;
  const orfaos = [];

  for (const [origem, destinoCol] of Object.entries(AMBIENTES)) {
    const itens = await db.collection(origem).get();
    if (itens.empty) continue;
    console.log(`  --- ${origem} → ${destinoCol} (${itens.size} item(ns)) ---`);

    for (const item of itens.docs) {
      const serie = mapa.get(item.id);
      const ps = await item.ref.collection("posts").get();
      if (ps.empty) continue;

      if (!serie) {
        orfaos.push({ origem, itemId: item.id, posts: ps.size });
        continue;
      }
      const lote = db.batch();
      ps.docs.forEach((p) => {
        const destino = db.doc(
          `schools/${ESCOLA}/series/${serie}/${destinoCol}/${item.id}/posts/${p.id}`
        );
        if (executar) lote.set(destino, p.data());
      });
      movidos += ps.size;
      console.log(`    ${item.id} → série ${serie} · ${ps.size} post(s)`);
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
  for (const origem of Object.keys(AMBIENTES)) {
    const itens = await db.collection(origem).get();
    for (const item of itens.docs) {
      const ps = await item.ref.collection("posts").get();
      total += ps.size;
      console.log(`  - ${origem}/${item.id} · ${ps.size} post(s)`);
      if (executar) {
        const lote = db.batch();
        ps.docs.forEach((p) => lote.delete(p.ref));
        await lote.commit();
        await item.ref.delete();
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
