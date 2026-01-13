import { OracleConnection } from '../../shared/database/OracleConnection';

export interface AnexoExameData {
  cd_paciente: number;
  cd_atendimento: number;
  id_exame: number;
  olho: string;
  data: Date;
  caminho_anexo: string;
  statusdoc: string;
  observacoes: string;
}

export class AnexoRepository {
  private db = OracleConnection.getInstance();

  async listExames() {
    const query = `SELECT id, tipo FROM exames`;
    const result = await this.db.execute<{ ID: number, TIPO: string }>(query);
    return result.rows?.map(row => ({
      id: row.ID,
      tipo: row.TIPO
    })) || [];
  }


  async saveAnexoExame(data: AnexoExameData) {
    const query = `
      INSERT INTO anexos_exames (id, prontuario, atendimento, procedimento, olho, caminho_anexo, statusdoc, data, observacoes)
      VALUES (seq_anexos_exames.NEXTVAL, :cd_paciente, :cd_atendimento, :id_exame, :olho, :caminho_anexo, :statusdoc, :data, :observacoes)
    `;

    await this.db.execute(query, {
      cd_paciente: data.cd_paciente,
      cd_atendimento: data.cd_atendimento,
      id_exame: data.id_exame,
      observacoes: data.observacoes,
      olho: data.olho,
      data: data.data,
      caminho_anexo: data.caminho_anexo,
      statusdoc: data.statusdoc
    }, { autoCommit: true });
  }

  async getExameById(id: number) {
    const query = `SELECT tipo FROM exames WHERE id = :id`;
    const result = await this.db.execute<{ TIPO: string }>(query, { id });
    return result.rows?.[0];
  }

  async getAnexoById(id: number) {
    const query = `SELECT caminho_anexo FROM anexos_exames WHERE id = :id`;
    const result = await this.db.execute<{ CAMINHO_ANEXO: string }>(query, { id });
    return result.rows?.[0];
  }

}
