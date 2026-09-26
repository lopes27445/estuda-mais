# Migração do mural — fechar o A1 / V-09

O mural está na **raiz** do banco, em `murals/{itemId}/posts/`. Esse caminho
não carrega escola nem série, então a regra não tem o que checar e a condição
inteira é `signedIn()`: **qualquer conta criada no Estuda+ lê todo recado de
toda prova de toda turma**, e a coleção é enumerável. É conteúdo escrito por
menores de idade, associável a uma turma e a uma prova.

Destino: `schools/{escola}/series/{serie}/{itens*}/{itemId}/posts/`, onde a
regra exige `membros/{uid}` — projeção da matrícula **aprovada**, escrita só
pela coordenação.

## Por que não é um passo só

Fechar a regra antiga antes do cliente novo estar no ar tira o mural dos alunos
sem lhes dar o substituto. Trocar o cliente antes das regras faz o app escrever
num caminho que o banco recusa. A ordem abaixo mantém os dois lados
funcionando o tempo todo; a **única** janela em que algo muda para o aluno é o
passo 4, e ela é de segundos.

## Pré-requisito

`.secrets/service-account.json` — console.firebase.google.com → ⚙️ Configurações
do projeto → "Contas de serviço" → "Gerar nova chave privada".

É a **mesma chave** que o `set-admin-claim.mjs` espera. Gerar uma vez destrava
esta migração **e** a V-10.

## Sequência

### 1. Publicar as regras (aditivo — nada quebra)

```
firebase deploy --only firestore:rules
```

As regras novas **somam** os caminhos `membros/` e `itens*/`. O bloco do mural
antigo continua aberto de propósito. Neste ponto o app velho segue funcionando
exatamente como antes.

> ⚠️ Publique **só de `painel-lab/`**. Regra é por projeto, não por site: um
> deploy de outra pasta atinge lab2, lab3 e produção juntos. Foi por isso que
> `painel-beta/` teve o bloco `firestore` removido em 22/09.

### 2. Criar os vínculos de quem já está aprovado

```
node tools/migra-mural/migra-mural.mjs backfill
node tools/migra-mural/migra-mural.mjs backfill --executar
```

Sem isto o mural novo fecha na cara de quem sempre teve acesso.

### 3. Mover os posts

```
node tools/migra-mural/migra-mural.mjs posts
node tools/migra-mural/migra-mural.mjs posts --executar
```

**Leia a lista de órfãos no fim.** Post cujo item sumiu do calendário não é
movido nem apagado — fica para decisão humana. Os dados antigos continuam
intactos: esta fase **copia**, não move.

### 4. Publicar o cliente

```
firebase deploy --only hosting:lab3     # confira aqui primeiro
firebase deploy --only hosting:lab2
```

Confira **com uma conta de aluno de verdade**, aprovada: abrir um item, ver os
posts antigos, postar, apagar o próprio post.

### 5. Fechar o mural antigo (é aqui que o vazamento morre)

Em `firestore.rules`, no bloco marcado `mural ANTIGO (raiz) — EM MIGRACAO`,
trocar as permissões por:

```
      allow read: if false;
      allow create: if false;
      allow update: if false;
      // delete continua só para a limpeza do passo 6
      allow delete: if ehCoord('coc-atibaia');
```

e publicar as regras de novo. **Só depois do passo 4 confirmado.**

### 6. Apagar o que sobrou

```
node tools/migra-mural/migra-mural.mjs limpeza
node tools/migra-mural/migra-mural.mjs limpeza --executar
```

Único passo sem volta. Faça depois de alguns dias de uso normal, não no mesmo
dia.

### 7. Remover o bloco morto

Com as coleções vazias, apagar o bloco do mural antigo das regras e o
`MURAL_COLL` do `env.js`.

## Plano de volta

| Parou em | Como voltar |
|---|---|
| 1–3 | Nada a desfazer: tudo foi **aditivo**. Os vínculos e as cópias podem ficar; ninguém os lê enquanto o cliente antigo estiver no ar |
| 4 | `firebase hosting:rollback` (ou redeploy do commit anterior). O caminho antigo ainda está aberto e populado — o mural volta inteiro |
| 5 | Republicar as regras do commit anterior. O passo 5 é **só** mudança de regra, e regra volta em segundos |
| 6 | **Sem volta.** É por isso que ele é o último e espera dias |

## O que muda para quem usa

- **Aluno aprovado:** nada. Mesmo mural, mesma série, mesmos recados.
- **Aluno com matrícula pendente:** o mural fecha, e a tela passa a dizer
  *"Sua matrícula ainda não foi aprovada pela coordenação"* em vez de fingir
  falha de rede.
- **Professor:** perde o acesso ao mural. Era acesso acidental — a regra antiga
  só pedia `signedIn()`. Dar `ehStaff()` no caminho novo devolveria a qualquer
  professor o mural de **todas** as séries, que é o vazamento de escopo pelo
  qual o B2 foi aposentado. Se ele precisar, entra depois com escopo por sala.
- **Coordenação:** lê e apaga qualquer post (moderação e pedido de exclusão).

## Execução real — 26/09/2026

| Passo | Estado |
|---|---|
| 1. Regras aditivas | ✅ publicadas em 25/09 |
| 2. Backfill | ✅ 1 vínculo (1ª B). A 1ª simulação dizia "0 aprovados": salas eram documentos fantasmas — corrigido em `a387b60` |
| 3. Posts | ✅ 1 recado (`murals/pr-ing` → série 3, prova embutida). Mesma causa da simulação zerada |
| 4. Cliente | ✅ lab2/lab3 em 25/09; produção por `hosting:clone painel-e5373-lab2:live painel-e5373:live` |
| 5. Fechar o mural antigo | ✅ regras publicadas e conferidas; leitura real devolve PERMISSION_DENIED |
| 6. Limpeza | ⏳ **esperar alguns dias** de uso normal, depois `limpeza` e `limpeza --executar` |
| 7. Bloco morto | ⏳ depois do 6 |

Produção agora recebe o build do `painel-lab`, nunca mais do `painel-beta`
(o `firebase.json` de lá foi renomeado para falhar alto).
