# Plano de Implementação — Autocadastro e Autenticação de Médicos (integração Oracle MV)

> **Status:** implementado (backend + frontend + migração `05_medico_autocadastro.sql`).
> **Pendência operacional:** definir `MEDICO_CD_TIP_PRESTA` no `.env` (código(s) de médico) junto ao DBA.
> **Objetivo:** permitir que médicos vinculados ao sistema MV (Oracle) criem o
> próprio acesso e utilizem **apenas** a consulta/visualização de exames.

---

## 1. Objetivo

Permitir que um médico com vínculo válido no Oracle (MV) faça seu **primeiro
acesso de forma autônoma** — sem depender de um administrador —, validando sua
identidade contra a base legada, e receba automaticamente um perfil restrito
exclusivo para consulta e visualização de exames.

Requisitos-chave:

- Autocadastro somente para prestadores **elegíveis** no Oracle.
- Rejeitar CPF inválido, usuário inativo ou prestador não autorizado.
- Impedir cadastros duplicados (um prestador = uma conta).
- CPF sozinho **não** é prova de identidade → mecanismo adicional de verificação.
- Senha com política mínima (10+ caracteres, especial e maiúscula).
- Perfil restrito aplicado no **frontend e no backend**.

---

## 2. Análise da arquitetura atual

### 2.1 Autenticação (PostgreSQL)

- Tabela [`app_usuarios`](../infra/postgres/init/01_auth_schema.sql): `login`,
  `senha_hash` (bcrypt, custo 12), `nome`, `email`, `perfil`, `situacao`
  (`A`/`B`), `falhas_login`, `ultimo_login`.
- Tokens: access token **JWT** (15 min) + refresh token **opaco** (SHA-256,
  revogável, 1 dia).
- Perfis atuais: `ADMIN`, `OPERADOR`, `VISUALIZADOR`
  ([`auth.types.ts`](../ver-api/src/modules/auth/auth.types.ts)).
- Controle por perfil: middleware [`requireRole`](../ver-api/src/shared/middlewares/rbac.middleware.ts).
- Política de senha e gerador de temporária já implementados em
  [`password.ts`](../ver-api/src/shared/security/password.ts) (mín. 10, maiúscula,
  minúscula, número, símbolo; sem login/nome).
- Rate limiting e recuperação de senha por e-mail já existentes.

### 2.2 Acesso ao Oracle (legado)

- [`OracleConnection`](../ver-api/src/shared/database/OracleConnection.ts):
  singleton com pool `node-oracledb` (thin mode por padrão), usado hoje por
  `pacientes`, `atendimentos` e `anexos` para **leitura**.
- O usuário Oracle configurado (`ORACLE_USER`) precisa ter `SELECT` nas tabelas
  `dbasgu.usuarios` e `dbamv.prestador` — **a confirmar com o DBA** (risco R1).

### 2.3 Proteção atual das rotas (backend)

| Rota | Proteção hoje |
|---|---|
| `GET /api/pacientes` | `authMiddleware` (qualquer perfil autenticado) |
| `GET /api/atendimentos` | `authMiddleware` (qualquer perfil autenticado) |
| `GET /api/anexos/exames` | `authMiddleware` |
| `GET /api/anexos/paciente/:cd_paciente` | `authMiddleware` |
| `GET /api/anexos/view/:id` e `download/:id` | `authMiddleware` |
| `POST /api/anexos/upload` e `PATCH /api/anexos/status/:id` | `ADMIN`, `OPERADOR` |
| `GET/PATCH /api/usuarios/*` | `ADMIN` |

### 2.4 Frontend

- Sem react-router; navegação por estado `currentView` em
  [`App.tsx`](../ver-frontend/src/App.tsx).
- Tela de login em [`Login.tsx`](../ver-frontend/src/modules/auth/pages/Login/Login.tsx),
  que hoje exibe apenas "Esqueci minha senha".
