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

  /* Os antigos 9 a 12 testavam o isolamento entre escolas pela escrita do
     resumo de risco. Com o B2 essa escrita está fechada para todo mundo, então
     ali passariam por motivo errado — testes que passam porque a operação
     inteira sumiu não provam isolamento nenhum. O mesmo cenário migrou para a
     projeção de notas, que é o caminho de escrita que sobrou. */
  it("9. aluno NÃO publica projeção de nota em outra escola", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `schools/${OUTRA}/salas/3B/alunos/uid-aluno`), {
        nome: "Aluno", email: "aluno@escola.com", serie: "3", turma: "B",
        status: "aprovado", pedidoEm: Date.now()
      });
    });
    await assertFails(
      setDoc(doc(alunoDb, `schools/${OUTRA}/salas/3B/materias/matematica/notas/uid-aluno`), {
        nome: "Aluno", status: "risco", acc: 12, precisa: 8, fechou: false,
        medias: [6, 6, null, null], atualizado: Date.now()
      })
    );
  });

  it("10. aluno NÃO pede matrícula em sala de outra escola", async () => {
    await assertFails(
      setDoc(doc(alunoDb, `schools/${OUTRA}/salas/3B/alunos/uid-aluno`), {
        nome: "Aluno", email: "aluno@escola.com", serie: "3", turma: "B",
        status: "pendente", pedidoEm: Date.now()
      })
    );
  });

  it("11. staff de escola conhecida NÃO publica calendário em escola desconhecida", async () => {
    await assertFails(
      setDoc(doc(coordDb, `schools/${OUTRA}/series/3/provas/p2`), { disc: "Química" })
    );
  });

  it("12. aluno NÃO lê a trilha de auditoria de outra escola", async () => {
    await assertFails(getDoc(doc(alunoDb, `schools/${OUTRA}/auditoria/a1`)));
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

/* ============ B2 — o opt-in de risco foi aposentado ============
   Era `allow read: if ehStaff(escola)`: QUALQUER professor cadastrado lia o
   resumo de TODOS os alunos de TODAS as séries. Não dava para consertar só a
   regra — `risco` mora em `series/`, sem sala no caminho para comparar com o
   escopo do professor. Então a escrita fechou e a leitura encolheu; o que
   resta é poder apagar o que já foi gravado. */
describe("B2 · resumo de risco aposentado", () => {
  const resumo = {
    nome: "Aluno", serie: "3", turma: "A", pctMeta: 40, materias: [],
    atualizado: Date.now(), consentVersao: "1", consentEm: Date.now()
  };
  const legado = async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `schools/${ESCOLA}/series/3/risco/uid-aluno`), resumo);
    });
  };

  it("24. ninguém grava resumo novo — nem o próprio aluno", async () => {
    await assertFails(setDoc(doc(alunoDb, `schools/${ESCOLA}/series/3/risco/uid-aluno`), resumo));
  });

  it("25. nem a coordenação grava (o caminho de escrita não existe mais)", async () => {
    await assertFails(setDoc(doc(coordDb, `schools/${ESCOLA}/series/3/risco/uid-aluno`), resumo));
  });

  it("26. ESTE era o vazamento: professor NÃO lê mais o resumo de um aluno", async () => {
    await legado();
    await assertFails(getDoc(doc(profDb, `schools/${ESCOLA}/series/3/risco/uid-aluno`)));
    await assertFails(getDocs(collection(profDb, `schools/${ESCOLA}/series/3/risco`)));
  });

  it("27. professor NÃO apaga o resumo de um aluno", async () => {
    await legado();
    await assertFails(deleteDoc(doc(profDb, `schools/${ESCOLA}/series/3/risco/uid-aluno`)));
  });

  it("27b. o dono CONSEGUE apagar o próprio (é o que o app faz sozinho ao abrir)", async () => {
    await legado();
    await assertSucceeds(deleteDoc(doc(alunoDb, `schools/${ESCOLA}/series/3/risco/uid-aluno`)));
  });

  it("27c. coordenação CONSEGUE ler e varrer o que sobrou de quem não reabriu o app", async () => {
    await legado();
    await assertSucceeds(getDocs(collection(coordDb, `schools/${ESCOLA}/series/3/risco`)));
    await assertSucceeds(deleteDoc(doc(coordDb, `schools/${ESCOLA}/series/3/risco/uid-aluno`)));
  });
});

