import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../security/jwt';
import { cookieNames } from '../security/cookies';

function attachUser(req: Request, token: string): { id: number; login: string; perfil: string; nome?: string } {
  const payload = verifyAccessToken(token);
  return {
    id: payload.sub,
    login: payload.login,
    perfil: payload.perfil,
    nome: payload.nome,
  };
}

/**
 * Exige access token válido de escopo completo. Anexa os dados do usuário em
 * `req.user`. Tokens de escopo restrito (troca obrigatória de senha) são recusados.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[cookieNames.access];

  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.scope && payload.scope !== 'full') {
      return res.status(403).json({ error: 'Troca de senha obrigatória', mustChangePassword: true });
    }
    req.user = attachUser(req, token);
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
}

/**
 * Exige access token de escopo restrito (change_password), usado apenas no
 * fluxo de troca obrigatória de senha.
 */
export function passwordChangeMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[cookieNames.access];

  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.scope !== 'change_password') {
      return res.status(403).json({ error: 'Sessão não autorizada para troca de senha' });
    }
    req.user = attachUser(req, token);
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
}
