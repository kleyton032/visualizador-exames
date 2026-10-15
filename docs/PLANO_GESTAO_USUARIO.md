# Gerenciamento de Usuários e Redefinição Administrativa de Senha

> **Status:** implementado e validado (backend e frontend).
> **Acesso:** exclusivo para usuários com perfil `ADMIN`.

Este documento descreve o plano e a implementação do módulo de gerenciamento de
usuários do **V.E.R (Anexo Exames)**, incluindo a redefinição administrativa de
senhas e a troca obrigatória de senha no próximo acesso.

---

## 1. Objetivo e contexto

Em uma instituição hospitalar, podem ocorrer situações em que o usuário não tem
acesso ao e-mail cadastrado, o serviço de e-mail está indisponível ou o fluxo
convencional de recuperação de senha não funciona. Para garantir que a equipe de
TI consiga restabelecer o acesso rapidamente, foi implementada uma alternativa
administrativa segura:

- Consultar e gerenciar as contas de usuários.
- Redefinir a senha de qualquer usuário, gerando uma **senha temporária** que o
  administrador informa ao usuário.
- Forçar a troca da senha no próximo login (tela bloqueante até a troca).
- Registrar em auditoria quem redefiniu, quando e a partir de qual IP.

---

## 2. Visão geral da solução

| Camada      | Componente                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Banco       | Migração [`04_usuario_gestao.sql`](../infra/postgres/init/04_usuario_gestao.sql) — colunas de controle + tabela de auditoria. |
| Backend     | Política/gerador de senha, fluxo de login com escopo restrito, módulo `usuarios` (rotas protegidas por `ADMIN`). |
| Frontend    | Tela "Usuários" (listar/editar/redefinir/auditoria) e tela de "Troca obrigatória de senha".                    |

A redefinição **não** depende de e-mail: a senha temporária é exibida **uma única
vez** ao administrador, que a repassa ao usuário.

---

## 3. Modelo de dados

Migração: [`infra/postgres/init/04_usuario_gestao.sql`](../infra/postgres/init/04_usuario_gestao.sql).

### 3.1 Colunas adicionadas em `app_usuarios`

| Coluna                        | Tipo         | Descrição                                                            |
| ----------------------------- | ------------ | -------------------------------------------------------------------- |
| `precisa_trocar_senha`        | `BOOLEAN`    | Indica troca obrigatória no próximo login (default `FALSE`).          |
| `senha_temporaria_expira_em`  | `TIMESTAMPTZ`| Validade da senha temporária gerada pelo administrador (24h).         |
| `senha_alterada_em`           | `TIMESTAMPTZ`| Data da última alteração de senha.                                    |

### 3.2 Tabela de auditoria `auth_redefinicao_senha`

| Coluna       | Tipo         | Descrição                                    |
| ------------ | ------------ | -------------------------------------------- |
| `id`         | `BIGSERIAL`  | PK                                            |
| `admin_id`   | `BIGINT`     | Administrador responsável (FK `app_usuarios`)|
| `usuario_id` | `BIGINT`     | Usuário afetado (FK `app_usuarios`)          |
| `ip`         | `VARCHAR(45)`| IP de origem da operação                      |
| `user_agent` | `VARCHAR(400)`| User-Agent da requisição                    |
| `criado_em`  | `TIMESTAMPTZ`| Data/hora da operação                         |

Índices: `ix_auth_redefinicao_senha_admin` e `ix_auth_redefinicao_senha_usuario`.

> **Atenção — volume de banco existente:** os scripts em
> `infra/postgres/init/` só executam automaticamente na criação do volume. Em um
> banco já existente, aplique manualmente:
>
> ```bash
> docker compose exec db psql -U ver -d ver -f /docker-entrypoint-initdb.d/04_usuario_gestao.sql
> ```

---

## 4. Política de senha

Definida em [`ver-api/src/shared/security/password.ts`](../ver-api/src/shared/security/password.ts).

