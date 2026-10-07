-- ============================================================
-- V.E.R — Anexos (PostgreSQL)
-- Tipos de exame, registros de anexos e auditoria de uploads S3.
-- Aplicar manualmente se o volume já existir:
--   docker compose exec db psql -U ver -d ver -f /docker-entrypoint-initdb.d/02_anexos.sql
-- ============================================================

-- Tipos de exame (migrados do Oracle — o id é preservado)
CREATE TABLE exames (
    id         INTEGER      PRIMARY KEY,
    tipo       VARCHAR(200) NOT NULL,
    nome_exame VARCHAR(255)
);

-- Registros de anexos (metadados migrados do Oracle + novos uploads)
CREATE TABLE anexo_exames (
    id             BIGSERIAL PRIMARY KEY,
    cd_paciente    INTEGER      NOT NULL,
    cd_atendimento INTEGER      NOT NULL,
    id_exame       INTEGER      NOT NULL,
    tipo_exame     VARCHAR(200),
    olho           VARCHAR(10),
    observacoes    TEXT,
    nome_arquivo   VARCHAR(255),
    content_type   VARCHAR(100),
    tamanho_bytes  BIGINT,
    caminho_anexo  VARCHAR(500) NOT NULL,             -- local/UNC ou s3://bucket/key
    statusdoc      CHAR(1)      NOT NULL DEFAULT 'A', -- A | B (ativo/bloqueado)
    usuario_id     BIGINT       REFERENCES app_usuarios (id),
    criado_em      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_anexo_exames_atendimento ON anexo_exames (cd_atendimento);
CREATE INDEX ix_anexo_exames_paciente    ON anexo_exames (cd_paciente);

-- Auditoria dos uploads no S3
CREATE TABLE anexos_s3 (
    id            BIGSERIAL PRIMARY KEY,
    anexo_id      BIGINT REFERENCES anexo_exames (id),
    status        VARCHAR(20) NOT NULL DEFAULT 'SUCESSO', -- SUCESSO | ERRO
    mensagem_erro TEXT,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_anexos_s3_anexo ON anexos_s3 (anexo_id);