/* ============ LGPD art. 18 — exportar e apagar ============
   Antes era `allow delete: if false` no perfil e nos painéis: NINGUÉM apagava.
   A proposta comercial já afirmava que este caminho existia. */
describe("LGPD · exclusão de dados", () => {
  it("58. o dono CONSEGUE apagar o próprio perfil", async () => {
    await assertSucceeds(deleteDoc(doc(alunoDb, "users/uid-aluno")));
  });

  it("59. o dono CONSEGUE apagar o próprio painel", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/uid-aluno/panels/notas-lab2"),
        { blob: {}, updatedAt: Date.now() });
    });
    await assertSucceeds(deleteDoc(doc(alunoDb, "users/uid-aluno/panels/notas-lab2")));
  });

  it("60. coordenação CONSEGUE apagar (é ela que RECEBE o pedido de exclusão)", async () => {
    await assertSucceeds(deleteDoc(doc(coordDb, "users/uid-outro")));
    await assertSucceeds(deleteDoc(doc(coordDb, "users/uid-outro/panels/notas-lab2")));
  });

  it("61. mas a coordenação continua SEM LER o perfil — apagar não exige ver", async () => {
    await assertFails(getDoc(doc(coordDb, "users/uid-outro")));
    await assertFails(getDoc(doc(coordDb, "users/uid-outro/panels/notas-lab2")));
  });

  it("62. professor NÃO apaga dado de aluno nenhum", async () => {
    await assertFails(deleteDoc(doc(profDb, "users/uid-outro")));
    await assertFails(deleteDoc(doc(profDb, "users/uid-outro/panels/notas-lab2")));
  });

  it("63. aluno NÃO apaga o perfil de outro aluno", async () => {
    await assertFails(deleteDoc(doc(alunoDb, "users/uid-outro")));
    await assertFails(deleteDoc(doc(alunoDb, "users/uid-outro/panels/notas-lab2")));
  });

  it("64. a exportação não precisou de regra nova: o dono já lê tudo o que é dele", async () => {
    await assertSucceeds(getDoc(doc(alunoDb, "users/uid-aluno")));
    await assertSucceeds(getDocs(collection(alunoDb, "users/uid-aluno/panels")));
  });
});