- Comprimento mínimo: **10 caracteres** (`SENHA_MIN_CARACTERES`).
- Exige ao menos: **1 maiúscula**, **1 minúscula**, **1 número** e **1 símbolo**.
- Não pode conter o **login** nem partes do **nome** (palavras com ≥ 4 caracteres).
- Senha temporária: gerada com `crypto.randomInt`, comprimento **12**, sem
  caracteres ambíguos (`0/O`, `1/l/I`), garantindo as 4 classes e embaralhada
  (Fisher–Yates). Nunca é gravada em texto puro — apenas o hash bcrypt.

---

## 5. Fluxos

### 5.1 Redefinição administrativa de senha

1. Administrador clica em **Redefinir senha** na tela "Usuários".
2. Backend (sempre valida `ADMIN` no servidor):
   - gera a senha temporária e calcula o hash bcrypt;
   - define `precisa_trocar_senha = TRUE` e `senha_temporaria_expira_em = agora + 24h`;
   - **revoga as sessões/tokens** existentes do usuário;
   - registra a auditoria (admin, usuário, IP, user-agent, data/hora);
   - registra o log interno `ADMIN_RESET_SENHA`.
3. A senha temporária é retornada **uma única vez** para exibição ao administrador.
4. Regras: o administrador **não** pode redefinir a própria senha; a operação tem
   *rate limiting* (`passwordResetLimiter`).

### 5.2 Login e troca obrigatória de senha

1. No login, se `precisa_trocar_senha = TRUE`:
   - se `senha_temporaria_expira_em` já passou → login é **recusado** com mensagem
     de senha temporária expirada;
   - caso contrário, é emitido um **access token com escopo restrito**
     (`scope = change_password`), **sem** sessão de refresh. O login retorna
     `mustChangePassword: true`.
2. Com o escopo restrito, o usuário **só** consegue chamar
   `POST /auth/trocar-senha-obrigatoria`; qualquer outra rota retorna `403`
   (`Troca de senha obrigatória`).
3. Ao trocar a senha com sucesso, a flag é limpa, a data é atualizada e o usuário
   recebe um token normal (escopo `full`), acessando o sistema com seu perfil
   original.

---

## 6. Endpoints da API

Base: `/api`. Todas as rotas do módulo exigem `authMiddleware` + perfil `ADMIN`.

| Método | Rota                              | Descrição                                              |
| ------ | --------------------------------- | ------------------------------------------------------ |
| `GET`  | `/usuarios`                       | Lista usuários (busca, filtros e paginação).           |
| `GET`  | `/usuarios/:id`                   | Detalha um usuário.                                    |
| `PATCH`| `/usuarios/:id`                   | Atualiza nome, e-mail, perfil ou situação.             |
| `POST` | `/usuarios/:id/redefinir-senha`   | Gera senha temporária (com `passwordResetLimiter`).    |
| `GET`  | `/usuarios/:id/auditoria`         | Lista redefinições de senha do usuário.                |
| `POST` | `/auth/trocar-senha-obrigatoria`  | Troca obrigatória de senha (escopo `change_password`). |

### 6.1 `GET /usuarios`

Parâmetros de consulta: `busca`, `perfil`, `situacao`, `page`, `pageSize`.

```json
{
  "total": 42,
  "page": 1,
  "pageSize": 10,
  "data": [
    {
      "id": 1,
      "login": "jose.silva",
      "nome": "José da Silva",
      "email": "jose@hospital.local",
      "perfil": "OPERADOR",
      "situacao": "A",
      "ultimo_login": null,
      "precisa_trocar_senha": false,
      "criado_em": "2026-10-15T12:00:00.000Z"
    }
  ]
}
```

### 6.2 `PATCH /usuarios/:id`

```json
{ "nome": "José da Silva", "email": "jose@hospital.local", "perfil": "OPERADOR", "situacao": "A" }
```

Resposta: `{ "message": "Usuário atualizado com sucesso" }`.

### 6.3 `POST /usuarios/:id/redefinir-senha`

