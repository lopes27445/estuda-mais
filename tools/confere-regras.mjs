/* ============================================================
   confere-regras.mjs — "as regras que estão NO AR são as deste repositório?"

   Por que existe: em 25/09/2026 o firestore.rules daqui tinha 503 linhas e
   três revisões de segurança (05/09, 22/09, 25/09). O que estava PUBLICADO no
   projeto era a versão de 26/08, com 289 linhas. Um mês de correções — o
   vazamento de alunos para qualquer professor, o mural lido por qualquer
   conta, a exclusão de dados da LGPD — existia só no git. O CI testava o
   arquivo; ninguém testava se o arquivo tinha ido ao ar.

   Só LÊ. Usa o login que o Firebase CLI já tem nesta máquina
   (`npx firebase login`), não precisa de chave de serviço.

   Uso:   node tools/confere-regras.mjs
   Saída: 0 = publicado igual ao arquivo · 1 = diferente · 2 = não consegui ler
   ============================================================ */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const PROJETO = "painel-e5373";

function normaliza(s) { return String(s).replace(/\r\n/g, "\n").trim(); }

async function token() {
  // internos do firebase-tools (versão fixada no package-lock)
  const auth = require("firebase-tools/lib/auth.js");
  const { configstore } = require("firebase-tools/lib/configstore.js");
  const t = configstore.get("tokens");
  if (!t || !t.refresh_token) throw new Error("Firebase CLI sem login. Rode: npx firebase login");
  const r = await auth.getAccessToken(t.refresh_token, ["https://www.googleapis.com/auth/cloud-platform"]);
  return r.access_token;
}

async function main() {
  const at = await token();
  const H = { Authorization: "Bearer " + at, "x-goog-user-project": PROJETO };
  const get = async (u) => {
    const r = await fetch(u, { headers: H });
    if (!r.ok) throw new Error(`${u} → HTTP ${r.status}`);
    return r.json();
  };

  const rel = await get(`https://firebaserules.googleapis.com/v1/projects/${PROJETO}/releases/cloud.firestore`);
  const rs = await get(`https://firebaserules.googleapis.com/v1/${rel.rulesetName}`);
  const noAr = normaliza(rs.source.files.map((f) => f.content).join("\n"));
  const local = normaliza(readFileSync(resolve(raiz, "firestore.rules"), "utf8"));

  console.log(`Publicado em: ${rel.updateTime}  (${noAr.split("\n").length} linhas)`);
  console.log(`Repositório:  firestore.rules (${local.split("\n").length} linhas)`);
  if (noAr === local) {
    console.log("✅ As regras no ar são exatamente as deste repositório.");
    return 0;
  }
  const a = noAr.split("\n"), b = local.split("\n");
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  console.log(`❌ DIFERENTES. Primeira divergência na linha ${i + 1}:`);
  console.log(`   no ar: ${a[i] === undefined ? "(fim do arquivo)" : a[i].trim()}`);
  console.log(`   aqui:  ${b[i] === undefined ? "(fim do arquivo)" : b[i].trim()}`);
  console.log("   Para publicar (SÓ desta pasta — regra vale para o projeto inteiro):");
  console.log("   npx firebase deploy --only firestore:rules");
  return 1;
}

main().then((c) => process.exit(c)).catch((e) => { console.error("Não consegui conferir:", e.message); process.exit(2); });
