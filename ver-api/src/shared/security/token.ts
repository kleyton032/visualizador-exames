import crypto from 'crypto';

/** Gera um refresh token opaco (não é JWT). */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

/**
 * Gera o hash SHA-256 (hex) do token.
 * Somente o hash é persistido no banco — nunca o token em texto puro.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