Resposta (a senha aparece **apenas nesta resposta**):

```json
{
  "message": "Senha temporária gerada. Informe-a ao usuário (válida por 24 horas).",
  "senhaTemporaria": "x9K!pQ2#mZv4",
  "expiraEm": "2026-10-16T12:00:00.000Z"
}
```

### 6.4 `GET /usuarios/:id/auditoria`

```json
{
  "registros": [
    {
      "id": 10,
      "admin_id": 3,
      "admin_login": "admin.ti",
      "usuario_id": 1,
      "ip": "192.168.5.10",
      "criado_em": "2026-10-15T12:00:00.000Z"
    }
  ]
}
```

### 6.5 `POST /auth/trocar-senha-obrigatoria`

```json
{ "novaSenha": "NovaSenha@123" }
```

Resposta: `{ "user": { ... } }`.

---

## 7. Regras de negócio e controles de segurança

- **Permissão no backend:** todo o módulo passa por `requireRole('ADMIN')`;
  usuários sem autorização recebem `403`, independentemente do frontend.
- **Autoproteção:** o administrador não pode bloquear nem redefinir a **própria**
  conta.
- **Senhas:** apenas hash bcrypt (12 salt rounds) é armazenado; a senha temporária
  em texto puro é retornada uma única vez.
- **Validade:** senha temporária expira em **24 horas**; após expirada, o login é
  recusado.
- **Invalidação de sessão:** ao redefinir (ou bloquear), as sessões/refresh tokens
  do usuário são revogados.
- **Rate limiting:** a redefinição de senha usa `passwordResetLimiter`.
- **Escopo de token:** token com escopo `change_password` só acessa a troca de
  senha; o restante da API é bloqueado até a troca.
- **Auditoria:** tabela `auth_redefinicao_senha` registra administrador, usuário,
  IP, user-agent e data/hora.
- **Validações:** perfil (`ADMIN`, `OPERADOR`, `VISUALIZADOR`), situação
  (`A`/`B`) e unicidade de e-mail.

---

## 8. Frontend

- **Tela "Usuários"** — [`UsuariosList.tsx`](../ver-frontend/src/modules/usuarios/pages/UsuariosList/UsuariosList.tsx)
  (visível apenas para `ADMIN`): listagem com filtros e paginação, edição, redefinição
  de senha (exibe a senha temporária uma única vez) e consulta de auditoria.
- **Tela de troca obrigatória** — [`TrocaSenhaObrigatoria.tsx`](../ver-frontend/src/modules/auth/pages/TrocaSenhaObrigatoria/TrocaSenhaObrigatoria.tsx):
  bloqueia o acesso e exige a nova senha antes de liberar as demais telas.
- **Contexto de autenticação** — [`AuthContext.tsx`](../ver-frontend/src/shared/auth/AuthContext.tsx):
  controla o estado `mustChangePassword`.

---

## 9. Testes

- Backend: `cd ver-api && npm test` — 9 suítes, **56 testes** passando
  (inclui testes da política de senha, gerador de senha temporária, login com
  escopo restrito, troca obrigatória, serviço e repositório de usuários).
- Type-check backend: `npx tsc -p tsconfig.build.json --noEmit`.
- Frontend: `cd ver-frontend && npm run build` (`tsc -b && vite build`).

---

## 10. Build e execução (Docker)

```bash
# Aplicar/atualizar código do backend e frontend
docker compose up -d --build api web

# Aplicar a migração em um volume de banco já existente
docker compose exec db psql -U ver -d ver -f /docker-entrypoint-initdb.d/04_usuario_gestao.sql
```

---

## 11. Checklist de homologação

O checklist detalhado de validação funcional está em
`files/CHECKLIST-HOMOLOGACAO.md` (pasta de estado da sessão), cobrindo:
visibilidade do menu por perfil, listagem/filtros, edição, redefinição, troca
obrigatória, auditoria, validade de 24h, regras de segurança e regressões.
