import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.db') });

import { OracleConnection } from '../shared/database/OracleConnection';
import { PostgresConnection } from '../shared/database/PostgresConnection';

/**
 * Migra os metadados de anexos do Oracle para o PostgreSQL.
 * Uso: cd ver-api && npx ts-node src/scripts/migrate-anexos.ts
 * (no Docker: docker compose exec api node dist/scripts/migrate-anexos.js)
 *
 * Obs.: apenas os METADADOS migram. Os arquivos físicos antigos continuam no
 * servidor local/UNC (o caminho é preservado em caminho_anexo).
 */
async function main() {
  const oracle = OracleConnection.getInstance();
  const pg = PostgresConnection.getInstance();

  // 1. Tipos de exame
  const examesResult = await oracle.execute<any>(`SELECT id, tipo, nome_exame FROM exames`);
  const exames = examesResult.rows || [];
  for (const e of exames) {
    await pg.query(
      `INSERT INTO exames (id, tipo, nome_exame) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET tipo = EXCLUDED.tipo, nome_exame = EXCLUDED.nome_exame`,
      [Number(e.ID), e.TIPO, e.NOME_EXAME ?? null],
    );
  }
  console.log(`Tipos de exame migrados: ${exames.length}`);

  // 2. Registros de anexos (metadados)
  const anexosResult = await oracle.execute<any>(`
    SELECT id, prontuario, atendimento, procedimento, olho, caminho_anexo, statusdoc, data, observacoes
      FROM anexos_exames`);
  const anexos = anexosResult.rows || [];
  for (const a of anexos) {
    await pg.query(
      `INSERT INTO anexo_exames
          (id, cd_paciente, cd_atendimento, id_exame, olho, observacoes, caminho_anexo, statusdoc, criado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        Number(a.ID),
        Number(a.PRONTUARIO),
        Number(a.ATENDIMENTO),
        Number(a.PROCEDIMENTO),
        a.OLHO,
        a.OBSERVACOES ?? null,
        a.CAMINHO_ANEXO,
        a.STATUSDOC || 'A',
        a.DATA ? new Date(a.DATA) : new Date(),
      ],
    );
  }
  console.log(`Anexos migrados: ${anexos.length}`);

  // 3. Ajusta a sequência do id para não colidir com novos registros
  await pg.query(
    `SELECT setval(pg_get_serial_sequence('anexo_exames', 'id'), (SELECT COALESCE(MAX(id), 1) FROM anexo_exames))`,
  );
  console.log('Sequência de anexo_exames ajustada.');

  await pg.close();
  await oracle.close();
  console.log('Migração concluída.');
}

main().catch((err) => {
  console.error('Falha na migração:', err);
  process.exit(1);
});
