import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export interface AccessTokenPayload {
  sub: number;
  login: string;
  perfil: string;
  nome?: string;
}

/** Assina um access token (JWT) de curta duração. */
export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: config.jwtAccessExpires as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwtSecret, options);
}

/** Verifica a assinatura e a validade do access token. Lança erro se inválido/expirado. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
  return {
    sub: Number(decoded.sub),
    login: String(decoded.login),
    perfil: String(decoded.perfil),
    nome: decoded.nome ? String(decoded.nome) : undefined,
  };
}
