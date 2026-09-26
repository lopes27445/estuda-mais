/* ============================================================
   credencial.mjs — com que identidade as ferramentas de admin falam com o
   Firebase.

   1º: a chave de serviço em .secrets/service-account.json, se existir.
   2º: o login que o Firebase CLI já tem nesta máquina (`npx firebase login`).

   O 2º caminho existe desde 25/09/2026 e é o preferido: a chave de serviço é
   um arquivo com poder total sobre o projeto, que não expira e que alguém
   precisa lembrar de nunca commitar. O login do CLI é o da própria dona do
   projeto, fica no perfil do Windows e é revogável em
   myaccount.google.com → Segurança → Apps de terceiros.
   ============================================================ */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { cert, refreshToken } from "firebase-admin/app";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
export const PROJETO = "painel-e5373";

export function credencial() {
  const chave = resolve(raiz, ".secrets/service-account.json");
  if (existsSync(chave)) {
    return { credential: cert(JSON.parse(readFileSync(chave, "utf8"))), via: "chave de serviço" };
  }
  let tokens, api;
  try {
    const { configstore } = require("firebase-tools/lib/configstore.js");
    api = require("firebase-tools/lib/api.js");
    tokens = configstore.get("tokens");
  } catch (e) { tokens = null; }
  if (!tokens || !tokens.refresh_token) {
    throw new Error("Sem credencial: nem .secrets/service-account.json nem login do Firebase CLI.\n" +
      "Rode `npx firebase login` (recomendado) ou gere a chave de serviço.");
  }
  return {
    credential: refreshToken({
      type: "authorized_user",
      client_id: api.clientId(),
      client_secret: api.clientSecret(),
      refresh_token: tokens.refresh_token
    }),
    via: "login do Firebase CLI"
  };
}