/* ============ V-10 — a claim de admin já vale ============ */
describe("V-10 · poder de dono por custom claim", () => {
  it("65. token com claim admin age como coordenação, sem estar no staff", async () => {
    const adminDb = env.authenticatedContext("uid-dono", {
      email: "outro-endereco@example.com", email_verified: true, admin: true
    }).firestore();
    await assertSucceeds(getDocs(collection(adminDb, `schools/${ESCOLA}/staff`)));
    await assertSucceeds(
      setDoc(doc(adminDb, `schools/${ESCOLA}/staff/novo@escola.com`), { role: "professor" })
    );
  });

  it("66. claim ausente ou falsa não dá poder nenhum", async () => {
    const falsoDb = env.authenticatedContext("uid-falso-admin", {
      email: "ninguem@example.com", email_verified: true, admin: false
    }).firestore();
    await assertFails(getDocs(collection(falsoDb, `schools/${ESCOLA}/staff`)));
    await assertFails(
      setDoc(doc(falsoDb, `schools/${ESCOLA}/staff/novo@escola.com`), { role: "coordenacao" })
    );
  });

  it("67. claim admin com e-mail NÃO confirmado não vale (V-02 continua valendo)", async () => {
    const naoVerif = env.authenticatedContext("uid-admin-naoverif", {
      email: "dono@example.com", email_verified: false, admin: true
    }).firestore();
    await assertFails(getDocs(collection(naoVerif, `schools/${ESCOLA}/staff`)));
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

  /* Estes três substituem o antigo teste 39, que era só
     "professor CONSEGUE ler a lista da sala" e passava com o staff sem NENHUM
     vínculo — porque a regra pedia apenas `ehStaff()`. Ele passava exatamente
     por causa do defeito: qualquer professor lia a lista de qualquer sala.
     Agora o mesmo cenário se divide em "a sala dele sim" e "a de fora não". */
  async function vincula(salasProf) {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `schools/${ESCOLA}/staff/prof@escola.com`), {
        role: "professor", salas: salasProf, materias: ["matematica"]
      });
    });
  }

  it("39. professor CONSEGUE ler a lista da SUA sala (precisa disso pra dar aula)", async () => {
    await vincula([SALA]);
    await assertSucceeds(getDocs(collection(profDb, `schools/${ESCOLA}/salas/${SALA}/alunos`)));
  });

  it("39b. professor NÃO lê a lista de uma sala fora do escopo dele", async () => {
    await vincula(["3A"]);
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `schools/${ESCOLA}/salas/${SALA}/alunos/uid-outro`), pedido);
    });
    await assertFails(getDocs(collection(profDb, `schools/${ESCOLA}/salas/${SALA}/alunos`)));
    await assertFails(getDoc(doc(profDb, `schools/${ESCOLA}/salas/${SALA}/alunos/uid-outro`)));
  });

  it("39c. professor SEM sala nenhuma não lê lista de aluno alguma", async () => {
    await vincula([]);
    await assertFails(getDocs(collection(profDb, `schools/${ESCOLA}/salas/${SALA}/alunos`)));
  });

  it("39d. A2: coordenação continua lendo qualquer sala", async () => {
    await assertSucceeds(getDocs(collection(coordDb, `schools/${ESCOLA}/salas/${SALA}/alunos`)));
    await assertSucceeds(getDocs(collection(coordDb, `schools/${ESCOLA}/salas/3A/alunos`)));
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

/* ====== A1/A2/B1 — professor vê as notas da matéria e da sala dele ====== */
describe("A1/A2/B1 · escopo do professor sobre notas", () => {
  const SALA = "3B", MAT = "matematica", OUTRAMAT = "biologia";
  const caminho = (sala, mat, uid) =>
    `schools/${ESCOLA}/salas/${sala}/materias/${mat}/notas/${uid}`;
  const nota = {
    nome: "Aluno Teste", status: "risco", acc: 12, precisa: 8, fechou: false,
    medias: [6, 6, null, null], atualizado: Date.now()
  };

  async function semear({ aprovado = true, salasProf = [SALA], materiasProf = [MAT] } = {}) {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, `schools/${ESCOLA}/salas/${SALA}/alunos/uid-aluno`), {
        nome: "Aluno Teste", email: "aluno@escola.com", serie: "3", turma: "B",
        status: aprovado ? "aprovado" : "pendente", pedidoEm: Date.now()
      });
      await setDoc(doc(db, `schools/${ESCOLA}/staff/prof@escola.com`), {
        role: "professor", salas: salasProf, materias: materiasProf
      });
    });
  }

  it("43. aluno aprovado CONSEGUE publicar a nota da matéria", async () => {
    await semear();
    await assertSucceeds(setDoc(doc(alunoDb, caminho(SALA, MAT, "uid-aluno")), nota));
  });

  it("44. aluno PENDENTE não publica nada (a fila de A0 vale de verdade)", async () => {
    await semear({ aprovado: false });
    await assertFails(setDoc(doc(alunoDb, caminho(SALA, MAT, "uid-aluno")), nota));
  });

  it("45. matéria fora da lista canônica é recusada", async () => {
    await semear();
    await assertFails(setDoc(doc(alunoDb, caminho(SALA, "matematica-avancada", "uid-aluno")), nota));
  });

  it("46. aluno NÃO publica nota no lugar de outro", async () => {
    await semear();
    await assertFails(setDoc(doc(alunoDb, caminho(SALA, MAT, "uid-outro")), nota));
  });

  it("47. professor da sala+matéria CONSEGUE ler", async () => {
    await semear();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), caminho(SALA, MAT, "uid-aluno")), nota);
    });
    await assertSucceeds(getDocs(collection(profDb, `schools/${ESCOLA}/salas/${SALA}/materias/${MAT}/notas`)));
  });

  it("48. professor NÃO lê matéria que não é dele", async () => {
    await semear({ materiasProf: [MAT] });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), caminho(SALA, OUTRAMAT, "uid-aluno")), nota);
    });
    await assertFails(getDoc(doc(profDb, caminho(SALA, OUTRAMAT, "uid-aluno"))));
  });

  it("49. professor NÃO lê sala que não é dele", async () => {
    await semear({ salasProf: ["3A"] });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), caminho(SALA, MAT, "uid-aluno")), nota);
    });
    await assertFails(getDoc(doc(profDb, caminho(SALA, MAT, "uid-aluno"))));
  });

  it("50. professor SEM vínculo nenhum não lê nada", async () => {
    await semear({ salasProf: [], materiasProf: [] });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), caminho(SALA, MAT, "uid-aluno")), nota);
    });
    await assertFails(getDoc(doc(profDb, caminho(SALA, MAT, "uid-aluno"))));
  });

  it("51. A2: coordenação lê qualquer sala e qualquer matéria", async () => {
    await semear({ salasProf: [] });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), caminho(SALA, OUTRAMAT, "uid-aluno")), nota);
    });
    await assertSucceeds(getDoc(doc(coordDb, caminho(SALA, OUTRAMAT, "uid-aluno"))));
  });

  it("52. o aluno continua lendo a própria projeção", async () => {
    await semear();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), caminho(SALA, MAT, "uid-aluno")), nota);
    });
    await assertSucceeds(getDoc(doc(alunoDb, caminho(SALA, MAT, "uid-aluno"))));
  });

  it("53. professor NÃO escreve nota de aluno", async () => {
    await semear();
    await assertFails(setDoc(doc(profDb, caminho(SALA, MAT, "uid-aluno")), nota));
  });

  it("54. campo fora do formato é recusado", async () => {
    await semear();
    await assertFails(setDoc(doc(alunoDb, caminho(SALA, MAT, "uid-aluno")),
      Object.assign({}, nota, { observacao: "<script>" })));
  });

  it("55. `atualizado` é obrigatório — a tela precisa mostrar a data", async () => {
    await semear();
    const semData = Object.assign({}, nota); delete semData.atualizado;
    await assertFails(setDoc(doc(alunoDb, caminho(SALA, MAT, "uid-aluno")), semData));
  });

  it("56. professor NÃO se atribui sala ou matéria (segue valendo a V-01)", async () => {
    await semear();
    await assertFails(setDoc(doc(profDb, `schools/${ESCOLA}/staff/prof@escola.com`),
      { salas: ["3A", "3B", "3C"], materias: ["matematica", "biologia"] }, { merge: true }));
  });

  it("57. coordenação CONSEGUE atribuir sala e matéria ao professor", async () => {
    await semear();
    await assertSucceeds(setDoc(doc(coordDb, `schools/${ESCOLA}/staff/prof@escola.com`),
      { salas: ["3A"], materias: ["biologia"] }, { merge: true }));
  });
});

