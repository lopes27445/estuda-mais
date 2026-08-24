/**
 * set-admin-claim.mjs — dá (ou tira) o poder de administrador técnico.
 *
 * Por que existe (V-10 da auditoria): hoje o poder global do sistema é um
 * e-mail escrito dentro das regras de segurança e do cloud.js. Está num
 * repositório público, não tem rotação e não tem auditoria. A correção é o
 * poder virar uma *custom claim* no token — uma marca que só o Admin SDK
 * consegue colocar, e que o cliente não tem como forjar.
 *
 * E o Admin SDK NÃO exige Cloud Functions nem plano pago: roda aqui mesmo,
 * na sua máquina, uma vez.
 *
 * USO:
 *   node tools/set-admin-claim.mjs email@dominio.com          → concede
 *   node tools/set-admin-claim.mjs email@dominio.com --tirar  → revoga
 *
 * ANTES: baixe a chave de serviço em
 *   console.firebase.google.com → ⚙️ Configurações do projeto
 *   → aba "Contas de serviço" → "Gerar nova chave privada"
 * e salve como  .secrets/service-account.json  (a pasta já está no .gitignore).
 *
 * DEPOIS: saia e entre de novo no app. A claim só aparece quando o token
 * renova — sem isso parece que não funcionou.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const chave = resolve(raiz, ".secrets/service-account.json");

const email = process.argv[2];
const tirar = process.argv.includes("--tirar");

if (!email || !email.includes("@")) {
  console.error("Uso: node tools/set-admin-claim.mjs email@dominio.com [--tirar]");
  process.exit(1);
}
if (!existsSync(chave)) {
  console.error("Não achei a chave de serviço em:\n  " + chave +
    "\n\nGere em: console.firebase.google.com → Configurações do projeto → Contas de serviço" +
    "\n→ Gerar nova chave privada. Salve com esse nome exato.");
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(readFileSync(chave, "utf8"))) });

try {
  const u = await getAuth().getUserByEmail(email);
  const claims = { ...(u.customClaims || {}) };
  if (tirar) delete claims.admin; else claims.admin = true;

  await getAuth().setCustomUserClaims(u.uid, claims);

  console.log((tirar ? "✅ Removido" : "✅ Concedido") + " admin para " + email);
  console.log("   uid: " + u.uid);
  console.log("   claims agora: " + JSON.stringify(claims));
  console.log("\n⚠️  Saia e entre de novo no app para o token renovar.");
  console.log("   Sem isso a mudança não aparece, e parece que não funcionou.");
} catch (e) {
  if (e && e.code === "auth/user-not-found") {
    console.error("Não existe conta com o e-mail " + email + ".");
    console.error("A pessoa precisa ter entrado no app pelo menos uma vez antes.");
  } else {
    console.error("Falhou: " + (e && e.message || e));
  }
  process.exit(1);
}
