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
        nome: "Aluno", serie: "3", turma: "A", pctMeta: 40, materias: [],
        atualizado: Date.now(), consentVersao: "1", consentEm: Date.now()
      })
    );
  });

  it("10. aluno NÃO grava risco numa série diferente da do caminho", async () => {
    await assertFails(
      setDoc(doc(alunoDb, `schools/${ESCOLA}/series/3/risco/uid-aluno`), {
        nome: "Aluno", serie: "1", turma: "A", pctMeta: 40, materias: [],
        atualizado: Date.now(), consentVersao: "1", consentEm: Date.now()
      })
    );
  });

  it("11. aluno CONSEGUE gravar o próprio risco na própria escola/série", async () => {
    await assertSucceeds(
      setDoc(doc(alunoDb, `schools/${ESCOLA}/series/3/risco/uid-aluno`), {
        nome: "Aluno", serie: "3", turma: "A", pctMeta: 40, materias: [],
        atualizado: Date.now(), consentVersao: "1", consentEm: Date.now()
      })
    );
  });

  it("12. aluno NÃO grava risco no lugar de outro aluno", async () => {
    await assertFails(
      setDoc(doc(alunoDb, `schools/${ESCOLA}/series/3/risco/uid-outro`), {
        nome: "Outro", serie: "3", turma: "A", pctMeta: 10, materias: [],
        atualizado: Date.now(), consentVersao: "1", consentEm: Date.now()
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

/* ============ V-05 — consentimento e revogação ============ */
describe("V-05 · consentimento identificado e revogável", () => {
  it("24. aluno NÃO grava resumo sem registrar o consentimento", async () => {
    await assertFails(
      setDoc(doc(alunoDb, `schools/${ESCOLA}/series/3/risco/uid-aluno`), {
        nome: "Aluno", serie: "3", turma: "A", pctMeta: 40, materias: [], atualizado: Date.now()
      })
    );
  });

  it("25. aluno NÃO grava e-mail junto (campo removido por minimização)", async () => {
    await assertFails(
      setDoc(doc(alunoDb, `schools/${ESCOLA}/series/3/risco/uid-aluno`), {
        nome: "Aluno", email: "aluno@escola.com", serie: "3", turma: "A", pctMeta: 40,
        materias: [], atualizado: Date.now(), consentVersao: "1", consentEm: Date.now()
      })
    );
  });

  it("26. aluno CONSEGUE revogar apagando o próprio resumo", async () => {
    await assertSucceeds(deleteDoc(doc(alunoDb, `schools/${ESCOLA}/series/3/risco/uid-aluno`)));
  });

  it("27. professor NÃO apaga o resumo de um aluno", async () => {
    await assertFails(deleteDoc(doc(profDb, `schools/${ESCOLA}/series/3/risco/uid-aluno`)));
  });
});

/* ============ V-15 — trilha de auditoria append-only ============ */
describe("V-15 · auditoria não se apaga", () => {
  it("28. staff CONSEGUE registrar uma ação", async () => {
    await assertSucceeds(
      setDoc(doc(profDb, `schools/${ESCOLA}/auditoria/a1`), {
        ator: "prof@escola.com", acao: "publicar", alvo: "series/3/provas",
        detalhe: "12 itens", quando: Date.now()
      })
    );
  });

  it("29. staff NÃO registra ação no nome de outra pessoa", async () => {
    await assertFails(
      setDoc(doc(profDb, `schools/${ESCOLA}/auditoria/a2`), {
        ator: "coord@escola.com", acao: "publicar", alvo: "x", detalhe: "", quando: Date.now()
      })
    );
  });

  it("30. NEM quem escreveu consegue alterar depois", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `schools/${ESCOLA}/auditoria/a3`), {
        ator: "prof@escola.com", acao: "publicar", alvo: "x", detalhe: "", quando: 1
      });
    });
    await assertFails(
      setDoc(doc(profDb, `schools/${ESCOLA}/auditoria/a3`), {
        ator: "prof@escola.com", acao: "outra", alvo: "x", detalhe: "", quando: 2
      })
    );
    await assertFails(deleteDoc(doc(profDb, `schools/${ESCOLA}/auditoria/a3`)));
  });

  it("31. aluno NÃO lê a trilha de auditoria", async () => {
    await assertFails(getDoc(doc(alunoDb, `schools/${ESCOLA}/auditoria/a1`)));
  });
});

