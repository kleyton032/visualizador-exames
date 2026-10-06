import dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente do diretório do projeto.
// Não sobrescreve variáveis já definidas no processo.
// No container, os arquivos podem não existir (as variáveis vêm do ambiente do Docker).
for (const envFile of ['.env', '.env.db']) {
  try {
    dotenv.config({ path: path.resolve(process.cwd(), envFile) });
  } catch {
    // arquivo ausente é aceitável
  }
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',

  jwtSecret: process.env.JWT_SECRET || 'dev-inseguro-troque-esta-chave',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 1),

  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieSameSite: (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') || 'strict',

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  databaseUrl: process.env.DATABASE_URL || 'postgres://ver:ver@localhost:5432/ver',
  anexosBaseDir: process.env.ANEXOS_BASE_DIR || './uploads',
};

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