/* ============ D1 — trilha de mudança de faixa ============
   O escopo tem que ser IDÊNTICO ao da projeção do B1. Se aqui fosse mais
   frouxo, a transição reabriria pela porta dos fundos o mesmo vazamento que o
   B2 acabou de fechar — e com o agravante de dizer também QUANDO piorou. */
describe("D1 · alerta de queda de faixa", () => {
  const SALA = "3B", MAT = "matematica", OUTRAMAT = "biologia";
  const trilha = (sala, mat) => `schools/${ESCOLA}/salas/${sala}/materias/${mat}/transicoes`;
  const evento = { uid: "uid-aluno", nome: "Aluno Teste", de: "atencao", para: "risco", quando: Date.now() };

  async function semear({ aprovado = true, salasProf = [SALA], materiasProf = [MAT] } = {}) {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, `schools/${ESCOLA}/salas/${SALA}/alunos/uid-aluno`), {
        nome: "Aluno Teste", email: "aluno@escola.com", serie: "3", turma: "B",
        status: aprovado ? "aprovado" : "pendente", pedidoEm: Date.now()
      });
      await setDoc(doc(db, `schools/${ESCOLA}/staff/prof@escola.com`), {
        role: "professor", salas: salasProf, materias: materiasProf
      });
    });
  }
  async function gravado(mat = MAT) {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `${trilha(SALA, mat)}/t1`), evento);
    });
  }

  it("68. aluno aprovado CONSEGUE registrar a própria mudança de faixa", async () => {
    await semear();
    await assertSucceeds(setDoc(doc(alunoDb, `${trilha(SALA, MAT)}/t1`), evento));
  });

  it("69. aluno PENDENTE não registra nada (mesma porta do B1)", async () => {
    await semear({ aprovado: false });
    await assertFails(setDoc(doc(alunoDb, `${trilha(SALA, MAT)}/t1`), evento));
  });

  it("70. transição sem mudança de verdade é recusada (de == para)", async () => {
    await semear();
    await assertFails(setDoc(doc(alunoDb, `${trilha(SALA, MAT)}/t1`),
      Object.assign({}, evento, { de: "risco", para: "risco" })));
  });

  it("71. aluno NÃO registra transição no nome de outro", async () => {
    await semear();
    await assertFails(setDoc(doc(alunoDb, `${trilha(SALA, MAT)}/t1`),
      Object.assign({}, evento, { uid: "uid-outro" })));
  });

  it("72. append-only: nem o próprio autor reescreve depois", async () => {
    await semear();
    await gravado();
    await assertFails(setDoc(doc(alunoDb, `${trilha(SALA, MAT)}/t1`),
      Object.assign({}, evento, { para: "ok" })));
  });

  it("73. professor da sala+matéria CONSEGUE ler o alerta", async () => {
    await semear();
    await gravado();
    await assertSucceeds(getDocs(collection(profDb, trilha(SALA, MAT))));
  });

  it("74. professor NÃO lê alerta de matéria que não é dele", async () => {
    await semear({ materiasProf: [MAT] });
    await gravado(OUTRAMAT);
    await assertFails(getDocs(collection(profDb, trilha(SALA, OUTRAMAT))));
  });

  it("75. professor NÃO lê alerta de sala que não é dele", async () => {
    await semear({ salasProf: ["3A"] });
    await gravado();
    await assertFails(getDocs(collection(profDb, trilha(SALA, MAT))));
  });

  it("76. A2: coordenação lê qualquer trilha", async () => {
    await semear({ salasProf: [], materiasProf: [] });
    await gravado();
    await assertSucceeds(getDocs(collection(coordDb, trilha(SALA, MAT))));
  });

  it("77. o dono apaga a própria trilha — é parte do pedido de exclusão", async () => {
    await semear();
    await gravado();
    await assertSucceeds(deleteDoc(doc(alunoDb, `${trilha(SALA, MAT)}/t1`)));
  });

  it("78. professor NÃO apaga a trilha de ninguém", async () => {
    await semear();
    await gravado();
    await assertFails(deleteDoc(doc(profDb, `${trilha(SALA, MAT)}/t1`)));
  });
});

