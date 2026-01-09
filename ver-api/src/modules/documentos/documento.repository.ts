import { OracleConnection } from '../../shared/database/OracleConnection';

export class DocumentoRepository {
  private db = OracleConnection.getInstance();

  async create(atendimentoId: number, tipo: string) {
    const query = `
      INSERT INTO documentos (atendimento_id, tipo, status, criado_em)
      VALUES (:atendimentoId, :tipo, 'RASCUNHO', SYSDATE)
    `;
    await this.db.execute(query, { atendimentoId, tipo }, { autoCommit: true });
  }
}
