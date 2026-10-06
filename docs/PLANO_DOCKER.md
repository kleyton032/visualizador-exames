# Plano de Implementação — Docker + Postgres (V.E.R)

> Status: **implementado (2026-10-06).** Para subir: `docker compose up --build`.
> Data: 2026-10-06

---

## 1. Objetivo

- Empacotar **frontend** (`ver-frontend`) e **API** (`ver-api`) em containers Docker.
- Subir um banco **PostgreSQL** em container para armazenar, **inicialmente**, as tabelas de usuários/login (módulo de autenticação).
- Manter o **Oracle** como fonte dos dados legados (pacientes, atendimentos, exames, anexos).
- Definir uma estrutura reproduzível via `docker compose`.

---

## 2. Decisões de arquitetura (recomendações)

| Decisão | Recomendação | Justificativa |
|---|---|---|
| Onde ficam as tabelas de login | **PostgreSQL** (novo container) | Conforme solicitado; desacopla a autenticação do legado Oracle. |
| Dados legados (pacientes/atendimentos/anexos) | Continuam no **Oracle** | O V.E.R só lê/grava essas tabelas; migrá-las está fora de escopo. |
| Imagem da API | `node:22-bookworm-slim` (Debian) | `node-oracledb` tem binários pré-compilados para Linux x64 **glibc**; Alpine (musl) pode falhar. |
| Imagem do frontend | build em `node:22-alpine` → servido por **nginx** | Serve o `dist` estático e faz proxy `/api` → container da API. |
| Imagem do Postgres | `postgres:16-alpine` | Versão estável, imagem leve. |
| Orquestração | `docker-compose.yml` (Compose v2) | Um comando sobe tudo. |
| Migrations iniciais | SQL montado em `/docker-entrypoint-initdb.d/` | Cria as tabelas na primeira subida do volume (adequado para "inicialmente"). |
| Same-origin (cookies) | nginx faz proxy `/api` no mesmo domínio | Mantém o fluxo de cookies HttpOnly já implementado, sem CORS. |
| Configuração | `.env` na raiz (não versionado) | Centraliza `POSTGRES_*`, `JWT_SECRET`, `ORACLE_*`, portas. |

---

## 3. Estrutura de arquivos proposta

```
V.E.R - NOVO/
├── docker-compose.yml
├── .env                      # segredos (não versionado)
├── .env.example
├── .gitignore                # (adicionar .env)
├── infra/
│   └── postgres/
│       └── init/
│           └── 01_auth_schema.sql      # tabelas de login (executado na 1ª subida)
│   └── nginx/
│       └── default.conf               # serve o front e faz proxy /api → api:3000
├── ver-api/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/shared/database/PostgresConnection.ts   # novo pool (pg)
├── ver-frontend/
│   ├── Dockerfile
│   └── .dockerignore
```

---

## 4. Serviços do `docker-compose.yml`

| Serviço | Imagem/base | Porta | Depende de |
|---|---|---|---|
| `db` | `postgres:16-alpine` | `5432:5432` (exposto p/ ferramentas locais) | — |
| `api` | build `./ver-api` | `3000` (interno; opcional expor) | `db` (healthcheck) |
| `web` | build `./ver-frontend` | `8080:80` | `api` |

```mermaid
flowchart LR
    U[Browser] -->|http://localhost:8080| N[Nginx (web)]
    N -->|/api| A[API (Node/Express)]
    A --> PG[(Postgres db)]
    A --> OR[(Oracle externo)]
```

---

## 5. Esquema PostgreSQL (tabelas de login)

Mesmas tabelas do módulo de autenticação, agora em PostgreSQL:

```sql
CREATE TABLE app_usuarios (
    id            BIGSERIAL PRIMARY KEY,
    login         VARCHAR(50)  NOT NULL UNIQUE,
    senha_hash    VARCHAR(100) NOT NULL,
    nome          VARCHAR(120),
    email         VARCHAR(120),
    perfil        VARCHAR(30)  NOT NULL,              -- ADMIN | OPERADOR | VISUALIZADOR
    situacao      CHAR(1)      NOT NULL DEFAULT 'A',  -- A | B
    falhas_login  INTEGER      NOT NULL DEFAULT 0,
    ultimo_login  TIMESTAMPTZ,
    criado_em     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_app_usuarios_situacao CHECK (situacao IN ('A','B'))
);

CREATE TABLE auth_sessoes (
    id                 BIGSERIAL PRIMARY KEY,
    usuario_id         BIGINT NOT NULL REFERENCES app_usuarios(id),
    refresh_token_hash VARCHAR(200) NOT NULL,
    expira_em          TIMESTAMPTZ NOT NULL,
    revogada           CHAR(1) NOT NULL DEFAULT 'N',
    ip                 VARCHAR(45),
    user_agent         VARCHAR(400),
    criado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_auth_sessoes_revogada CHECK (revogada IN ('S','N'))
);
CREATE INDEX ix_auth_sessoes_usuario ON auth_sessoes (usuario_id);
CREATE INDEX ix_auth_sessoes_token   ON auth_sessoes (refresh_token_hash);

CREATE TABLE auth_logs (
    id         BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT,
    acao       VARCHAR(50) NOT NULL,
    detalhe    VARCHAR(400),
    ip         VARCHAR(45),
    user_agent VARCHAR(400),
    criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_auth_logs_usuario ON auth_logs (usuario_id);
CREATE INDEX ix_auth_logs_data    ON auth_logs (criado_em);
```

> Como o Postgres usa `BIGSERIAL`, não são necessárias sequências manuais (diferente do Oracle). O seed do admin também passa a usar Postgres.

---

## 6. Mudanças no código (backend)

1. **Dependência nova**: `pg` + `@types/pg`.
2. **`src/shared/database/PostgresConnection.ts`** — pool singleton (espelho do `OracleConnection`), lendo `DATABASE_URL` do `.env`.
3. **`auth.repository.ts`** — trocar SQL Oracle → Postgres:
   - `SYSDATE` → `now()` / `CURRENT_TIMESTAMP`;
   - `seq_*.NEXTVAL` → `BIGSERIAL` (omitir a coluna `id`);
   - binds `:nome` → placeholders `$1, $2, ...`;
   - manter os alias em maiúsculo (`SELECT id AS "ID", ...`) para **não mudar** `auth.types.ts`, `auth.service.ts` e `auth.controller.ts`.
4. **`src/scripts/seed-admin.ts`** — inserir o admin no **Postgres**.
5. **`config.ts`** — adicionar `databaseUrl` (`DATABASE_URL`).
6. **Anexos (atenção!)** — ver seção 9. Tornar o diretório base dos anexos configurável via env (`ANEXOS_BASE_DIR`), para que no container aponte para um volume montado em vez do caminho UNC.
7. **Testes** — adicionar teste unitário do `PostgresConnection` (mockando `pg`); manter os testes de `security` e `atendimento`.

### Observação sobre o Oracle
O `OracleConnection` continua existindo e sem mudanças — somente o módulo `auth` passa a usar o Postgres. As rotas de pacientes/atendimentos/anexos continuam consultando o Oracle.

---

## 7. Dockerfiles (resumo)

### `ver-api/Dockerfile` (multi-stage, Debian)
```text
# build: node:22-bookworm-slim  → npm ci && npm run build
# runtime: node:22-bookworm-slim → copia dist + package*.json, npm ci --omit=dev
# CMD ["node", "dist/server.js"]
```
- `.dockerignore`: `node_modules`, `dist`, `.env*`, `uploads`, `coverage`.

### `ver-frontend/Dockerfile` (multi-stage)
```text
# build: node:22-alpine → npm ci && npm run build
# runtime: nginx:alpine → copia dist/ para /usr/share/nginx/html + infra/nginx/default.conf
```

### `infra/nginx/default.conf`
```nginx
server {
  listen 80;
  location / {
    root /usr/share/nginx/html;
    try_files $uri /index.html;
  }
  location /api/ {
    proxy_pass http://api:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

---

## 8. Variáveis de ambiente (`.env` na raiz)

```env
# Postgres
POSTGRES_USER=ver
POSTGRES_PASSWORD=troque-por-uma-senha-forte
POSTGRES_DB=ver
DATABASE_URL=postgres://ver:<SENHA>@db:5432/ver

# JWT (reaproveitar o mesmo segredo)
JWT_SECRET=<chave aleatória>
JWT_ACCESS_EXPIRES=15m
REFRESH_TOKEN_TTL_DAYS=1
COOKIE_SECURE=false
COOKIE_SAME_SITE=strict

