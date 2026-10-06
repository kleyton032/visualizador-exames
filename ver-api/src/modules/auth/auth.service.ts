import { AuthRepository } from './auth.repository';
import { comparePassword } from '../../shared/security/password';
import { signAccessToken } from '../../shared/security/jwt';
import { generateRefreshToken, hashToken } from '../../shared/security/token';
import { config } from '../../shared/config';
import { SafeUser, Usuario } from './auth.types';

export interface LoginResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

function toSafeUser(u: Usuario): SafeUser {
  return {
    id: u.ID,
    login: u.LOGIN,
    nome: u.NOME,
    email: u.EMAIL,
    perfil: u.PERFIL,
  };
}

function novaExpiracaoRefresh(): Date {
  return new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
}

export class AuthService {
  private repo = new AuthRepository();

  async login(login: string, senha: string, meta: RequestMeta = {}): Promise<LoginResult> {
    const loginNormalizado = (login || '').trim();
    const usuario = await this.repo.findByLogin(loginNormalizado);

    if (!usuario) {
      await this.repo.log('LOGIN_FALHA', { detalhe: `Usuário inexistente: ${loginNormalizado}`, ...meta });
      throw new Error('Credenciais inválidas');
    }

    if (usuario.SITUACAO !== 'A') {
      await this.repo.log('LOGIN_FALHA', { usuarioId: usuario.ID, detalhe: 'Conta bloqueada', ...meta });
      throw new Error('Conta bloqueada. Entre em contato com o administrador.');
    }

    const senhaOk = await comparePassword(senha, usuario.SENHA_HASH);
    if (!senhaOk) {
      await this.repo.registrarFalhaLogin(usuario.ID);
      await this.repo.log('LOGIN_FALHA', { usuarioId: usuario.ID, detalhe: 'Senha incorreta', ...meta });
      throw new Error('Credenciais inválidas');
    }

    await this.repo.resetarFalhasLogin(usuario.ID);
    await this.repo.updateUltimoLogin(usuario.ID);

    const refreshToken = generateRefreshToken();
    await this.repo.createSessao({
      usuarioId: usuario.ID,
      refreshTokenHash: hashToken(refreshToken),
      expiraEm: novaExpiracaoRefresh(),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    await this.repo.log('LOGIN_OK', { usuarioId: usuario.ID, ...meta });

    const accessToken = signAccessToken({
      sub: usuario.ID,
      login: usuario.LOGIN,
      perfil: usuario.PERFIL,
      nome: usuario.NOME ?? undefined,
    });

    return { user: toSafeUser(usuario), accessToken, refreshToken };
  }

  async refresh(refreshToken: string | undefined, meta: RequestMeta = {}): Promise<LoginResult> {
    if (!refreshToken) {
      throw new Error('Sessão ausente');
    }

    const hash = hashToken(refreshToken);
    const sessao = await this.repo.findSessaoByTokenHash(hash);

    if (!sessao) {
      await this.repo.log('ACESSO_NEGADO', { detalhe: 'Refresh token desconhecido', ...meta });
      throw new Error('Sessão inválida');
    }

    // Reuso de token já revogado → possível roubo: revoga todas as sessões do usuário.
    if (sessao.REVOGADA === 'S') {
      await this.repo.revogarSessoesUsuario(sessao.USUARIO_ID);
      await this.repo.log('ACESSO_NEGADO', { usuarioId: sessao.USUARIO_ID, detalhe: 'Reuso de refresh token', ...meta });
      throw new Error('Sessão inválida');
    }

    if (sessao.EXPIRA_EM && sessao.EXPIRA_EM.getTime() < Date.now()) {
      await this.repo.revogarSessao(sessao.ID);
      await this.repo.log('ACESSO_NEGADO', { usuarioId: sessao.USUARIO_ID, detalhe: 'Sessão expirada', ...meta });
      throw new Error('Sessão expirada');
    }

    const usuario = await this.repo.findById(sessao.USUARIO_ID);
    if (!usuario || usuario.SITUACAO !== 'A') {
      throw new Error('Usuário bloqueado ou inexistente');
    }

    // Rotação: revoga a sessão atual e emite um novo refresh token.
    await this.repo.revogarSessao(sessao.ID);

    const novoRefresh = generateRefreshToken();
    await this.repo.createSessao({
      usuarioId: usuario.ID,
      refreshTokenHash: hashToken(novoRefresh),
      expiraEm: novaExpiracaoRefresh(),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    await this.repo.log('REFRESH', { usuarioId: usuario.ID, ...meta });

    const accessToken = signAccessToken({
      sub: usuario.ID,
      login: usuario.LOGIN,
      perfil: usuario.PERFIL,
      nome: usuario.NOME ?? undefined,
    });

    return { user: toSafeUser(usuario), accessToken, refreshToken: novoRefresh };
  }

  async logout(refreshToken: string | undefined, meta: RequestMeta = {}): Promise<void> {
    if (!refreshToken) return;

    const hash = hashToken(refreshToken);
    const sessao = await this.repo.findSessaoByTokenHash(hash);
    if (sessao) {
      await this.repo.revogarSessao(sessao.ID);
      await this.repo.log('LOGOUT', { usuarioId: sessao.USUARIO_ID, ...meta });
    }
  }

  async logoutAll(userId: number, meta: RequestMeta = {}): Promise<void> {
    await this.repo.revogarSessoesUsuario(userId);
    await this.repo.log('LOGOUT', { usuarioId: userId, detalhe: 'Todas as sessões encerradas', ...meta });
  }

  async me(userId: number): Promise<SafeUser | undefined> {
    const usuario = await this.repo.findById(userId);
    return usuario ? toSafeUser(usuario) : undefined;
  }
}
