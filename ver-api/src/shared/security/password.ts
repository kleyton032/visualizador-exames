import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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

// --- Política de senha e senha temporária ---

export const SENHA_MIN_CARACTERES = 10;

const REGEX_MAIUSCULA = /[A-Z]/;
const REGEX_MINUSCULA = /[a-z]/;
const REGEX_DIGITO = /[0-9]/;
const REGEX_SIMBOLO = /[^A-Za-z0-9]/;

// Alfabetos sem caracteres ambíguos (0/O, 1/l/I).
const CHARS_LOWER = 'abcdefghjkmnpqrstuvwxyz';
const CHARS_UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const CHARS_DIGITS = '23456789';
const CHARS_SYMBOLS = '!@#$%&*+-=?';

function pickChar(charset: string): string {
  return charset[crypto.randomInt(0, charset.length)];
}

/**
 * Gera uma senha temporária forte (aleatória, com ao menos um caractere de
 * cada classe: maiúscula, minúscula, dígito e símbolo). Nunca é registrada em
 * texto puro — somente seu hash.
 */
export function gerarSenhaTemporaria(comprimento = 12): string {
  const tamanho = comprimento < SENHA_MIN_CARACTERES ? SENHA_MIN_CARACTERES : comprimento;

  const chars: string[] = [
    pickChar(CHARS_LOWER),
    pickChar(CHARS_UPPER),
    pickChar(CHARS_DIGITS),
    pickChar(CHARS_SYMBOLS),
  ];

  const todos = CHARS_LOWER + CHARS_UPPER + CHARS_DIGITS + CHARS_SYMBOLS;
  for (let i = chars.length; i < tamanho; i++) {
    chars.push(pickChar(todos));
  }

  // Fisher–Yates usando crypto.randomInt para embaralhar.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

export interface PoliticaSenhaContexto {
  login?: string | null;
  nome?: string | null;
}

/**
 * Valida uma senha contra a política institucional.
 * Retorna a lista de motivos de reprovação (vazia quando a senha é válida).
 */
export function validarPoliticaSenha(senha: string, contexto: PoliticaSenhaContexto = {}): string[] {
  const motivos: string[] = [];

  if (!senha || senha.length < SENHA_MIN_CARACTERES) {
    motivos.push(`A senha deve ter pelo menos ${SENHA_MIN_CARACTERES} caracteres`);
  }
  if (!REGEX_MAIUSCULA.test(senha)) {
    motivos.push('A senha deve conter ao menos uma letra maiúscula');
  }
  if (!REGEX_MINUSCULA.test(senha)) {
    motivos.push('A senha deve conter ao menos uma letra minúscula');
  }
  if (!REGEX_DIGITO.test(senha)) {
    motivos.push('A senha deve conter ao menos um número');
  }
  if (!REGEX_SIMBOLO.test(senha)) {
    motivos.push('A senha deve conter ao menos um símbolo');
  }

  const login = (contexto.login || '').trim().toLowerCase();
  const nome = (contexto.nome || '').trim().toLowerCase();
  const senhaLower = senha.toLowerCase();

  if (login && senhaLower.includes(login)) {
    motivos.push('A senha não pode conter o login');
  }

  if (nome) {
    const partes = nome.split(/\s+/).filter((p) => p.length >= 4);
    if (partes.some((p) => senhaLower.includes(p))) {
      motivos.push('A senha não pode conter o nome');
    }
  }

  return motivos;
}

/** Indica se a senha atende à política institucional. */
export function senhaAtendePolitica(senha: string, contexto?: PoliticaSenhaContexto): boolean {
  return validarPoliticaSenha(senha, contexto).length === 0;
}
