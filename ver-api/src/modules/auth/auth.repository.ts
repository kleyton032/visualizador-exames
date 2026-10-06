import { PostgresConnection } from '../../shared/database/PostgresConnection';
import { Sessao, Usuario } from './auth.types';

// Aliases em maiúsculo mantêm a interface de `auth.types.ts` inalterada.
const USER_COLUMNS = `
  id AS "ID", login AS "LOGIN", senha_hash AS "SENHA_HASH",
  nome AS "NOME", email AS "EMAIL", perfil AS "PERFIL",
  situacao AS "SITUACAO", ultimo_login AS "ULTIMO_LOGIN"
`;

export class AuthRepository {
  private db = PostgresConnection.getInstance();

  async findByLogin(login: string): Promise<Usuario | undefined> {
    const result = await this.db.query<Usuario>(
      `SELECT ${USER_COLUMNS} FROM app_usuarios WHERE login = $1`,
      [login],
    );
    return result.rows[0];
  }

  async findById(id: number): Promise<Usuario | undefined> {
    const result = await this.db.query<Usuario>(
      `SELECT ${USER_COLUMNS} FROM app_usuarios WHERE id = $1`,
      [id],
    );
    return result.rows[0];
  }

  async updateUltimoLogin(id: number): Promise<void> {
    await this.db.query(
      `UPDATE app_usuarios SET ultimo_login = now(), atualizado_em = now() WHERE id = $1`,
      [id],
    );
  }

  /** Incrementa o contador de falhas e bloqueia a conta ao atingir o limite. */
  async registrarFalhaLogin(id: number, maxFalhas = 5): Promise<void> {
    await this.db.query(
      `UPDATE app_usuarios
          SET falhas_login = falhas_login + 1,
              situacao = CASE WHEN falhas_login + 1 >= $2 THEN 'B' ELSE situacao END
        WHERE id = $1`,
      [id, maxFalhas],
    );
  }

  async resetarFalhasLogin(id: number): Promise<void> {
    await this.db.query(
      `UPDATE app_usuarios SET falhas_login = 0 WHERE id = $1`,
      [id],
    );
  }

  async createSessao(input: {
    usuarioId: number;
    refreshTokenHash: string;
    expiraEm: Date;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO auth_sessoes
          (usuario_id, refresh_token_hash, expira_em, revogada, ip, user_agent, criado_em)
       VALUES ($1, $2, $3, 'N', $4, $5, now())`,
      [input.usuarioId, input.refreshTokenHash, input.expiraEm, input.ip ?? null, input.userAgent ?? null],
    );
  }

  async findSessaoByTokenHash(hash: string): Promise<Sessao | undefined> {
    const result = await this.db.query<Sessao>(
      `SELECT id AS "ID", usuario_id AS "USUARIO_ID", revogada AS "REVOGADA", expira_em AS "EXPIRA_EM"
         FROM auth_sessoes
        WHERE refresh_token_hash = $1`,
      [hash],
    );
    return result.rows[0];
  }

  async revogarSessao(id: number): Promise<void> {
    await this.db.query(
      `UPDATE auth_sessoes SET revogada = 'S' WHERE id = $1`,
      [id],
    );
  }

  async revogarSessoesUsuario(usuarioId: number): Promise<void> {
    await this.db.query(
      `UPDATE auth_sessoes SET revogada = 'S' WHERE usuario_id = $1 AND revogada = 'N'`,
      [usuarioId],
    );
  }

  async log(
    acao: string,
    dados: { usuarioId?: number; detalhe?: string; ip?: string; userAgent?: string } = {},
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO auth_logs (usuario_id, acao, detalhe, ip, user_agent, criado_em)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [dados.usuarioId ?? null, acao, dados.detalhe ?? null, dados.ip ?? null, dados.userAgent ?? null],
    );
  }
}
