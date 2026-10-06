import { CookieOptions } from 'express';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, config } from '../config';

export const cookieNames = {
  access: ACCESS_TOKEN_COOKIE,
  refresh: REFRESH_TOKEN_COOKIE,
};

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
  };
}

/** Access token: curta duração, disponível para todo o app. */
export function accessTokenCookieOptions(): CookieOptions {
  return { ...baseOptions(), path: '/', maxAge: 15 * 60 * 1000 };
}

/** Refresh token: longa duração, restrito às rotas /api/auth. */
export function refreshTokenCookieOptions(): CookieOptions {
  const maxAge = config.refreshTokenTtlDays * 24 * 60 * 60 * 1000;
  return { ...baseOptions(), path: '/api/auth', maxAge };
}

/** Opções para remover um cookie (maxAge 0). Deve usar o mesmo path do cookie original. */
export function clearCookieOptions(path: string): CookieOptions {
  return { ...baseOptions(), path, maxAge: 0 };
}