- Nenhuma restrição de menu por perfil, exceto "Usuários" (só `ADMIN`).

---

## 3. Análise do SQL fornecido e critérios de elegibilidade

SQL de referência (usuários + prestadores + tipo do prestador):

```sql
SELECT u.cd_usuario,
       u.nm_usuario,
       p.dt_nascimento,
       u.sn_ativo,
       p.cd_prestador,
       p.nm_prestador,
       p.nr_cpf_cgc                        AS cpf,
       p.cd_tip_presta || '-' || pa.nm_tip_presta AS tip_prestador,
       u.sn_integra_onepass,
       CASE u.sn_integra_onepass
            WHEN 'S' THEN 'Integrado'
            ELSE 'Não integrado'
       END                                AS status_onepass
  FROM dbasgu.usuarios u
  LEFT JOIN dbamv.prestador p ON p.cd_prestador = u.cd_prestador
  LEFT JOIN dbamv.tip_presta pa ON p.cd_tip_presta = pa.cd_tip_presta
 ORDER BY u.nm_usuario;
```

### 3.1 Campos disponíveis e uso proposto

| Campo | Uso | Observação |
|---|---|---|
| `cd_usuario` | Chave do usuário no MV | Guardar para rastreabilidade (`cd_usuario_mv`) |
| `nm_usuario` | Nome de exibição | Pré-preencher o nome da conta |
| `sn_ativo` | **Elegibilidade** (deve ser `S`) | Bloquear usuários inativos |
| `cd_prestador` | **Vínculo único** (anti-duplicidade) | Chave natural para impedir contas duplicadas |
| `nm_prestador` | Confirmação visual | Exibir parcialmente/mascarado |
| `nr_cpf_cgc` (`cpf`) | **Identificador de busca** + anti-duplicidade | Normalizar (só dígitos) antes de comparar |
| `p.cd_tip_presta` + `pa.nm_tip_presta` (`tip_prestador`) | Identifica o **tipo do prestador** | Usado para confirmar que o prestador é **médico** (decisão D2) |
| `p.dt_nascimento` | **Evidência de identidade** (além do CPF) | Comparar com a informada no cadastro |
| `sn_integra_onepass` | Indicador da integração OnePass | **Apenas informativo** (se o prestador já tem cadastro no OnePass) |

### 3.2 Critérios de elegibilidade propostos

Para o autocadastro ser aceito, o prestador deve atender **todos** os critérios:

1. `u.sn_ativo = 'S'` — usuário ativo no MV.
2. Existe `p.cd_prestador` vinculado e não nulo.
3. O prestador é **médico** — via `p.cd_tip_presta` /
   `dbamv.tip_presta.nm_tip_presta` (`tip_prestador`). O(s) código(s) de médico
   serão **configuráveis por variável de ambiente** (ex.: `MEDICO_CD_TIP_PRESTA`),
   com valor final confirmado junto ao DBA (decisão D2).
4. CPF normalizado confere com o digitado.
5. **Data de nascimento** do prestador confere com a informada (evidência de
   identidade, além do CPF).
6. Não existe conta `app_usuarios` já vinculada ao mesmo CPF/`cd_prestador`.

> `sn_integra_onepass` é **apenas informativo** (indica se o prestador já possui
> cadastro no OnePass); **não** é critério de elegibilidade nem de autenticação.

### 3.3 Por que o CPF sozinho é insuficiente

O CPF é um identificador público (passível de ser conhecido por terceiros) e pode
estar desatualizado ou duplicado no legado. Serão usadas **duas evidências** de
vínculo:

1. **Data de nascimento** do prestador, conferida contra o Oracle (dado secreto
   adicional ao CPF).
2. **Confirmação do e-mail** informado no cadastro: envio de um código de
   validação e conferência antes de concluir a criação da conta.

---

## 4. Integração com o OnePass — decisão: apenas informativo

