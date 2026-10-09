import { PostgresConnection } from '../../shared/database/PostgresConnection';

export interface AnexoExameData {
  cd_paciente: number;
  cd_atendimento: number;
  id_exame: number;
  tipo_exame: string;
  olho: string;
  observacoes: string;
  nome_arquivo: string;
  content_type: string;
  tamanho_bytes: number;
  caminho_anexo: string;
  statusdoc: string;
  usuario_id: number | null;
}

export class AnexoRepository {
  private db = PostgresConnection.getInstance();

  async listExames() {
    const result = await this.db.query<{ id: number; tipo: string }>(
      `SELECT id, tipo FROM exames ORDER BY tipo`,
    );
    return result.rows;
  }

  async getExameById(id: number) {
    const result = await this.db.query<{ tipo: string }>(
      `SELECT tipo FROM exames WHERE id = $1`,
      [id],
    );
    return result.rows[0];
  }

  async createAnexo(data: AnexoExameData): Promise<number> {
    const result = await this.db.query<{ id: string | number }>(
      `INSERT INTO anexo_exames
          (cd_paciente, cd_atendimento, id_exame, tipo_exame, olho, observacoes,
           nome_arquivo, content_type, tamanho_bytes, caminho_anexo, statusdoc, usuario_id, criado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
       RETURNING id`,
      [
        data.cd_paciente,
        data.cd_atendimento,
        data.id_exame,
        data.tipo_exame,
        data.olho,
        data.observacoes,
        data.nome_arquivo,
        data.content_type,
        data.tamanho_bytes,
        data.caminho_anexo,
        data.statusdoc,
        data.usuario_id,
      ],
    );
    return Number(result.rows[0].id);
  }

  async registrarAuditoria(anexoId: number | null, status: string, mensagemErro?: string) {
    await this.db.query(
      `INSERT INTO anexos_s3 (anexo_id, status, mensagem_erro, criado_em) VALUES ($1, $2, $3, now())`,
      [anexoId, status, mensagemErro ?? null],
    );
  }

  async getAnexoById(id: number) {
    const result = await this.db.query<{ CAMINHO_ANEXO: string; NOME_ARQUIVO: string }>(
      `SELECT caminho_anexo AS "CAMINHO_ANEXO", nome_arquivo AS "NOME_ARQUIVO" FROM anexo_exames WHERE id = $1`,
      [id],
    );
    return result.rows[0];
  }

  async updateStatus(id: number, status: string) {
    await this.db.query(`UPDATE anexo_exames SET statusdoc = $2 WHERE id = $1`, [id, status]);
  }

  async listarPorAtendimentos(cdAtendimentos: number[]) {
    const result = await this.db.query<{
      ATENDIMENTO: number;
      ID: string | number;
      NOME_EXAME: string | null;
      STATUSDOC: string;
    }>(
      `SELECT ae.cd_atendimento AS "ATENDIMENTO",
              ae.id AS "ID",
              COALESCE(e.nome_exame, e.tipo, '') AS "NOME_EXAME",
              ae.statusdoc AS "STATUSDOC"
         FROM anexo_exames ae
         LEFT JOIN exames e ON e.id = ae.id_exame
        WHERE ae.cd_atendimento = ANY($1::int[])
        ORDER BY ae.id`,
      [cdAtendimentos],
    );
    return result.rows.map((r) => ({
      atendimento: Number(r.ATENDIMENTO),
      id: Number(r.ID),
      nomeExame: r.NOME_EXAME || '',
      statusdoc: r.STATUSDOC,
    }));
  }

  async listarPorPaciente(
    cdPaciente: number,
    opcoes: { page: number; pageSize: number; status?: string },
  ) {
    const where: string[] = ['ae.cd_paciente = $1'];
    const params: unknown[] = [cdPaciente];

    if (opcoes.status) {
      params.push(opcoes.status);
      where.push(`ae.statusdoc = $${params.length}`);
    }

    params.push(opcoes.pageSize, (opcoes.page - 1) * opcoes.pageSize);

    const result = await this.db.query<{
      ID: string | number;
      CD_PACIENTE: number;
      CD_ATENDIMENTO: number;
      ID_EXAME: number;
      TIPO_EXAME: string | null;
      NOME_EXAME: string | null;
      OLHO: string | null;
      OBSERVACOES: string | null;
      NOME_ARQUIVO: string | null;
      CONTENT_TYPE: string | null;
      TAMANHO_BYTES: string | number | null;
      STATUSDOC: string;
      CRIADO_EM: string;
    }>(
      `SELECT ae.id AS "ID",
              ae.cd_paciente AS "CD_PACIENTE",
              ae.cd_atendimento AS "CD_ATENDIMENTO",
              ae.id_exame AS "ID_EXAME",
              ae.tipo_exame AS "TIPO_EXAME",
              COALESCE(e.nome_exame, e.tipo, ae.tipo_exame, '') AS "NOME_EXAME",
              ae.olho AS "OLHO",
              ae.observacoes AS "OBSERVACOES",
              ae.nome_arquivo AS "NOME_ARQUIVO",
              ae.content_type AS "CONTENT_TYPE",
              ae.tamanho_bytes AS "TAMANHO_BYTES",
              ae.statusdoc AS "STATUSDOC",
              ae.criado_em AS "CRIADO_EM"
         FROM anexo_exames ae
         LEFT JOIN exames e ON e.id = ae.id_exame
        WHERE ${where.join(' AND ')}
        ORDER BY ae.criado_em DESC, ae.id DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const total = await this.countPorPaciente(cdPaciente, opcoes.status);

    return {
      data: result.rows.map((r) => ({
        id: Number(r.ID),
        cd_paciente: Number(r.CD_PACIENTE),
        cd_atendimento: Number(r.CD_ATENDIMENTO),
        id_exame: Number(r.ID_EXAME),
        tipo_exame: r.TIPO_EXAME,
        nome_exame: r.NOME_EXAME || '',
        olho: r.OLHO,
        observacoes: r.OBSERVACOES,
        nome_arquivo: r.NOME_ARQUIVO,
        content_type: r.CONTENT_TYPE,
        tamanho_bytes: Number(r.TAMANHO_BYTES) || 0,
        statusdoc: r.STATUSDOC,
        criado_em: r.CRIADO_EM,
      })),
      total,
      page: opcoes.page,
      pageSize: opcoes.pageSize,
    };
  }

  private async countPorPaciente(cdPaciente: number, status?: string) {
    const where: string[] = ['cd_paciente = $1'];
    const params: unknown[] = [cdPaciente];

    if (status) {
      params.push(status);
      where.push(`statusdoc = $${params.length}`);
    }

    const result = await this.db.query<{ total: string | number }>(
      `SELECT COUNT(*)::int AS total FROM anexo_exames WHERE ${where.join(' AND ')}`,
      params,
    );
    return Number(result.rows[0]?.total ?? 0);
  }
}
