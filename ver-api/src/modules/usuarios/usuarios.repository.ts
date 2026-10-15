import { PostgresConnection } from '../../shared/database/PostgresConnection';

export interface UsuarioListagem {
  id: number;
  login: string;
  nome: string | null;
  email: string | null;
  perfil: string;
  situacao: string;
  ultimo_login: Date | null;
  precisa_trocar_senha: boolean;
  criado_em: Date;
}

export interface FiltroUsuarios {
  busca?: string;
  perfil?: string;
  situacao?: string;
  page?: number;
  pageSize?: number;
}

export interface Paginado<T> {
  total: number;
  page: number;
  pageSize: number;
  data: T[];
}

export interface AtualizarUsuarioInput {
  nome?: string | null;
  email?: string | null;
  perfil?: string;
  situacao?: string;
}

export interface AuditoriaRedefinicao {
  id: number;
  admin_id: number;
  admin_login: string;
  usuario_id: number;
  ip: string | null;
  criado_em: Date;
}

const COLS_LISTAGEM = `
  id, login, nome, email, perfil, situacao, ultimo_login,
  precisa_trocar_senha, criado_em
`;

export class UsuariosRepository {
  private db = PostgresConnection.getInstance();

  async listar(filtro: FiltroUsuarios): Promise<Paginado<UsuarioListagem>> {
    const page = Math.max(1, filtro.page || 1);
    const pageSize = Math.min(100, Math.max(1, filtro.pageSize || 20));
    const where: string[] = [];
    const params: unknown[] = [];

    if (filtro.busca) {
      params.push(`%${filtro.busca}%`);
      where.push(`(login ILIKE $${params.length} OR nome ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    if (filtro.perfil) {
      params.push(filtro.perfil);
      where.push(`perfil = $${params.length}`);
    }
    if (filtro.situacao) {
      params.push(filtro.situacao);
      where.push(`situacao = $${params.length}`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countResult = await this.db.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM app_usuarios ${whereSql}`,
      params,
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const offset = (page - 1) * pageSize;
    const dataParams = [...params, pageSize, offset];
    const result = await this.db.query<UsuarioListagem>(
      `SELECT ${COLS_LISTAGEM}
         FROM app_usuarios
         ${whereSql}
        ORDER BY nome ASC NULLS LAST, login ASC
        LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams,
    );

    return { total, page, pageSize, data: result.rows };
  }

  async findById(id: number): Promise<UsuarioListagem | undefined> {
    const result = await this.db.query<UsuarioListagem>(
      `SELECT ${COLS_LISTAGEM} FROM app_usuarios WHERE id = $1`,
      [id],
    );
    return result.rows[0];
  }

  async atualizar(id: number, input: AtualizarUsuarioInput): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (input.nome !== undefined) {
      params.push(input.nome);
      sets.push(`nome = $${params.length}`);
    }
    if (input.email !== undefined) {
      params.push(input.email);
      sets.push(`email = $${params.length}`);
    }
    if (input.perfil !== undefined) {
      params.push(input.perfil);
      sets.push(`perfil = $${params.length}`);
    }
    if (input.situacao !== undefined) {
      params.push(input.situacao);
      sets.push(`situacao = $${params.length}`);
    }

    if (sets.length === 0) return;

    params.push(id);
    await this.db.query(
      `UPDATE app_usuarios SET ${sets.join(', ')}, atualizado_em = now() WHERE id = $${params.length}`,
      params,
    );
  }

  async registrarRedefinicao(adminId: number, usuarioId: number, ip?: string, userAgent?: string): Promise<void> {
    await this.db.query(
      `INSERT INTO auth_redefinicao_senha (admin_id, usuario_id, ip, user_agent, criado_em)
       VALUES ($1, $2, $3, $4, now())`,
      [adminId, usuarioId, ip ?? null, userAgent ?? null],
    );
  }

  async listarAuditoria(usuarioId: number): Promise<AuditoriaRedefinicao[]> {
    const result = await this.db.query<AuditoriaRedefinicao>(
      `SELECT ar.id,
              ar.admin_id,
              u.login AS admin_login,
              ar.usuario_id,
              ar.ip,
              ar.criado_em
         FROM auth_redefinicao_senha ar
         JOIN app_usuarios u ON u.id = ar.admin_id
        WHERE ar.usuario_id = $1
        ORDER BY ar.criado_em DESC`,
      [usuarioId],
    );
    return result.rows;
  }
}
