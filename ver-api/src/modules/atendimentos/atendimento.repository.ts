import { OracleConnection } from '../../shared/database/OracleConnection';

export class AtendimentoRepository {
  private db = OracleConnection.getInstance();

  async findByPatientToday(filter: { cd_paciente?: number; nm_paciente?: string }) {
    let query = `
      SELECT *
      FROM atendime
      WHERE TRUNC(dt_atendimento) = TRUNC(SYSDATE)
    `;
    const binds: any = {};

    if (filter.cd_paciente) {
      query += ` AND cd_paciente = :cd_paciente`;
      binds.cd_paciente = filter.cd_paciente;
    } else if (filter.nm_paciente) {
      query += ` AND nm_paciente LIKE :nm_paciente`;
      binds.nm_paciente = `%${filter.nm_paciente}%`;
    }

    const result = await this.db.execute(query, binds);
    return result.rows;
  }

}
