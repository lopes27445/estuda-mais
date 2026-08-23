/**
 * Testes das regras do Firestore — Estuda+
 *
 * Rodar com:  npm test        (sobe o emulador sozinho)
 *
 * Cada teste corresponde a um item da auditoria de 23/08/2026.
 * Os cenários marcados "NÃO" passavam antes da correção — é isso que as
 * vulnerabilidades V-01, V-02, V-03 e V-11 significam na prática.
 *
 * Nota de implementação: o handle do Firestore de cada contexto é criado UMA
 * vez, no before(). Chamar ctx.firestore() de novo no meio do teste estoura
 * "Firestore has already been started and its settings can no longer be
 * changed" — é limitação da biblioteca, não das regras.
 */
import { describe, it, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

const ESCOLA = "coc-atibaia";
const OUTRA = "outra-escola";

let env;
let alunoDb, profDb, coordDb, naoVerifDb;

before(async () => {
  env = await initializeTestEnvironment({
    // prefixo "demo-" faz o Firebase tratar como projeto offline: o emulador
    // nunca tenta falar com um projeto real, e nada daqui toca produção.
    projectId: "demo-estuda-mais",
    firestore: {
      // RULES_FILE permite rodar a mesma suíte contra as regras ANTIGAS e
      // conferir que os cenários proibidos de fato passavam antes — teste que
      // passa dos dois lados não está testando nada.
      rules: readFileSync(
        process.env.RULES_FILE || new URL("../firestore.rules", import.meta.url),
        "utf8"
      ),
      host: "127.0.0.1",
      port: 8080
    }
  });

  alunoDb = env.authenticatedContext("uid-aluno", {
    email: "aluno@escola.com", email_verified: true
  }).firestore();

  profDb = env.authenticatedContext("uid-prof", {
    email: "prof@escola.com", email_verified: true
  }).firestore();

  coordDb = env.authenticatedContext("uid-coord", {
    email: "coord@escola.com", email_verified: true
  }).firestore();

  // conta de senha criada com o e-mail de um professor, ainda sem confirmar (V-02)
  naoVerifDb = env.authenticatedContext("uid-falso", {
    email: "prof@escola.com", email_verified: false
  }).firestore();
});

after(async () => {
  if (env) await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `schools/${ESCOLA}/staff/prof@escola.com`), {
      role: "professor", addedBy: "coord@escola.com", addedAt: Date.now()
    });
    await setDoc(doc(db, `schools/${ESCOLA}/staff/coord@escola.com`), {
      role: "coordenacao", addedBy: "master", addedAt: Date.now()
    });
    // perfil legado: já tem role/schoolId gravados pelo cliente antigo.
    // A regra nova precisa continuar aceitando updates neste doc.
    await setDoc(doc(db, "users/uid-aluno"), {
      email: "aluno@escola.com", nome: "Aluno Teste",
      role: "aluno", schoolId: ESCOLA, serie: "3", turma: "A", vestibulares: []
    });
    await setDoc(doc(db, "users/uid-outro"), { email: "outro@escola.com", nome: "Outro" });
    await setDoc(doc(db, "users/uid-outro/panels/notas-lab2"), {
      blob: { "painel-notas-3em-2026": "{}" }, updatedAt: Date.now()
    });
    await setDoc(doc(db, `schools/${ESCOLA}/series/3/provas/p1`), { disc: "Matemática" });
    await setDoc(doc(db, `schools/${OUTRA}/series/3/provas/p1`), { disc: "Física" });
  });
});

/* ============ V-01 — escalada de privilégio pelo professor ============ */
describe("V-01 · só coordenação mexe no staff", () => {
  it("1. professor NÃO cria membro novo com papel de coordenação", async () => {
    await assertFails(
      setDoc(doc(profDb, `schools/${ESCOLA}/staff/atacante@example.com`), { role: "coordenacao" })
    );
  });

  it("2. professor NÃO altera o doc de staff da coordenadora", async () => {
    await assertFails(
      setDoc(doc(profDb, `schools/${ESCOLA}/staff/coord@escola.com`), { role: "professor" })
    );
  });

  it("3. professor NÃO remove a coordenadora", async () => {
    await assertFails(deleteDoc(doc(profDb, `schools/${ESCOLA}/staff/coord@escola.com`)));
  });

  it("4. professor NÃO se promove a coordenação", async () => {
    await assertFails(
      setDoc(doc(profDb, `schools/${ESCOLA}/staff/prof@escola.com`), { role: "coordenacao" })
    );
  });

  it("5. coordenação CONSEGUE cadastrar um professor", async () => {
    await assertSucceeds(
      setDoc(doc(coordDb, `schools/${ESCOLA}/staff/novo@escola.com`), {
        role: "professor", addedBy: "coord@escola.com", addedAt: Date.now()
      })
    );
  });
});

/* ============ V-02 — papel institucional sem e-mail verificado ============ */
describe("V-02 · e-mail não verificado não tem poder de staff", () => {
  it("6. conta não verificada com e-mail de professor NÃO publica calendário", async () => {
    await assertFails(
      setDoc(doc(naoVerifDb, `schools/${ESCOLA}/series/3/provas/nova`), { disc: "Invadida" })
    );
  });

  it("7. professor verificado CONSEGUE publicar calendário", async () => {
    await assertSucceeds(
      setDoc(doc(profDb, `schools/${ESCOLA}/series/3/provas/nova`), { disc: "Biologia" })
    );
  });
});

