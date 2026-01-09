import { OracleConnection } from '../../shared/database/OracleConnection';

export class AtendimentoRepository {
  private db = OracleConnection.getInstance();

  async findByPatientToday(filter: { cd_paciente?: number; nm_paciente?: string }) {
    let query = `
      SELECT 
        a.cd_atendimento,
        a.cd_paciente,
        p.nm_paciente,
        o.ds_ori_ate
      FROM atendime a
      JOIN paciente p ON a.cd_paciente = p.cd_paciente
      JOIN ori_ate o ON a.cd_ori_ate = o.cd_ori_ate
    `;

    const binds: { [key: string]: any } = {};

    if (filter.cd_paciente) {
      query += ` WHERE a.cd_paciente = :cd_paciente`;
      binds.cd_paciente = filter.cd_paciente;
    } else if (filter.nm_paciente) {
      query += ` WHERE p.nm_paciente LIKE :nm_paciente`;
      binds.nm_paciente = `%${filter.nm_paciente}%`;
    }

    const result = await this.db.execute(query, binds);
    return result.rows;
  }

}