/* ============ A0 — salas: o aluno pede, a coordenação aprova ============ */
describe("A0 · matrícula em sala", () => {
  const SALA = "3B";
  const pedido = {
    nome: "Aluno Teste", email: "aluno@escola.com", serie: "3", turma: "B",
    status: "pendente", pedidoEm: Date.now()
  };

  it("32. aluno CONSEGUE pedir matrícula na própria conta", async () => {
    await assertSucceeds(
      setDoc(doc(alunoDb, `schools/${ESCOLA}/salas/${SALA}/alunos/uid-aluno`), pedido)
    );
  });

  it("33. o pedido NÃO pode nascer já aprovado", async () => {
    await assertFails(
      setDoc(doc(alunoDb, `schools/${ESCOLA}/salas/${SALA}/alunos/uid-aluno`),
        Object.assign({}, pedido, { status: "aprovado" }))
    );
  });

  it("34. aluno NÃO se aprova depois (é o A3 aplicado a aluno)", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `schools/${ESCOLA}/salas/${SALA}/alunos/uid-aluno`), pedido);
    });
    await assertFails(
      setDoc(doc(alunoDb, `schools/${ESCOLA}/salas/${SALA}/alunos/uid-aluno`),
        { status: "aprovado" }, { merge: true })
    );
  });

  it("35. aluno CONSEGUE corrigir os próprios dados sem tocar no status", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `schools/${ESCOLA}/salas/${SALA}/alunos/uid-aluno`), pedido);
    });
    await assertSucceeds(
      setDoc(doc(alunoDb, `schools/${ESCOLA}/salas/${SALA}/alunos/uid-aluno`),
        { nome: "Aluno Corrigido" }, { merge: true })
    );
  });

  it("36. aluno NÃO pede matrícula no lugar de outro", async () => {
    await assertFails(
      setDoc(doc(alunoDb, `schools/${ESCOLA}/salas/${SALA}/alunos/uid-outro`), pedido)
    );
  });

  it("37. coordenação CONSEGUE aprovar", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `schools/${ESCOLA}/salas/${SALA}/alunos/uid-aluno`), pedido);
    });
    await assertSucceeds(
      setDoc(doc(coordDb, `schools/${ESCOLA}/salas/${SALA}/alunos/uid-aluno`),
        { status: "aprovado" }, { merge: true })
    );
  });

  it("38. professor NÃO aprova matrícula", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `schools/${ESCOLA}/salas/${SALA}/alunos/uid-aluno`), pedido);
    });
    await assertFails(
      setDoc(doc(profDb, `schools/${ESCOLA}/salas/${SALA}/alunos/uid-aluno`),
        { status: "aprovado" }, { merge: true })
    );
  });

  it("39. professor CONSEGUE ler a lista da sala (precisa disso pra dar aula)", async () => {
    await assertSucceeds(getDocs(collection(profDb, `schools/${ESCOLA}/salas/${SALA}/alunos`)));
  });

  it("40. aluno NÃO lê a matrícula de outro aluno", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `schools/${ESCOLA}/salas/${SALA}/alunos/uid-outro`), pedido);
    });
    await assertFails(getDoc(doc(alunoDb, `schools/${ESCOLA}/salas/${SALA}/alunos/uid-outro`)));
  });

  it("41. só coordenação cria ou altera a sala em si", async () => {
    await assertFails(setDoc(doc(profDb, `schools/${ESCOLA}/salas/2A`), { serie: "2", turma: "A" }));
    await assertSucceeds(setDoc(doc(coordDb, `schools/${ESCOLA}/salas/2A`), { serie: "2", turma: "A" }));
  });

  it("42. aluno NÃO pede matrícula em sala de outra escola", async () => {
    await assertFails(
      setDoc(doc(alunoDb, `schools/${OUTRA}/salas/${SALA}/alunos/uid-aluno`), pedido)
    );
  });
});
