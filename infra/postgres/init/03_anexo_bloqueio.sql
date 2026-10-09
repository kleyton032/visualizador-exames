-- ============================================================
-- V.E.R — Auditoria de bloqueio de anexos (PostgreSQL)
-- Adiciona motivo/responsável/data do bloqueio e vínculo de substituição.
--
-- Em volume NOVO este script roda automaticamente (após 02_anexos.sql).
-- Em volume EXISTENTE, aplicar manualmente:
--   docker compose exec db psql -U ver -d ver -f /docker-entrypoint-initdb.d/03_anexo_bloqueio.sql
-- ============================================================

ALTER TABLE anexo_exames ADD COLUMN IF NOT EXISTS motivo_bloqueio    TEXT;
ALTER TABLE anexo_exames ADD COLUMN IF NOT EXISTS bloqueado_por      BIGINT REFERENCES app_usuarios (id);
ALTER TABLE anexo_exames ADD COLUMN IF NOT EXISTS bloqueado_em       TIMESTAMPTZ;
ALTER TABLE anexo_exames ADD COLUMN IF NOT EXISTS substituido_por_id BIGINT REFERENCES anexo_exames (id);

-- Suporte a consultas de substituição por exame
CREATE INDEX IF NOT EXISTS ix_anexo_exames_substituido_por ON anexo_exames (substituido_por_id);
