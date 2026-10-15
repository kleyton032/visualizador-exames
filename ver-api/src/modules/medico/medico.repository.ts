import { PostgresConnection } from '../../shared/database/PostgresConnection';

export interface AutocadastroMedico {
  id: number;
  token_hash: string;
  cpf: string;
  cd_prestador: number;
  cd_usuario_mv: number | null;
  nome: string | null;
  email: string | null;
  senha_hash: string | null;
  codigo_hash: string | null;
  codigo_expira_em: Date | null;
  expira_em: Date;
  usado: boolean;
  criado_em: Date;
}

/** Persistência do registro pendente do fluxo de autocadastro de médicos. */
export class MedicoRepository {
  private db = PostgresConnection.getInstance();

  async createAutocadastro(input: {
    tokenHash: string;
    cpf: string;
    cdPrestador: number;
    cdUsuarioMv: number | null;
    nome: string | null;
    expiraEm: Date;
  }): Promise<number> {
    const result = await this.db.query<{ id: string | number }>(
      `INSERT INTO auth_autocadastro_medico
          (token_hash, cpf, cd_prestador, cd_usuario_mv, nome, expira_em, usado, criado_em)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, now())
       RETURNING id`,
      [input.tokenHash, input.cpf, input.cdPrestador, input.cdUsuarioMv, input.nome, input.expiraEm],
    );
    return Number(result.rows[0].id);
  }

  async findByTokenHash(tokenHash: string): Promise<AutocadastroMedico | undefined> {
    const result = await this.db.query<AutocadastroMedico>(
      `SELECT id, token_hash, cpf, cd_prestador, cd_usuario_mv, nome, email,
              senha_hash, codigo_hash, codigo_expira_em, expira_em, usado, criado_em
         FROM auth_autocadastro_medico
        WHERE token_hash = $1`,
      [tokenHash],
    );
    return result.rows[0];
  }

  /** Grava e-mail, hash da senha e código de confirmação (etapa 2 do fluxo). */
  async registrarDadosConta(
    id: number,
    input: { email: string; senhaHash: string; codigoHash: string; codigoExpiraEm: Date },
  ): Promise<void> {
    await this.db.query(
      `UPDATE auth_autocadastro_medico
          SET email = $1, senha_hash = $2, codigo_hash = $3, codigo_expira_em = $4
        WHERE id = $5`,
      [input.email, input.senhaHash, input.codigoHash, input.codigoExpiraEm, id],
    );
  }

  async marcarUsado(id: number): Promise<void> {
    await this.db.query(
      `UPDATE auth_autocadastro_medico SET usado = TRUE WHERE id = $1`,
      [id],
    );
  }
}
