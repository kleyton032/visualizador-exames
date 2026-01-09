import { oraclePool } from '../../shared/database/oracle';

export class AnexoRepository {
  async create(documentoId: number, nomeArquivo: string) {
    const conn = await oraclePool.getConnection();
    await conn.execute(
      `INSERT INTO anexos (documento_id, nome_arquivo, criado_em)
       VALUES (:documentoId, :nomeArquivo, SYSDATE)`,
      { documentoId, nomeArquivo },
      { autoCommit: true }
    );
    await conn.close();
  }
}
