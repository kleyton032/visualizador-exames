import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.db') });

import { PostgresConnection } from '../shared/database/PostgresConnection';
import { hashPassword } from '../shared/security/password';

/**
 * Cria o usuário administrador inicial (PostgreSQL).
 * Uso: cd ver-api && npx ts-node src/scripts/seed-admin.ts
 * Requer ADMIN_SENHA (e opcionalmente ADMIN_LOGIN, ADMIN_NOME, ADMIN_PERFIL) no .env
 */
async function main() {
  const login = (process.env.ADMIN_LOGIN || 'admin').trim();
  const senha = process.env.ADMIN_SENHA;
  const nome = process.env.ADMIN_NOME || 'Administrador';
  const perfil = process.env.ADMIN_PERFIL || 'ADMIN';

  if (!senha) {
    console.error('ERRO: defina ADMIN_SENHA no arquivo .env antes de executar o seed.');
    process.exit(1);
  }

  const db = PostgresConnection.getInstance();
  const senhaHash = await hashPassword(senha);

  await db.query(
    `INSERT INTO app_usuarios
        (login, senha_hash, nome, email, perfil, situacao, falhas_login, criado_em, atualizado_em)
     VALUES ($1, $2, $3, NULL, $4, 'A', 0, now(), now())`,
    [login, senhaHash, nome, perfil],
  );

  console.log(`Usuário "${login}" criado com sucesso (perfil ${perfil}).`);
  await db.close();
}

main().catch((err) => {
  console.error('Falha ao criar usuário admin:', err);
  process.exit(1);
});