`sn_integra_onepass` seria usado **somente como informação** (indicar, no fluxo,
se o prestador já possui cadastro no OnePass). Ele **não** é critério de
elegibilidade e **não** será usado para autenticar o médico.

> **Observação de implementação:** a coluna `u.sn_integra_onepass` **não existe**
> na base atual do MV (`ORA-00904: invalid identifier`). Por isso a consulta não
> referencia essa coluna e o campo `onepassIntegrado` da API retorna `false`
> (mantido por compatibilidade até a integração ser disponibilizada).

- A autenticação permanece **própria da aplicação** (bcrypt + JWT, fluxo
  existente).
- A validação de identidade no primeiro acesso é feita pelo Oracle (CPF + data de
  nascimento) + confirmação de e-mail.
- Se futuramente o OnePass for adotado como provedor, a validação de identidade
  pode ser isolada atrás de uma interface `IdentidadeMedicoProvider` — mas isso
  **não é necessário** para o MVP.

---

## 5. Fluxo de primeiro acesso / autocadastro (proposto)

```
Login (V.E.R)
  │  link "Primeiro acesso? Cadastre-se como médico"
  ▼
Tela de autocadastro (etapa 1)
  │  informa: CPF + data de nascimento
  ▼
POST /api/auth/medico/iniciar-cadastro
  │  backend consulta Oracle (dbasgu.usuarios + dbamv.prestador)
  │  ├─ não encontrado / inativo / não médico / CPF ou nascimento divergente /
  │  │  já cadastrado → recusa (msg genérica)
  │  └─ elegível → gera `cadastroToken` (opaco, hash, 15 min) associado ao vínculo
  │                e retorna dados mascarados + flag informativo do OnePass
  ▼
Tela de dados da conta (etapa 2)
  │  informa: e-mail + nova senha + confirmação da senha
  ▼
POST /api/auth/medico/enviar-codigo-email
  │  valida cadastroToken + política de senha + unicidade do e-mail
  │  envia código de confirmação (6 dígitos, 10 min) para o e-mail informado
  ▼
Tela de confirmação do e-mail (etapa 3)
  │  informa: código recebido
  ▼
POST /api/auth/medico/concluir-cadastro
  │  valida cadastroToken + código + senha
  │  cria app_usuarios (perfil MEDICO, cpf, cd_prestador, cd_usuario_mv, email validado)
  │  registra log AUTOCADASTRO_MEDICO_OK
  ▼
Login automático (perfil MEDICO) → tela "Exames" (única opção)
```

**Observações de segurança:**

- O frontend **nunca** recebe o `cd_prestador`/`cd_usuario` para decidir o
  cadastro — a identidade validada fica **servidor-side** no `cadastroToken`.
- Mensagens genéricas ("CPF não elegível para cadastro") evitam enumerar CPFs
  válidos.
- Rate limiting em `iniciar-cadastro` e `concluir-cadastro`.

---

## 6. Perfil `MEDICO` e controle de acesso

### 6.1 Novo perfil

Adicionar `'MEDICO'` a [`Perfil`](../ver-api/src/modules/auth/auth.types.ts) e aos
conjuntos `PERFIS_VALIDOS` (auth e módulo de usuários). Restrições:

| Recurso | `MEDICO` | Observação |
|---|---|---|
| `GET /api/anexos/exames` | ✅ | já protegido por `authMiddleware` |
| `GET /api/anexos/paciente/:cd_paciente` | ✅ | já protegido |
| `GET /api/anexos/view/:id` / `download/:id` | ✅ | já protegido |
| `POST /api/anexos/upload` | ❌ | já restrito a `ADMIN`,`OPERADOR` |
| `PATCH /api/anexos/status/:id` | ❌ | já restrito |
| `GET /api/pacientes` | ✅ | busca read-only, necessária para localizar os exames do paciente |
| `GET /api/atendimentos` | ❌ | **adicionado** `requireRole('ADMIN','OPERADOR','VISUALIZADOR')` |
| `GET/PATCH /api/usuarios/*` | ❌ | já restrito a `ADMIN` |

