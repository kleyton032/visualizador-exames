import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Gera o hash bcrypt de uma senha em texto puro.
 * Implementação bcrypt puro em JS (bcryptjs) — mesmo algoritmo, sem dependência nativa.
 */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Compara uma senha em texto puro com um hash bcrypt armazenado. */
export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
