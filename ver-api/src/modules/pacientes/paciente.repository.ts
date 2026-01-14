import { OracleConnection } from '../../shared/database/OracleConnection';

export class PacienteRepository {
  private db = OracleConnection.getInstance();

  async findAll(filter: { cd_paciente?: number; nm_paciente?: string }) {
    let query = `
      SELECT 
        cd_paciente,
        nm_paciente,
        dt_nascimento
      FROM paciente
    `;

    const binds: { [key: string]: any } = {};
    const conditions: string[] = [];

    if (filter.cd_paciente) {
      conditions.push(`cd_paciente = :cd_paciente`);
      binds.cd_paciente = filter.cd_paciente;
    }

    if (filter.nm_paciente) {
      conditions.push(`UPPER(nm_paciente) LIKE UPPER(:nm_paciente)`);
      binds.nm_paciente = `%${filter.nm_paciente}%`;
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    const paginatedQuery = `
      SELECT * FROM (
        ${query}
      ) WHERE ROWNUM <= 100
    `;

    const result = await this.db.execute(paginatedQuery, binds);
    return result.rows;
  }
}
