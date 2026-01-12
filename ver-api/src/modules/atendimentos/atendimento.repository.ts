import { OracleConnection } from '../../shared/database/OracleConnection';

export class AtendimentoRepository {
  private db = OracleConnection.getInstance();

  async findByPatientToday(filter: { cd_paciente?: number; nm_paciente?: string }) {
    let query = `
      SELECT 
        a.cd_atendimento,
        a.dt_atendimento,
        a.cd_paciente,
        ap.nm_paciente,
        p.ds_procedimento
      FROM atendime a
      JOIN paciente ap ON a.cd_paciente = ap.cd_paciente
      LEFT JOIN procedimento_sus p ON a.cd_procedimento = p.cd_procedimento
    `;

    const binds: { [key: string]: any } = {};

    if (filter.cd_paciente) {
      query += ` WHERE a.cd_paciente = :cd_paciente`;
      binds.cd_paciente = filter.cd_paciente;
    } else if (filter.nm_paciente) {
      query += ` WHERE ap.nm_paciente LIKE :nm_paciente`;
      binds.nm_paciente = `%${filter.nm_paciente}%`;
    }

    const result = await this.db.execute(query, binds);
    return result.rows;
  }

}
