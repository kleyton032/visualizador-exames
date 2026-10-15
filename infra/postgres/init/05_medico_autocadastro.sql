-- ============================================================
-- V.E.R — Autocadastro de médicos (integração Oracle MV)
-- Adiciona vínculo com prestador/CPF ao usuário e a tabela de
-- registros pendentes do fluxo de autocadastro.
--
-- Em volume NOVO este script roda automaticamente (após 04_usuario_gestao.sql).
-- Em volume EXISTENTE, aplicar manualmente:
--   docker compose exec db psql -U ver -d ver -f /docker-entrypoint-initdb.d/05_medico_autocadastro.sql
-- ============================================================

-- Vínculo com o prestador do Oracle (MV). Campos nulos preservam as contas
-- internas existentes (admin/operador/visualizador).
ALTER TABLE app_usuarios ADD COLUMN IF NOT EXISTS cpf           VARCHAR(14);
ALTER TABLE app_usuarios ADD COLUMN IF NOT EXISTS cd_prestador  BIGINT;
ALTER TABLE app_usuarios ADD COLUMN IF NOT EXISTS cd_usuario_mv BIGINT;
ALTER TABLE app_usuarios ADD COLUMN IF NOT EXISTS origem        VARCHAR(20) NOT NULL DEFAULT 'INTERNO'; -- INTERNO | AUTOCADASTRO

-- 1 prestador/CPF = 1 conta (índices parciais não afetam linhas sem vínculo).
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_usuarios_cpf
    ON app_usuarios (cpf) WHERE cpf IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_usuarios_cd_prestador
    ON app_usuarios (cd_prestador) WHERE cd_prestador IS NOT NULL;

-- Registro pendente do fluxo de autocadastro (3 etapas).
CREATE TABLE IF NOT EXISTS auth_autocadastro_medico (
    id               BIGSERIAL PRIMARY KEY,
    token_hash       VARCHAR(200) NOT NULL UNIQUE,
    cpf              VARCHAR(14)  NOT NULL,
    cd_prestador     BIGINT       NOT NULL,
    cd_usuario_mv    BIGINT,
    nome             VARCHAR(120),
    email            VARCHAR(120),
    senha_hash       VARCHAR(100),             -- hash bcrypt definido na etapa 2
    codigo_hash      VARCHAR(200),             -- hash do código de confirmação do e-mail
    codigo_expira_em TIMESTAMPTZ,
    expira_em        TIMESTAMPTZ  NOT NULL,    -- validade do token de cadastro
    usado            BOOLEAN      NOT NULL DEFAULT FALSE,
    criado_em        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_auth_autocadastro_medico_cpf ON auth_autocadastro_medico (cpf);
