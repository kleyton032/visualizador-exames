import { OracleConnection } from '../../shared/database/OracleConnection';

export class AnexoRepository {
  private db = OracleConnection.getInstance();

  async create(documentoId: number, nomeArquivo: string) {
    const query = `
      INSERT INTO anexos (documento_id, nome_arquivo, criado_em)
      VALUES (:documentoId, :nomeArquivo, SYSDATE)
    `;
    await this.db.execute(query, { documentoId, nomeArquivo }, { autoCommit: true });
  }
}
