# CassWeb — Site Institucional + Central Administrativa

Site oficial da **CassWeb** com Central Administrativa privada para gerenciar sites de clientes (cadastro, suspensão e reativação).

```
SITE PÚBLICO (/)
      ↓
🖥️ ícone discreto no footer
      ↓
LOGIN (/central/login)
      ↓
CENTRAL (/central)
      ↓
PostgreSQL + API
      ↓
Sites dos clientes consultam status
```

---

## Estrutura do projeto

```
cassweb-site/
├── index.html              → site público CassWeb
├── privacidade.html
├── termos.html
├── css/style.css           → estilos do site público
├── js/script.js
├── assets/                 → logo, favicon
├── central/                → Central Administrativa (privada)
│   ├── index.html          → dashboard
│   ├── login.html          → login administrativo
│   ├── css/central.css
│   └── js/
├── api/                    → endpoints serverless (Vercel)
│   ├── auth/               → login, logout, sessão
│   ├── admin/              → CRUD clientes, stats
│   └── client/status.js    → consulta pública de status
├── lib/                    → código compartilhado do backend
├── migrations/             → schema PostgreSQL
├── scripts/                → migrations, criar admin, etc.
├── middleware.js           → protege /central
├── vercel.json
├── package.json
├── .env.example
├── CLIENT-INTEGRATION.md   → como integrar sites de clientes
└── README.md
```

---

## Tecnologias

| Camada | Tecnologia |
|--------|------------|
| Site público | HTML, CSS, JavaScript (sem frameworks) |
| Central admin | HTML, CSS, JavaScript |
| Backend / API | Node.js (Vercel Serverless Functions) |
| Banco de dados | PostgreSQL |
| Autenticação | Sessão segura (iron-session + cookie HttpOnly) |
| Senhas | bcrypt (12 rounds) — hash no PostgreSQL |
| Deploy | Vercel |

---

## Instalação local

### 1. Clonar / abrir o projeto

```bash
cd cassweb-site
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Copie o exemplo:

```bash
cp .env.example .env
```

Edite `.env` com seus valores locais (quando tiver o banco):

```
DATABASE_URL=postgresql://usuario:senha@host:5432/nome_do_banco
SESSION_SECRET=uma-string-aleatoria-com-pelo-menos-32-caracteres
CENTRAL_API_URL=http://localhost:3000
```

> **Não** existem variáveis `ADMIN_USER` ou `ADMIN_PASSWORD`. Usuário e senha administrativos ficam no PostgreSQL.

### 4. Executar migrations

```bash
npm run migrate
```

### 5. Criar o primeiro administrador

```bash
npm run create-admin
```

O script pedirá nome, username e senha de forma interativa. A senha é convertida em hash antes de ser salva.

### 6. Rodar localmente

```bash
npm run dev
```

Acesse:
- Site público: `http://localhost:3000`
- Login admin: `http://localhost:3000/central/login` (ou clique no 🖥️ no footer)
- Central: `http://localhost:3000/central`

---

## PostgreSQL

### Qual banco criar?

Qualquer PostgreSQL compatível funciona. Opções recomendadas:

