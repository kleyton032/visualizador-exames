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
        ap.dt_nascimento,
        p.ds_procedimento,
        (SELECT LISTAGG(ae.id || '|' || e.nome_exame || '|' || ae.statusdoc, '; ') WITHIN GROUP (ORDER BY ae.id)
         FROM anexos_exames ae
         JOIN exames e ON ae.procedimento = e.id
         WHERE ae.atendimento = a.cd_atendimento) as LISTA_EXAMES
      FROM atendime a
      JOIN paciente ap ON a.cd_paciente = ap.cd_paciente
      LEFT JOIN procedimento_sus p ON a.cd_procedimento = p.cd_procedimento
    `;

    const binds: { [key: string]: any } = {};
    const conditions: string[] = [];

    if (filter.cd_paciente) {
      conditions.push(`a.cd_paciente = :cd_paciente`);
      binds.cd_paciente = filter.cd_paciente;
    }

    if (filter.nm_paciente) {
      conditions.push(`UPPER(ap.nm_paciente) LIKE UPPER(:nm_paciente)`);
      binds.nm_paciente = `%${filter.nm_paciente}%`;
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY a.dt_atendimento DESC, a.cd_atendimento DESC`;

    const result = await this.db.execute(query, binds);
    return result.rows;
  }

}
