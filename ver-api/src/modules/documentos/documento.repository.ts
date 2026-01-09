import { oraclePool } from '../../shared/database/oracle';

export class DocumentoRepository {
  async create(atendimentoId: number, tipo: string) {
    const conn = await oraclePool.getConnection();
    await conn.execute(
      `INSERT INTO documentos (atendimento_id, tipo, status, criado_em)
       VALUES (:atendimentoId, :tipo, 'RASCUNHO', SYSDATE)`,
      { atendimentoId, tipo },
      { autoCommit: true }
    );
    await conn.close();
  }
}