### 6.2 Frontend

- Usuário `MEDICO` vê **somente** a aba "Exames"; sem "Pacientes", "Usuários" ou
  ações de upload/status.
- A restrição visual é apenas conveniência — a **fonte de verdade é o backend**.

### 6.3 Relação com o perfil `VISUALIZADOR`

O novo `MEDICO` é especializado e **rastreável** (vínculo com prestador). Manter
`VISUALIZADOR` para os demais casos (decisão D6: unificar ou manter separados).

---

## 7. Endpoints, serviços e regras de negócio

### 7.1 Endpoints novos (públicos, sem `authMiddleware`)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/medico/iniciar-cadastro` | Valida CPF + data de nascimento no Oracle; gera `cadastroToken`. |
| `POST` | `/api/auth/medico/enviar-codigo-email` | Valida token/senha/e-mail; envia código de confirmação ao e-mail informado. |
| `POST` | `/api/auth/medico/concluir-cadastro` | Valida token/código/senha; cria conta `MEDICO`; inicia sessão. |

### 7.2 Serviços/repositórios

- `MedicoOracleRepository` (novo): consulta elegibilidade em
  `dbasgu.usuarios` + `dbamv.prestador` via `OracleConnection`.
- `MedicoCadastroService` (novo): orquestra validação, token, dedup e criação.
- `AuthRepository`: adicionar criação com vínculo (`cpf`, `cd_prestador`,
  `cd_usuario_mv`, `origem`) e busca por CPF/`cd_prestador`.
- `shared/config.ts`: nova variável `medicoCdTipPresta` (lista de códigos de
  médico) lida de `MEDICO_CD_TIP_PRESTA`.

### 7.3 Regras de negócio

1. Elegibilidade conforme seção 3.2 (todas as condições).
2. **Anti-duplicidade:** antes de criar, verificar existência por `cpf` e por
   `cd_prestador` (e pelas constraints no banco — seção 8).
3. CPF normalizado (somente dígitos) na entrada e na comparação.
4. Senha validada pela política existente (`validarPoliticaSenha`) — backend é a
   validação definitiva; frontend repete as regras como UX.
5. Confirmação de senha obrigatória.
6. `cadastroToken` com expiração curta (15 min), hash armazenado, uso único.
7. Código de confirmação enviado ao **e-mail informado no cadastro**, curta
   validade (10 min), uso único; o e-mail só é aceito após a validação do código.
8. Logs de auditoria: `AUTOCADASTRO_MEDICO_OK` / `AUTOCADASTRO_MEDICO_FALHA`
   (detalhe sem expor CPF completo).
9. Após sucesso, sessão normal emitida (mesmo fluxo de `login`).
10. Login posterior por **CPF (normalizado) ou e-mail** — o endpoint de login
    passa a aceitar ambos.

---

## 8. Alterações no banco da aplicação (PostgreSQL)

Nova migração `05_medico_autocadastro.sql`:

```sql
ALTER TABLE app_usuarios ADD COLUMN IF NOT EXISTS cpf           VARCHAR(14);
ALTER TABLE app_usuarios ADD COLUMN IF NOT EXISTS cd_prestador  BIGINT;
ALTER TABLE app_usuarios ADD COLUMN IF NOT EXISTS cd_usuario_mv BIGINT;
ALTER TABLE app_usuarios ADD COLUMN IF NOT EXISTS origem        VARCHAR(20) NOT NULL DEFAULT 'INTERNO';

CREATE UNIQUE INDEX IF NOT EXISTS uq_app_usuarios_cpf
  ON app_usuarios (cpf) WHERE cpf IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_usuarios_cd_prestador
  ON app_usuarios (cd_prestador) WHERE cd_prestador IS NOT NULL;
```

