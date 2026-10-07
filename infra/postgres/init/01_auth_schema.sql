-- ============================================================
-- V.E.R — Autenticação (PostgreSQL)
-- Executado automaticamente na PRIMEIRA subida do volume do
-- container `db` (montado em /docker-entrypoint-initdb.d/).
-- ============================================================

CREATE TABLE app_usuarios (
    id            BIGSERIAL PRIMARY KEY,
    login         VARCHAR(50)  NOT NULL UNIQUE,
    senha_hash    VARCHAR(100) NOT NULL,              -- hash bcrypt
    nome          VARCHAR(120),
    email         VARCHAR(120),
    perfil        VARCHAR(30)  NOT NULL,              -- ADMIN | OPERADOR | VISUALIZADOR
    situacao      CHAR(1)      NOT NULL DEFAULT 'A',  -- A=ativo, B=bloqueado
    falhas_login  INTEGER      NOT NULL DEFAULT 0,    -- bloqueia ao atingir o limite
    ultimo_login  TIMESTAMPTZ,
    criado_em     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_app_usuarios_situacao CHECK (situacao IN ('A','B'))
);

CREATE TABLE auth_sessoes (
    id                 BIGSERIAL PRIMARY KEY,
    usuario_id         BIGINT       NOT NULL REFERENCES app_usuarios (id),
    refresh_token_hash VARCHAR(200) NOT NULL,          -- SHA-256 hex
    expira_em          TIMESTAMPTZ  NOT NULL,
    revogada           CHAR(1)      NOT NULL DEFAULT 'N', -- S/N
    ip                 VARCHAR(45),
    user_agent         VARCHAR(400),
    criado_em          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_auth_sessoes_revogada CHECK (revogada IN ('S','N'))
);
CREATE INDEX ix_auth_sessoes_usuario ON auth_sessoes (usuario_id);
CREATE INDEX ix_auth_sessoes_token   ON auth_sessoes (refresh_token_hash);

CREATE TABLE auth_logs (
    id         BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT,
    acao       VARCHAR(50) NOT NULL,   -- LOGIN_OK | LOGIN_FALHA | LOGOUT | REFRESH | ACESSO_NEGADO
    detalhe    VARCHAR(400),
    ip         VARCHAR(45),
    user_agent VARCHAR(400),
    criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_auth_logs_usuario ON auth_logs (usuario_id);
CREATE INDEX ix_auth_logs_data    ON auth_logs (criado_em);

CREATE TABLE auth_recuperacao_senha (
    id            BIGSERIAL PRIMARY KEY,
    usuario_id    BIGINT NOT NULL REFERENCES app_usuarios (id),
    token_hash    VARCHAR(200) NOT NULL,
    expira_em     TIMESTAMPTZ NOT NULL,
    usado         BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_auth_recuperacao_token ON auth_recuperacao_senha (token_hash);

-- ============ USUÁRIO ADMIN ============
-- O hash bcrypt é gerado pelo Node. Após subir o compose, crie o admin com:
--   docker compose exec -e ADMIN_SENHA="senha-forte" api node dist/scripts/seed-admin.js
