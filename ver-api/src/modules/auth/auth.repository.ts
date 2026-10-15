import { PostgresConnection } from '../../shared/database/PostgresConnection';
import { Perfil, Sessao, Usuario } from './auth.types';

// Aliases em maiúsculo mantêm a interface de `auth.types.ts` inalterada.
const USER_COLUMNS = `
  id AS "ID", login AS "LOGIN", senha_hash AS "SENHA_HASH",
  nome AS "NOME", email AS "EMAIL", perfil AS "PERFIL",
  situacao AS "SITUACAO", ultimo_login AS "ULTIMO_LOGIN",
  precisa_trocar_senha AS "PRECISA_TROCAR_SENHA",
  senha_temporaria_expira_em AS "SENHA_TEMPORARIA_EXPIRA_EM"
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

  async findByEmail(email: string): Promise<Usuario | undefined> {
    const result = await this.db.query<Usuario>(
      `SELECT ${USER_COLUMNS} FROM app_usuarios WHERE email = $1`,
      [email],
    );
    return result.rows[0];
  }

  async findByCpf(cpf: string): Promise<Usuario | undefined> {
    const result = await this.db.query<Usuario>(
      `SELECT ${USER_COLUMNS} FROM app_usuarios WHERE cpf = $1`,
      [cpf],
    );
    return result.rows[0];
  }

  async findByCdPrestador(cdPrestador: number): Promise<Usuario | undefined> {
    const result = await this.db.query<Usuario>(
      `SELECT ${USER_COLUMNS} FROM app_usuarios WHERE cd_prestador = $1`,
      [cdPrestador],
    );
    return result.rows[0];
  }

  async createUsuario(input: {
    login: string;
    senhaHash: string;
    nome: string | null;
    email: string | null;
    perfil: Perfil;
  }): Promise<number> {
    const result = await this.db.query<{ id: string | number }>(
      `INSERT INTO app_usuarios
          (login, senha_hash, nome, email, perfil, situacao, falhas_login, criado_em, atualizado_em)
       VALUES ($1, $2, $3, $4, $5, 'A', 0, now(), now())
       RETURNING id`,
      [input.login, input.senhaHash, input.nome, input.email, input.perfil],
    );
    return Number(result.rows[0].id);
  }

  /** Cria uma conta de médico originada do autocadastro (perfil MEDICO + vínculo MV). */
  async createUsuarioMedico(input: {
    login: string;
    senhaHash: string;
    nome: string | null;
    email: string | null;
    cpf: string;
    cdPrestador: number;
    cdUsuarioMv: number | null;
  }): Promise<number> {
    const result = await this.db.query<{ id: string | number }>(
      `INSERT INTO app_usuarios
          (login, senha_hash, nome, email, perfil, situacao, falhas_login,
           cpf, cd_prestador, cd_usuario_mv, origem, criado_em, atualizado_em)
       VALUES ($1, $2, $3, $4, 'MEDICO', 'A', 0, $5, $6, $7, 'AUTOCADASTRO', now(), now())
       RETURNING id`,
      [input.login, input.senhaHash, input.nome, input.email, input.cpf, input.cdPrestador, input.cdUsuarioMv],
    );
    return Number(result.rows[0].id);
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

  // --- Recuperação de Senha ---

  async createRecuperacaoSenha(usuarioId: number, tokenHash: string, expiraEm: Date): Promise<void> {
    await this.db.query(
      `INSERT INTO auth_recuperacao_senha (usuario_id, token_hash, expira_em, usado, criado_em) 
       VALUES ($1, $2, $3, FALSE, now())`,
      [usuarioId, tokenHash, expiraEm]
    );
  }

  async findRecuperacaoSenhaByTokenHash(tokenHash: string): Promise<{ id: number; usuario_id: number; expira_em: Date; usado: boolean } | undefined> {
    const result = await this.db.query<{ id: number; usuario_id: number; expira_em: Date; usado: boolean }>(
      `SELECT id, usuario_id, expira_em, usado FROM auth_recuperacao_senha WHERE token_hash = $1`,
      [tokenHash]
    );
    return result.rows[0];
  }

  async marcarRecuperacaoUsada(id: number): Promise<void> {
    await this.db.query(`UPDATE auth_recuperacao_senha SET usado = TRUE WHERE id = $1`, [id]);
  }

  /**
   * Atualiza a senha e encerra o ciclo de troca obrigatória.
   * Qualquer troca efetiva de senha (por e-mail ou obrigatória) limpa a flag
   * e a expiração da senha temporária.
   */
  async updateSenha(usuarioId: number, senhaHash: string): Promise<void> {
    await this.db.query(
      `UPDATE app_usuarios
          SET senha_hash = $1,
              precisa_trocar_senha = FALSE,
              senha_temporaria_expira_em = NULL,
              senha_alterada_em = now(),
              atualizado_em = now()
        WHERE id = $2`,
      [senhaHash, usuarioId],
    );
  }

  /**
   * Define uma senha temporária gerada pelo administrador e marca a troca
   * obrigatória no próximo login. A senha é armazenada somente como hash.
   */
  async definirSenhaTemporaria(usuarioId: number, senhaHash: string, expiraEm: Date): Promise<void> {
    await this.db.query(
      `UPDATE app_usuarios
          SET senha_hash = $1,
              precisa_trocar_senha = TRUE,
              senha_temporaria_expira_em = $3,
              atualizado_em = now()
        WHERE id = $2`,
      [senhaHash, usuarioId, expiraEm],
    );
  }
}