Tabela para registros pendentes de autocadastro:

```sql
CREATE TABLE IF NOT EXISTS auth_autocadastro_medico (
    id                BIGSERIAL PRIMARY KEY,
    token_hash        VARCHAR(200) NOT NULL UNIQUE,
    cpf               VARCHAR(14)  NOT NULL,
    cd_prestador      BIGINT       NOT NULL,
    cd_usuario_mv     BIGINT,
    nome              VARCHAR(120),
    email             VARCHAR(120),
    codigo_hash       VARCHAR(200),           -- código de confirmação do e-mail
    codigo_expira_em  TIMESTAMPTZ,
    expira_em         TIMESTAMPTZ  NOT NULL,
    usado             BOOLEAN      NOT NULL DEFAULT FALSE,
    criado_em         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

> Os `UNIQUE` parciais (`WHERE ... IS NOT NULL`) preservam as contas existentes
> (admin/operador sem CPF/prestador) e impedem duplicidade entre médicos.

---

## 9. Prevenção de duplicidade e integridade do vínculo

- **Chave natural:** `cd_prestador` (identifica o prestador no MV) e `cpf`
  (identifica a pessoa). Índices únicos parciais garantem 1 prestador = 1 conta.
- **Normalização:** CPF sem máscara; `cd_prestador` numérico.
- **Conflito de CPF no legado:** se o mesmo CPF existir em mais de um prestador,
  tratar como **não elegível** e registrar log para análise (decisão D8).
- **Reconciliação:** o vínculo é criado uma única vez; alterações posteriores de
  CPF/prestador ficam restritas (idealmente sem edição pelo admin, apenas TI).

---

## 10. Política de senha e segurança

- **Reuso da política existente** (`password.ts`): mín. **10 caracteres**,
  ao menos **1 especial**, **1 maiúscula**, 1 minúscula e 1 número, sem conter
  login/nome. Isso **atende e supera** o mínimo solicitado (10 + especial +
  maiúscula).
- Confirmação de senha no frontend e validação definitiva no backend.
- Armazenamento: somente **hash bcrypt** (custo 12) — nunca texto puro.
- Proteção contra tentativas excessivas: `loginLimiter` (login) +
  novos `medicoCadastroLimiter` (iniciar/concluir cadastro).
- Recuperação de acesso: o fluxo existente de "esqueci a senha" por e-mail
  continua valendo para contas de médico.
- LGPD: não logar CPF completo; mascarar nome/CPF nas respostas do cadastro.

---

## 11. Estratégia de testes

### 11.1 Unitários (backend)
- Política de senha (já existente) aplicada ao cadastro.
- `MedicoCadastroService`: matriz de elegibilidade (ativo/inativo, sem prestador,
  tipo não-médico, CPF divergente, data de nascimento divergente, já cadastrado,
  token expirado/usuado, código de e-mail inválido).
- Dedup por CPF e por `cd_prestador` (com repositório Oracle mockado).
- Geração/validação de `cadastroToken` e código de confirmação.

### 11.2 Integração (backend × Oracle de homologação)
- Consulta real a `dbasgu.usuarios`/`dbamv.prestador` com casos autorizados e
  negados (com dados de teste fornecidos pelo DBA).
- Verificação de grants e desempenho da consulta (índices).

### 11.3 Frontend
- Tela de autocadastro (validação de campos, máscara de CPF, confirmação de senha).
- `App.tsx`: menu reduzido para `MEDICO` (somente "Exames").
- Login: link "Primeiro acesso" visível e navegando para o cadastro.

### 11.4 Cenários E2E (autorizado × negado)
- Médico elegível → cadastra → loga → vê apenas exames → `403` em
  `/api/pacientes`, `/api/usuarios` e upload/status.
- CPF não elegível → recusa com mensagem genérica.
- Duplicidade → recusa.
- Token/código expirado → recusa.
- Tentativa de alterar perfil para `MEDICO` via API por não-admin → `403`.

---

## 12. Decisões em aberto (necessárias antes da implementação)

| # | Decisão | Opções / recomendação |
|---|---|---|
| D1 | Usar OnePass para autenticar/validar? | ✅ **Não** — `sn_integra_onepass` é apenas informativo (seção 4). |
| D2 | Qual(is) `cd_tip_presta` representam "médico"? | ✅ **Configurável** — variável de ambiente `MEDICO_CD_TIP_PRESTA` (lista de códigos); valor final confirmado com o DBA. |
| D3 | Exigir `sn_integra_onepass='S'` como critério? | ✅ **Não** — apenas exibição informativa. |
| D4 | Qual a segunda evidência de identidade? | ✅ **Data de nascimento** (contra Oracle) + **código de confirmação por e-mail**. |
| D5 | Como o médico fará login? | ✅ **CPF (normalizado) ou e-mail**; e-mail é solicitado e validado no cadastro. |
| D6 | `MEDICO` separado de `VISUALIZADOR`? | Manter separado (rastreabilidade do vínculo). |
| D7 | Auto-login após cadastro? | ✅ **Auto-login** após validação do e-mail. |
| D8 | CPF duplicado no legado? | Recusar e registrar para análise manual. |
| D9 | Admin pode editar/bloquear contas `MEDICO`? | Permitir **bloquear/redefinir senha**; **não** permitir trocar o perfil. |

---

## 13. Riscos identificados

| # | Risco | Impacto | Mitigação |
|---|---|---|---|
| R1 | Falta de `SELECT` nas tabelas `dbasgu`/`dbamv` para o usuário Oracle da API | Bloqueia a integração | Solicitar grant de leitura ao DBA; validar em homologação |
| R2 | Campo que identifica "médico" indefinido | Critério de elegibilidade incorreto | D2 com DBA + amostra de dados |
| R3 | CPF ausente/duplicado/desatualizado no MV | Falso positivo/negativo no cadastro | Normalização + D8 + amostra de dados |
| R4 | OnePass usado apenas como informação | Sem impacto funcional | `sn_integra_onepass` apenas exibido; sem dependência de API |
| R5 | Endpoint público de validação alvo de abuso/enumeração | Vazamento de existência de CPF | Rate limiting + mensagens genéricas + sem CPF completo em logs |
| R6 | Divergência de dados entre MV e aplicação | Vínculo inconsistente | `cd_usuario_mv` para reconciliação; rotina de conferência futura |
| R7 | LGPD (exposição de CPF/nome) | Risco legal | Mascaramento, logs sem CPF completo, mínimo necessário |
| R8 | Contas legadas sem CPF/prestador | Quebra de unicidade | Índices **parciais** (`WHERE ... IS NOT NULL`) |

---

## 14. Recomendação final (resumo)

1. **Criar o perfil `MEDICO`** e restringir, no backend, `pacientes` e
   `atendimentos` (adicionar `requireRole`); `anexos` já está adequado.
2. **Validação própria de identidade via Oracle:** CPF normalizado + **data de
   nascimento** + vínculo de prestador ativo + tipo do prestador (médico, via
   `MEDICO_CD_TIP_PRESTA` configurável) + código de confirmação enviado ao e-mail
   informado no cadastro.
3. **Anti-duplicidade por constraints** (`cpf` e `cd_prestador` únicos, parciais).
4. **Reuso da política de senha existente** e do fluxo de login/sessão.
5. **OnePass apenas informativo** (`sn_integra_onepass`), sem impacto na
   autenticação.
6. **Migração `05_medico_autocadastro.sql`** + testes unitários/integração/E2E.

Essa abordagem respeita a arquitetura atual, entrega valor rápido e mantém a porta
aberta para futuras evoluções do OnePass sem retrabalho.
