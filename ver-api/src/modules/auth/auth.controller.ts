import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  accessTokenCookieOptions,
  clearCookieOptions,
  cookieNames,
  refreshTokenCookieOptions,
} from '../../shared/security/cookies';

export class AuthController {
  private service = new AuthService();

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie(cookieNames.access, accessToken, accessTokenCookieOptions());
    res.cookie(cookieNames.refresh, refreshToken, refreshTokenCookieOptions());
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie(cookieNames.access, clearCookieOptions('/'));
    res.clearCookie(cookieNames.refresh, clearCookieOptions('/api/auth'));
  }

  private meta(req: Request) {
    return {
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    };
  }

  login = async (req: Request, res: Response) => {
    try {
      const { login, senha } = req.body || {};
      if (!login || !senha) {
        return res.status(400).json({ error: 'Login e senha são obrigatórios' });
      }

      const result = await this.service.login(login, senha, this.meta(req));
      this.setAuthCookies(res, result.accessToken, result.refreshToken);
      return res.json({ user: result.user });
    } catch (error: any) {
      return res.status(401).json({ error: error.message || 'Falha no login' });
    }
  };

  refresh = async (req: Request, res: Response) => {
    try {
      const token = req.cookies?.[cookieNames.refresh];
      const result = await this.service.refresh(token, this.meta(req));
      this.setAuthCookies(res, result.accessToken, result.refreshToken);
      return res.json({ user: result.user });
    } catch (error: any) {
      this.clearAuthCookies(res);
      return res.status(401).json({ error: error.message || 'Sessão inválida' });
    }
  };

  logout = async (req: Request, res: Response) => {
    try {
      await this.service.logout(req.cookies?.[cookieNames.refresh], this.meta(req));
    } catch {
      // mesmo com erro, limpa os cookies no cliente
    }
    this.clearAuthCookies(res);
    return res.status(200).send();
  };

  logoutAll = async (req: Request, res: Response) => {
    try {
      await this.service.logoutAll(req.user!.id, this.meta(req));
      this.clearAuthCookies(res);
      return res.status(200).send();
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao encerrar sessões' });
    }
  };

  me = async (req: Request, res: Response) => {
    try {
      const user = await this.service.me(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      return res.json({ user });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao consultar usuário' });
    }
  };

  createUser = async (req: Request, res: Response) => {
    try {
      const { login, senha, email, nome, perfil } = req.body || {};
      const user = await this.service.createUser({ login, senha, email, nome, perfil });
      return res.status(201).json({ user });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao criar usuário' });
    }
  };
}
