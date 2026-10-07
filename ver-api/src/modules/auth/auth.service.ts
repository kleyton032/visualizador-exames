import { AuthRepository } from './auth.repository';
import { comparePassword, hashPassword } from '../../shared/security/password';
import { signAccessToken } from '../../shared/security/jwt';
import { generateRefreshToken, hashToken } from '../../shared/security/token';
import { config } from '../../shared/config';
import { Perfil, SafeUser, Usuario } from './auth.types';
import * as crypto from 'crypto';

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

const PERFIS_VALIDOS: Perfil[] = ['ADMIN', 'OPERADOR', 'VISUALIZADOR'];

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

  async createUser(input: {
    login: string;
    senha: string;
    email?: string;
    nome?: string;
    perfil: string;
  }): Promise<SafeUser> {
    const login = (input.login || '').trim();
    const senha = input.senha || '';
    const email = (input.email || '').trim() || null;
    const nome = (input.nome || '').trim() || null;
    const perfil = (input.perfil || '').trim().toUpperCase() as Perfil;

    if (!login) {
      throw new Error('Login é obrigatório');
    }
    if (senha.length < 8) {
      throw new Error('A senha deve ter pelo menos 8 caracteres');
    }
    if (!PERFIS_VALIDOS.includes(perfil)) {
      throw new Error('Perfil inválido. Use ADMIN, OPERADOR ou VISUALIZADOR');
    }

    const loginExistente = await this.repo.findByLogin(login);
    if (loginExistente) {
      throw new Error('Já existe um usuário com esse login');
    }

    if (email) {
      const emailExistente = await this.repo.findByEmail(email);
      if (emailExistente) {
        throw new Error('Já existe um usuário com esse email');
      }
    }

    const senhaHash = await hashPassword(senha);
    const id = await this.repo.createUsuario({ login, senhaHash, nome, email, perfil });

    return { id, login, nome, email, perfil };
  }

  // --- Recuperação de Senha ---

  async forgotPassword(email: string, meta: RequestMeta = {}): Promise<void> {
    const emailNormalizado = (email || '').trim();
    if (!emailNormalizado) {
      throw new Error('E-mail é obrigatório');
    }

    const usuario = await this.repo.findByEmail(emailNormalizado);
    if (!usuario || usuario.SITUACAO !== 'A') {
      // Retorna sucesso de forma silenciosa para evitar enumeração de usuários
      return;
    }

    // Gera um token forte
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = hashToken(resetToken);
    
    // Expira em 15 minutos
    const expiraEm = new Date(Date.now() + 15 * 60 * 1000);

    await this.repo.createRecuperacaoSenha(usuario.ID, resetTokenHash, expiraEm);
    await this.repo.log('FORGOT_PASSWORD_REQUEST', { usuarioId: usuario.ID, ...meta });

    // TODO: Integrar envio de e-mail (Resend, SendGrid, etc.)
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
    console.log(`\n[EMAIL MOCK] Para: ${emailNormalizado} -> Link de Reset: ${resetLink}\n`);
  }

  async resetPassword(token: string, novaSenha: string, meta: RequestMeta = {}): Promise<void> {
    if (!token || !novaSenha || novaSenha.length < 8) {
      throw new Error('Token e senha (mínimo 8 caracteres) são obrigatórios');
    }

    const tokenHash = hashToken(token);
    const recuperacao = await this.repo.findRecuperacaoSenhaByTokenHash(tokenHash);

    if (!recuperacao) {
      throw new Error('Token inválido ou expirado');
    }

    if (recuperacao.usado) {
      throw new Error('Este link de recuperação já foi utilizado');
    }

    if (recuperacao.expira_em.getTime() < Date.now()) {
      throw new Error('Token inválido ou expirado');
    }

    const senhaHash = await hashPassword(novaSenha);
    await this.repo.updateSenha(recuperacao.usuario_id, senhaHash);
    await this.repo.marcarRecuperacaoUsada(recuperacao.id);
    
    // Revoga sessões antigas para forçar re-autenticação em todos os dispositivos (boa prática LGPD/Security)
    await this.repo.revogarSessoesUsuario(recuperacao.usuario_id);
    
    await this.repo.log('PASSWORD_RESET', { usuarioId: recuperacao.usuario_id, ...meta });
  }
}
