# Setup do Painel 3ª EM (Firebase) — guia rápido

Tudo aqui é **grátis** (plano Spark do Firebase, **sem cartão**). Você faz uma vez.
Passos marcados com 👤 são seus (no navegador); os de terminal (⌨️) eu rodo com você.

## 1. 👤 Criar o projeto
1. Abra <https://console.firebase.google.com> (entre com sua conta Google).
2. **Adicionar projeto** → nome, ex.: `painel-3em` → pode **desligar** o Google Analytics → Criar.
3. Anote o **ID do projeto** (aparece embaixo do nome, ex.: `painel-3em-1a2b3`).

## 2. 👤 Ligar o login com Google
1. Menu esquerdo → **Criação → Authentication** → **Vamos começar**.
2. Aba **Sign-in method** → **Google** → **Ativar** → escolha o e-mail de suporte → **Salvar**.

## 3. 👤 Criar o banco (Firestore)
1. Menu → **Criação → Firestore Database** → **Criar banco de dados**.
2. Modo **produção** → região **`southamerica-east1` (São Paulo)** → Ativar.
   (As regras de segurança certas já estão em `firestore.rules` — eu subo no deploy.)

## 4. 👤 Pegar as chaves do app web
1. Engrenagem ⚙️ (canto superior esquerdo) → **Configurações do projeto**.
2. Role até **Seus apps** → clique no ícone **Web `</>`** → apelido `painel` → **Registrar app**.
3. Vai aparecer um bloco `const firebaseConfig = { ... }`. **Copie o objeto inteiro** e me mande
   (eu colo em `public/app/firebase-config.js`).

## 5. ⌨️ Login no terminal (só você consegue autorizar)
```
firebase login
```
Abre o navegador → autorize com a mesma conta Google.

## 6. ⌨️ (eu faço) apontar o projeto e publicar
```
firebase use SEU_ID_DO_PROJETO
firebase deploy
```
No fim ele mostra o link, tipo **https://painel-3em.web.app** — esse é o link pra mandar pros amigos.
Eu gero um **QR Code** desse link (`public/qr.png`) e um textinho de "como instalar no celular".

---

### Pra mandar pros amigos (depois do deploy)
- **Link** (WhatsApp): `https://SEU-PROJETO.web.app`
- **Instalar como app:**
  - iPhone (Safari): botão **Compartilhar** → **Adicionar à Tela de Início**.
  - Android (Chrome): menu **⋮** → **Instalar app** / **Adicionar à tela inicial**.
- Cada um entra com o **próprio Google** e cadastra as **próprias** notas — ninguém vê as do outro.

### Trazer as SUAS notas de antes (opcional)
No painel antigo (`painel-notas/notas.html`) → aba **Backup → Baixar backup (.json)**.
No painel novo, depois de entrar → aba **Backup → Importar backup** → escolha esse arquivo.
