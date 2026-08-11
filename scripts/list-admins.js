import pg from 'pg';
import { loadEnvFile } from '../lib/load-env.js';

loadEnvFile();

function dbSsl(url) {
  return /neon\.tech|sslmode=require/i.test(url || '')
    ? { rejectUnauthorized: false }
    : undefined;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Defina DATABASE_URL no arquivo .env');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: dbSsl(process.env.DATABASE_URL),
  });
  await client.connect();

  const result = await client.query(
    'SELECT id, nome, username, role, created_at FROM usuarios_admin ORDER BY id',
  );

  if (result.rowCount === 0) {
    console.log('Nenhum administrador cadastrado.');
  } else {
    console.log('\nAdministradores:\n');
    for (const row of result.rows) {
      console.log(`  #${row.id}  ${row.username}  (${row.nome})  [${row.role}]`);
    }
    console.log('');
  }

  await client.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
