import { NextFunction, Request, Response } from 'express';
import { Perfil } from '../../modules/auth/auth.types';

/** Exige que o usuário autenticado possua um dos perfis informados. */
export function requireRole(...perfis: Perfil[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const perfil = req.user?.perfil;
    if (!perfil || !perfis.includes(perfil as Perfil)) {
      return res.status(403).json({ error: 'Acesso negado para o seu perfil' });
    }
    next();
  };
}