/* ======== A1 / V-09 — o mural sai da raiz e passa a exigir matrícula ========
   O mural antigo (`{col}/{itemId}/posts/`) pedia só `signedIn()`: qualquer
   conta criada no mundo lia todo recado de toda prova de toda turma, e a
   coleção era enumerável. O caminho não tinha escola nem série, então não
   havia o que checar.

   Agora ele mora em `schools/{escola}/series/{serie}/{itens*}/{item}/posts/` e
   a leitura exige `membros/{uid}` — projeção da matrícula APROVADA, escrita
   só pela coordenação. Amarrar em `users/{uid}.serie` não serviria: aquele
   campo é declarado pelo próprio usuário. */
describe("A1 · mural exige matrícula aprovada na série", () => {
  const SERIE = "3";
  const ITENS = "itens-lab2";
  const posts = (serie = SERIE, col = ITENS) =>
    `schools/${ESCOLA}/series/${serie}/${col}/p1/posts`;
  const membro = (uid, serie = SERIE) =>
    `schools/${ESCOLA}/series/${serie}/membros/${uid}`;

  const post = {
    tipo: "texto", url: "", label: "", texto: "alguém tem o resumo?",
    uid: "uid-aluno", nome: "Aluno", createdAt: Date.now()
  };

  async function aprovar(uid = "uid-aluno", serie = SERIE) {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), membro(uid, serie)),
        { uid, nome: "Aluno", sala: serie + "A", desde: Date.now() });
    });
  }
  async function publicado() {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `${posts()}/x1`), post);
    });
  }

  it("79. A1: conta logada SEM matrícula NÃO lê o mural — era o vazamento", async () => {
    await publicado();
    await assertFails(getDocs(collection(alunoDb, posts())));
  });

  it("80. aluno com matrícula aprovada CONSEGUE ler o mural", async () => {
    await aprovar();
    await publicado();
    await assertSucceeds(getDocs(collection(alunoDb, posts())));
  });

  it("81. aluno aprovado em OUTRA série NÃO lê o mural desta", async () => {
    await aprovar("uid-aluno", "2");
    await publicado();
    await assertFails(getDocs(collection(alunoDb, posts())));
  });

  it("82. sem matrícula NÃO publica no mural", async () => {
    await assertFails(setDoc(doc(alunoDb, `${posts()}/novo`), post));
  });

  it("83. aluno aprovado CONSEGUE publicar", async () => {
    await aprovar();
    await assertSucceeds(setDoc(doc(alunoDb, `${posts()}/novo`), post));
  });

  it("84. aprovado NÃO publica assinando com o uid de outro", async () => {
    await aprovar();
    await assertFails(setDoc(doc(alunoDb, `${posts()}/novo`),
      Object.assign({}, post, { uid: "uid-outro" })));
  });

  it("85. aprovado NÃO publica campo fora do formato", async () => {
    await aprovar();
    await assertFails(setDoc(doc(alunoDb, `${posts()}/novo`),
      Object.assign({}, post, { fixado: true })));
  });

  it("86. post não se edita depois de publicado", async () => {
    await aprovar();
    await publicado();
    await assertFails(setDoc(doc(alunoDb, `${posts()}/x1`),
      Object.assign({}, post, { texto: "outro" })));
  });

  it("87. o autor apaga o próprio post", async () => {
    await aprovar();
    await publicado();
    await assertSucceeds(deleteDoc(doc(alunoDb, `${posts()}/x1`)));
  });

  it("88. aprovado NÃO apaga o post de outro aluno", async () => {
    await aprovar();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `${posts()}/alheio`),
        Object.assign({}, post, { uid: "uid-outro" }));
    });
    await assertFails(deleteDoc(doc(alunoDb, `${posts()}/alheio`)));
  });

  it("89. coordenação lê o mural — é a moderação", async () => {
    await publicado();
    await assertSucceeds(getDocs(collection(coordDb, posts())));
  });

  it("90. coordenação apaga qualquer post — moderação e pedido de exclusão", async () => {
    await publicado();
    await assertSucceeds(deleteDoc(doc(coordDb, `${posts()}/x1`)));
  });

  it("91. professor NÃO lê o mural (estreitamento deliberado)", async () => {
    await publicado();
    await assertFails(getDocs(collection(profDb, posts())));
  });

  it("92. coleção fora da lista de ambientes não vira mural", async () => {
    await aprovar();
    await assertFails(setDoc(doc(alunoDb, `${posts(SERIE, "itens-falso")}/novo`), post));
  });

  it("93. aluno NÃO cria o próprio vínculo de membro — seria autodeclaração", async () => {
    await assertFails(setDoc(doc(alunoDb, membro("uid-aluno")),
      { uid: "uid-aluno", nome: "Aluno", sala: "3A", desde: Date.now() }));
  });

  it("94. coordenação CONSEGUE aprovar o vínculo", async () => {
    await assertSucceeds(setDoc(doc(coordDb, membro("uid-aluno")),
      { uid: "uid-aluno", nome: "Aluno", sala: "3A", desde: Date.now() }));
  });

  it("95. professor NÃO aprova vínculo", async () => {
    await assertFails(setDoc(doc(profDb, membro("uid-aluno")),
      { uid: "uid-aluno", nome: "Aluno", sala: "3A", desde: Date.now() }));
  });

  it("96. o dono apaga o próprio vínculo — LGPD art. 18", async () => {
    await aprovar();
    await assertSucceeds(deleteDoc(doc(alunoDb, membro("uid-aluno"))));
  });
});
