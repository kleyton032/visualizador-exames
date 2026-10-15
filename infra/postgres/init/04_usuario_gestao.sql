-- ============================================================
-- V.E.R — Gestão de usuários e redefinição administrativa de senha
-- Adiciona controle de troca obrigatória de senha e auditoria de
-- redefinições administrativas.
--
-- Em volume NOVO este script roda automaticamente (após 03_anexo_bloqueio.sql).
-- Em volume EXISTENTE, aplicar manualmente:
--   docker compose exec db psql -U ver -d ver -f /docker-entrypoint-initdb.d/04_usuario_gestao.sql
-- ============================================================

-- Troca obrigatória de senha no próximo login
ALTER TABLE app_usuarios ADD COLUMN IF NOT EXISTS precisa_trocar_senha       BOOLEAN    NOT NULL DEFAULT FALSE;
-- Validade da senha temporária gerada pelo administrador
ALTER TABLE app_usuarios ADD COLUMN IF NOT EXISTS senha_temporaria_expira_em TIMESTAMPTZ;
-- Data da última alteração de senha (auditoria / política de senha)
ALTER TABLE app_usuarios ADD COLUMN IF NOT EXISTS senha_alterada_em          TIMESTAMPTZ;

-- Auditoria das redefinições administrativas de senha:
-- identifica o administrador responsável e o usuário afetado.
CREATE TABLE IF NOT EXISTS auth_redefinicao_senha (
    id          BIGSERIAL PRIMARY KEY,
    admin_id    BIGINT NOT NULL REFERENCES app_usuarios (id),
    usuario_id  BIGINT NOT NULL REFERENCES app_usuarios (id),
    ip          VARCHAR(45),
    user_agent  VARCHAR(400),
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_auth_redefinicao_senha_admin   ON auth_redefinicao_senha (admin_id);
CREATE INDEX IF NOT EXISTS ix_auth_redefinicao_senha_usuario ON auth_redefinicao_senha (usuario_id);