# Oracle legado (host acessível a partir do container — ver seção 10)
ORACLE_USER=...
ORACLE_PASSWORD=...
ORACLE_CONNECTION=host:1521/SERVICE_NAME

# Anexos
ANEXOS_BASE_DIR=/data/anexos

# Portas
WEB_PORT=8080
```

---

## 9. ⚠️ Ponto crítico: compartilhamento de arquivos dos anexos

Hoje o upload grava em um caminho UNC do servidor de arquivos (ex.: `\\<SERVIDOR_ARQUIVOS>\C$\anexos_exames`) e o `view` lê desse caminho (caminho UNC Windows). Um container Linux **não acessa caminhos UNC nativamente**. Opções:

| Opção | Como funciona | Prós / Contras |
|---|---|---|
| **A — Volume local no container** ✅ escolhido | Tornar `ANEXOS_BASE_DIR` configurável; no container usar `/data/anexos` (volume nomeado). | Simples e portátil. Porém os arquivos **não** ficam no servidor de arquivos do hospital. |
| **B — Montar o share via SMB/CIFS** | Montar `//<SERVIDOR_ARQUIVOS>/C$/anexos_exames` dentro do container (requer credenciais e, às vezes, privilégios). | Mantém o arquivo no servidor real, mas é mais frágil e sensível a rede/credenciais. |
| **C — API fica fora do Docker** | Containerizar só front + Postgres; API continua no Windows (acessa o UNC normalmente). | Menos "dockerizado", porém zero risco no acesso aos arquivos. |

**Recomendação:** começar com a **Opção A** (path configurável + volume), deixando a Opção B/C como evolução. Isso exige uma pequena refatoração em `anexo.service.ts` para usar `ANEXOS_BASE_DIR`.

---

## 10. ⚠️ Ponto crítico: alcance do Oracle a partir do container

O Oracle é externo (**em outro servidor da rede** — decisão confirmada). O container da API precisa de um `ORACLE_CONNECTION` alcançável:

- Usar o **IP/host do servidor** da rede (deixar configurável via `.env`).
- Confirmar rota de rede entre o container e o servidor do Oracle.

---

## 11. Fases de implementação

| Fase | Atividade |
|---|---|
| 0 | Aprovar decisões (seções 2, 9 e 10) |
| 1 | `.env`/`.env.example`, `.dockerignore`, `.gitignore` |
| 2 | `infra/postgres/init/01_auth_schema.sql` + `infra/nginx/default.conf` |
| 3 | Backend: `pg` + `PostgresConnection` + migrar `auth.repository.ts` e `seed-admin.ts` + `ANEXOS_BASE_DIR` |
| 4 | Dockerfiles da API e do frontend |
| 5 | `docker-compose.yml` + healthchecks |
| 6 | Testes + validação (`docker compose up --build`) |
| 7 | Documentação de uso (subir, criar admin, portas) |

---

## 12. Decisões confirmadas

1. **Login no Postgres** → ✅ auth no PostgreSQL + dados legados no Oracle.
2. **Ambiente Docker** → ✅ imagens de produção (nginx + node, build final).
3. **Anexos** → ✅ Opção A: `ANEXOS_BASE_DIR` configurável + volume local `/data/anexos`.
4. **Oracle** → ✅ em outro servidor da rede; `ORACLE_CONNECTION` configurável via `.env`.

---

## 13. Notas da implementação

- **node-oracledb atualizado para v6** (thin mode por padrão): o container da API **não precisa** de Oracle Instant Client. Thick mode só é ativado com `ORACLE_THICK_MODE=true`.
- **Duas fontes de `.env`**: o `.env` da raiz alimenta o `docker-compose`; o `ver-api/.env` continua servindo ao dev local (ts-node-dev). Mantenha os valores em sincronia.
- **Anexos** agora usam `ANEXOS_BASE_DIR` (config) — no container `/data/anexos` (volume `anexos`); no dev local, o default continua o caminho UNC do servidor de arquivos.
- **Como subir**:
  ```bash
  cp .env.example .env            # ajuste os valores (JWT_SECRET, ORACLE_*, etc.)
  docker compose up --build       # sobe db + api + web
  docker compose exec -e ADMIN_SENHA="senha-forte" api node dist/scripts/seed-admin.js
  ```
  Acesse o app em **http://localhost:8080**.