/* ============ V-03 — isolamento entre escolas ============ */
describe("V-03 · não se atravessa para outra escola", () => {
  it("8. aluno NÃO lê o calendário de outra escola", async () => {
    await assertFails(getDoc(doc(alunoDb, `schools/${OUTRA}/series/3/provas/p1`)));
  });

  it("9. aluno NÃO grava resumo de risco em outra escola", async () => {
    await assertFails(
      setDoc(doc(alunoDb, `schools/${OUTRA}/series/3/risco/uid-aluno`), {
        nome: "Aluno", email: "aluno@escola.com", serie: "3", turma: "A",
        pctMeta: 40, materias: [], atualizado: Date.now()
      })
    );
  });

  it("10. aluno NÃO grava risco numa série diferente da do caminho", async () => {
    await assertFails(
      setDoc(doc(alunoDb, `schools/${ESCOLA}/series/3/risco/uid-aluno`), {
        nome: "Aluno", email: "aluno@escola.com", serie: "1", turma: "A",
        pctMeta: 40, materias: [], atualizado: Date.now()
      })
    );
  });

  it("11. aluno CONSEGUE gravar o próprio risco na própria escola/série", async () => {
    await assertSucceeds(
      setDoc(doc(alunoDb, `schools/${ESCOLA}/series/3/risco/uid-aluno`), {
        nome: "Aluno", email: "aluno@escola.com", serie: "3", turma: "A",
        pctMeta: 40, materias: [], atualizado: Date.now()
      })
    );
  });

  it("12. aluno NÃO grava risco no lugar de outro aluno", async () => {
    await assertFails(
      setDoc(doc(alunoDb, `schools/${ESCOLA}/series/3/risco/uid-outro`), {
        nome: "Outro", email: "outro@escola.com", serie: "3", turma: "A",
        pctMeta: 10, materias: [], atualizado: Date.now()
      })
    );
  });
});

/* ============ V-11 — perfil autorreferente ============ */
describe("V-11 · aluno não edita os próprios campos de autoridade", () => {
  it("13. aluno NÃO grava role no próprio perfil", async () => {
    await assertFails(
      setDoc(doc(alunoDb, "users/uid-aluno"), { role: "coordenacao" }, { merge: true })
    );
  });

  it("14. aluno NÃO grava schoolId no próprio perfil", async () => {
    await assertFails(
      setDoc(doc(alunoDb, "users/uid-aluno"), { schoolId: "outra-escola" }, { merge: true })
    );
  });

  it("15. aluno CONSEGUE atualizar série, turma e vestibulares (perfil legado com role gravado)", async () => {
    await assertSucceeds(
      setDoc(doc(alunoDb, "users/uid-aluno"),
        { serie: "2", turma: "B", vestibulares: ["FUVEST"] }, { merge: true })
    );
  });

  it("16. aluno NÃO grava campo desconhecido no perfil", async () => {
    await assertFails(
      setDoc(doc(alunoDb, "users/uid-aluno"), { admin: true }, { merge: true })
    );
  });
});

/* ============ isolamento entre usuários e formato dos painéis ============ */
describe("Dados pessoais e painéis", () => {
  it("17. aluno NÃO lê o painel de notas de outro aluno", async () => {
    await assertFails(getDoc(doc(alunoDb, "users/uid-outro/panels/notas-lab2")));
  });

  it("18. aluno CONSEGUE gravar o próprio painel no formato esperado", async () => {
    await assertSucceeds(
      setDoc(doc(alunoDb, "users/uid-aluno/panels/notas-lab2"), {
        blob: { "painel-notas-3em-2026": "{}" }, updatedAt: Date.now()
      })
    );
  });

  it("19. aluno NÃO grava campo fora do formato no painel", async () => {
    await assertFails(
      setDoc(doc(alunoDb, "users/uid-aluno/panels/notas-lab2"), {
        blob: {}, updatedAt: Date.now(), executar: "payload"
      })
    );
  });
});

/* ============ leitura da lista de staff ============ */
describe("Lista de staff não é pública", () => {
  it("20. aluno NÃO lê o doc de staff de outra pessoa", async () => {
    await assertFails(getDoc(doc(alunoDb, `schools/${ESCOLA}/staff/coord@escola.com`)));
  });

  it("21. aluno CONSEGUE ler o PRÓPRIO doc de staff (é como o login descobre o papel)", async () => {
    await assertSucceeds(getDoc(doc(alunoDb, `schools/${ESCOLA}/staff/aluno@escola.com`)));
  });

  it("22. aluno NÃO lista a coleção inteira de staff", async () => {
    await assertFails(getDocs(collection(alunoDb, `schools/${ESCOLA}/staff`)));
  });

  it("23. coordenação CONSEGUE listar o staff (tela de gestão)", async () => {
    await assertSucceeds(getDocs(collection(coordDb, `schools/${ESCOLA}/staff`)));
  });
});
