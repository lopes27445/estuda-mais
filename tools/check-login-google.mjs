/* ============================================================
   check-login-google.mjs — "o login com Google funciona neste site?"

   Testa o caminho real: baixa o firebase-config.js que o site serve de
   verdade, descobre qual authDomain aquele build usa, e pergunta ao Google
   se o handler daquele domínio está registrado. Não adianta olhar só o
   hostname: um site pode servir um build velho apontando para outro
   domínio — foi assim que o painel-e5373-lab.web.app ficou quebrado sem
   ninguém notar (31/08/2026).

   Um domínio só funciona se estiver em DUAS listas, em consoles diferentes
   (ver o comentário em public/app/firebase-config.js). O sintoma de faltar
   na segunda é uma página de erro DO GOOGLE — o app nem é avisado, então
   não há nada no console do navegador para achar.

   Roda sem login e sem credencial (usa a chave web, que é pública).

   Uso:  node tools/check-login-google.mjs [site ...]
   ============================================================ */
import vm from "node:vm";

const API_KEY = "AIzaSyD-nMbBNsHCr2nBq5hJrGcUqarLh9xtJxg";

const SITES = process.argv.slice(2).length ? process.argv.slice(2) : [
  "painel-e5373-lab2.web.app",   // beta — onde este repo publica
  "painel-e5373.web.app",        // produção
  "painel-e5373-lab.web.app",    // lab antigo — ainda no ar, ainda instalado em celulares
  "painel-e5373.firebaseapp.com" // domínio padrão do projeto
];

/* Qual authDomain o build publicado NESTE site usa. O arquivo decide isso em
   tempo de execução a partir do hostname, então é preciso executá-lo fingindo
   ser o navegador naquele endereço. */
async function authDomainDoSite(site) {
  const r = await fetch(`https://${site}/app/firebase-config.js`, { cache: "no-store" });
  if (!r.ok) throw new Error(`firebase-config.js HTTP ${r.status}`);
  const ctx = { window: {}, location: { hostname: site } };
  ctx.window.location = ctx.location;
  vm.createContext(ctx);
  vm.runInContext(await r.text(), ctx, { timeout: 2000 });
  const d = ctx.window.firebaseConfig && ctx.window.firebaseConfig.authDomain;
  if (!d) throw new Error("firebase-config.js não definiu authDomain");
  return d;
}

/* Desde 25/09/2026 a chave web só aceita pedidos vindos dos sites do
   projeto (restrição de referenciador no Google Cloud). Esta ferramenta roda
   fora do navegador, então se apresenta como o site de produção — que é de
   onde o app faz exatamente estas mesmas chamadas. */
const ORIGEM = { Referer: "https://painel-e5373.web.app/" };

/* Lista 1 — Firebase Console → Authentication → Authorized domains.
   Faltando aqui, o app recebe auth/unauthorized-domain (dá pra tratar em JS). */
async function lista1() {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${API_KEY}`, { headers: ORIGEM });
  if (!r.ok) throw new Error(`getProjectConfig HTTP ${r.status}`);
  return (await r.json()).authorizedDomains || [];
}

/* Lista 2 — Google Cloud Console → Credenciais → cliente OAuth 2.0 →
   "URIs de redirecionamento autorizados". Monta a MESMA URL de autorização
   que o app monta e vê se o Google mostra a tela de entrar ou a de erro. */
async function lista2(authDomain) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...ORIGEM },
    body: JSON.stringify({ providerId: "google.com", continueUri: `https://${authDomain}/__/auth/handler` })
  });
  if (!r.ok) throw new Error(`createAuthUri HTTP ${r.status}`);
  const g = await fetch((await r.json()).authUri, { redirect: "follow" });
  if (!/\/signin\/oauth\/error/.test(g.url)) return { ok: true };
  const b64 = new URL(g.url).searchParams.get("authError") || "";
  const cru = Buffer.from(b64, "base64").toString("utf8");
  return { ok: false, motivo: (cru.match(/[a-z_]{6,}/) || ["motivo desconhecido"])[0] };
}

const autorizados = await lista1();
let falhas = 0;

for (const site of SITES) {
  let authDomain;
  try {
    authDomain = await authDomainDoSite(site);
  } catch (e) {
    falhas++; console.log(`FALHA ${site}\n      não deu pra ler o build publicado: ${e.message}`);
    continue;
  }
  const via = authDomain === site ? "no próprio domínio" : `pelo handler de ${authDomain}`;
  const l1 = autorizados.includes(authDomain);
  let l2; try { l2 = await lista2(authDomain); } catch (e) { l2 = { ok: false, motivo: e.message }; }

  const ok = l1 && l2.ok;
  if (!ok) falhas++;
  console.log(`${ok ? "OK   " : "FALHA"} ${site}  (entra ${via})`);
  if (!l1) console.log(`      lista 1 — Firebase → Authentication → Authorized domains: falta ${authDomain}`);
  if (!l2.ok) console.log(`      lista 2 — Cloud Console → cliente OAuth 2.0 → URIs de redirecionamento:`);
  if (!l2.ok) console.log(`               falta https://${authDomain}/__/auth/handler   [${l2.motivo}]`);
  if (!ok && authDomain !== site) console.log(`      (este site serve um build que aponta para outro domínio — publicar o build atual aqui também resolveria)`);
}

if (falhas) {
  console.log(`\n${falhas} site(s) com o login do Google quebrado. Quem abrir por eles vê uma página de erro do Google.`);
  console.log("Ao editar a lista 2: SOMAR o URI novo, não substituir os que já estão lá.");
  process.exitCode = 1;
} else {
  console.log("\nLogin com Google liberado em todos os sites.");
}