- [Neon](https://neon.tech) (gratuito, fácil)
- [Supabase](https://supabase.com) (PostgreSQL gerenciado)
- [Vercel Postgres](https://vercel.com/storage/postgres)
- PostgreSQL próprio (VPS, etc.)

### Configurar o banco — passo a passo

1. Crie um projeto/banco PostgreSQL no serviço escolhido.
2. Copie a **connection string** (URL de conexão).
3. Formato típico:
   ```
   postgresql://usuario:senha@host:5432/nome_do_banco?sslmode=require
   ```
4. Coloque essa URL na variável `DATABASE_URL` (localmente no `.env`, na Vercel em Environment Variables).
5. Execute as migrations:
   ```bash
   DATABASE_URL="sua-url" npm run migrate
   ```
6. Crie o primeiro administrador:
   ```bash
   DATABASE_URL="sua-url" npm run create-admin
   ```

### Tabelas criadas

**usuarios_admin**
| Campo | Tipo |
|-------|------|
| id | serial |
| nome | varchar |
| username | varchar (único) |
| password_hash | varchar |
| role | varchar |
| created_at | timestamptz |
| updated_at | timestamptz |

**clientes**
| Campo | Tipo |
|-------|------|
| id | serial |
| nome | varchar |
| projeto | varchar |
| url | varchar |
| client_id | varchar (único) |
| status | ATIVO / SUSPENSO |
| descricao | text |
| created_at | timestamptz |
| updated_at | timestamptz |

---

## Autenticação

- Login via `POST /api/auth/login` com `{ username, password }`
- Backend consulta PostgreSQL, compara senha com `password_hash` (bcrypt)
- Sessão criada em cookie **HttpOnly**, **Secure** (produção), **SameSite=Lax**
- Expiração: 8 horas
- Logout: `POST /api/auth/logout`
- Rota `/central` protegida por middleware + validação no backend
- Nenhuma senha, hash ou credencial é enviada ao navegador

---

## Gerenciar administradores

| Ação | Comando |
|------|---------|
| Criar primeiro admin | `npm run create-admin` |
| Adicionar admin | `npm run admin:add` |
| Alterar senha | `npm run admin:password` |
| Alterar username | `npm run admin:username` |
| Listar admins | `npm run admin:list` |
| Remover admin | `npm run admin:remove` |

Todos os comandos exigem `DATABASE_URL` configurada.

> Não é possível remover o único administrador restante.

---

## Central CassWeb

Acesse `/central` após login.

**Funcionalidades:**
- Dashboard com total de clientes, ativos e suspensos
- Lista de clientes com filtros (Todos / Ativos / Suspensos)
- Cadastrar novo site (+ NOVO SITE)
- Visualizar, editar, excluir
- Suspender / Reativar sites
- Logout (SAIR)

---

## API

### Endpoints administrativos (exigem sessão)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Verificar sessão |
| GET | `/api/admin/stats` | Estatísticas do dashboard |
| GET | `/api/admin/clients` | Listar clientes (`?status=ATIVO`) |
| POST | `/api/admin/clients` | Criar cliente |
| GET | `/api/admin/clients/:id` | Detalhes |
| PUT | `/api/admin/clients/:id` | Editar |
| DELETE | `/api/admin/clients/:id` | Excluir |
| PATCH | `/api/admin/clients/:id/suspend` | Suspender |
| PATCH | `/api/admin/clients/:id/activate` | Reativar |

### Endpoint público (sites de clientes)

```
GET /api/client/status?client_id=cliente_001
```

Resposta:
```json
{ "status": "ATIVO" }
```

Retorna **somente** o status — sem dados administrativos.

---

## Integração de novos sites de clientes

Consulte **[CLIENT-INTEGRATION.md](./CLIENT-INTEGRATION.md)** para o guia completo.

Resumo:
1. Defina um `CLIENT_ID` único no site do cliente
2. Configure `CENTRAL_API_URL`
3. Adicione o script de verificação de status
4. Publique o site
5. Cadastre o cliente na Central (+ NOVO SITE)

---

## CONFIGURAÇÃO NA VERCEL — PASSO A PASSO

### 1. Entrar na Vercel

Acesse [vercel.com](https://vercel.com) e faça login.

### 2. Abrir o projeto

Se ainda não importou, clique em **Add New → Project** e conecte o repositório Git ou faça upload da pasta.

### 3. Settings

Abra o projeto e clique em **Settings**.

### 4. Environment Variables

Clique em **Environment Variables** no menu lateral.

### 5. Add New

Clique em **Add New** para cada variável abaixo.

### 6. Criar as variáveis

| Variável | O que é | Onde obter |
|----------|---------|------------|
| `DATABASE_URL` | URL de conexão PostgreSQL | Painel do Neon, Supabase ou Vercel Postgres — copie a connection string |
| `SESSION_SECRET` | Segredo para criptografar sessões | Gere uma string aleatória com **mínimo 32 caracteres** (ex: `openssl rand -base64 32`) |
| `CENTRAL_API_URL` | URL pública deste site | URL do deploy na Vercel (ex: `https://www.cassweb.com.br`) |

> **Não** crie `ADMIN_USER` nem `ADMIN_PASSWORD`. Credenciais administrativas ficam no PostgreSQL.

### 7. Ambientes

Marque **Production**, **Preview** e **Development** conforme necessário (mínimo Production).

### 8. Salvar

Clique em **Save** após cada variável.

### 9. Novo deploy

Vá em **Deployments** e clique em **Redeploy** no último deploy, ou faça um novo push no Git.

### 10. Executar migrations e criar admin

Após o banco estar configurado, execute localmente (ou em CI):

```bash
DATABASE_URL="sua-url-da-vercel" npm run migrate
DATABASE_URL="sua-url-da-vercel" npm run create-admin
```

### 11. Verificar se funcionou

1. Acesse o site público — deve carregar normalmente
2. Clique no 🖥️ no footer — deve abrir o login
3. Entre com o administrador criado — deve ir para `/central`
4. Cadastre um cliente de teste
5. Teste a API: `https://seu-dominio.vercel.app/api/client/status?client_id=teste`

---

## Variáveis de ambiente

Arquivo `.env.example`:

```
DATABASE_URL=""
SESSION_SECRET=""
CENTRAL_API_URL=""
```

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | Conexão PostgreSQL |
| `SESSION_SECRET` | Sim (produção) | Segredo da sessão (≥ 32 chars) |
| `CENTRAL_API_URL` | Sim | URL pública da Central (para docs e integração) |

---

## Site público

O site institucional em `/` **não foi transformado em dashboard**. Apenas foi adicionado:

- Ícone 🖥️ discreto no footer (opacidade baixa, sem texto "Login" ou "Admin")
- Link para `/central/login`

Todo o restante (design, logo, cores, conteúdo) permanece intacto.

---

## Segurança

- Senhas armazenadas como hash bcrypt — nunca em texto puro
- Validação de login exclusivamente no backend
- Cookies HttpOnly — JavaScript não acessa a sessão
- Endpoints administrativos exigem autenticação
- API de status retorna apenas `{ status }` por CLIENT_ID
- Fail-open: se a API estiver offline, sites de clientes continuam funcionando
- Nenhuma credencial real no código ou `.env.example`

---

## Publicar alterações

### Via Git (recomendado)

```bash
git add .
git commit -m "Sua mensagem"
git push
```

A Vercel faz deploy automaticamente se o projeto estiver conectado ao repositório.

### Via Vercel CLI

```bash
npx vercel --prod
```

---

## Edição do site público

As instruções originais para editar textos, cores, WhatsApp e portfólio continuam válidas — consulte as seções comentadas no `index.html` e as variáveis CSS em `css/style.css`.

---

## Comandos úteis

```bash
npm install          # instalar dependências
npm run dev          # servidor local (Vercel Dev)
npm run migrate      # aplicar migrations
npm run create-admin # criar primeiro administrador
npm run admin:add    # adicionar administrador
npm run admin:password # alterar senha
npm run admin:username # alterar username
npm run admin:list   # listar administradores
npm run admin:remove # remover administrador
```

---

## Licença

© 2026 CassWeb. Todos os direitos reservados.
