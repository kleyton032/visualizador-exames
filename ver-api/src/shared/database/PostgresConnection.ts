import { Pool } from 'pg';
import { config } from '../config';

/**
 * Pool de conexão PostgreSQL (usado pelo módulo de autenticação).
 * Espelha o padrão singleton do OracleConnection.
 */
export class PostgresConnection {
  private static instance: PostgresConnection;
  private pool: Pool | null = null;

  private constructor() {}

  public static getInstance(): PostgresConnection {
    if (!PostgresConnection.instance) {
      PostgresConnection.instance = new PostgresConnection();
    }
    return PostgresConnection.instance;
  }

  public async initialize(): Promise<void> {
    if (this.pool) return;

    this.pool = new Pool({ connectionString: config.databaseUrl });
    await this.pool.query('SELECT 1'); // valida a conexão
    console.log('Postgres Pool initialized');
  }

  public async query<T>(text: string, params: unknown[] = []): Promise<{ rows: T[] }> {
    if (!this.pool) {
      await this.initialize();
    }

    const result = await this.pool!.query(text, params);
    return { rows: result.rows as T[] };
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('Postgres Pool closed');
    }
  }
}
