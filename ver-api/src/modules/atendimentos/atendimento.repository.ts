import { oraclePool } from '../../shared/database/oracle';

export class AtendimentoRepository {
  async create(pacienteId: number) {
    const conn = await oraclePool.getConnection();
    await conn.execute(
      `INSERT INTO atendimentos (paciente_id, dt_atendimento)
       VALUES (:pacienteId, SYSDATE)`,
      [pacienteId],
      { autoCommit: true }
    );
    await conn.close();
  }
}
