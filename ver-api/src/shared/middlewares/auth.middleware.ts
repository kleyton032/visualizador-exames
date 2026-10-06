import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../security/jwt';
import { cookieNames } from '../security/cookies';

/** Exige access token válido. Anexa os dados do usuário em `req.user`. */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[cookieNames.access];

  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      login: payload.login,
      perfil: payload.perfil,
      nome: payload.nome,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
}
