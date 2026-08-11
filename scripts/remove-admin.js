import readline from 'readline';
import pg from 'pg';
import { loadEnvFile } from '../lib/load-env.js';

loadEnvFile();

function dbSsl(url) {
  return /neon\.tech|sslmode=require/i.test(url || '')
    ? { rejectUnauthorized: false }
    : undefined;
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Defina DATABASE_URL.');
    process.exit(1);
  }

  const username = (await ask('Username do administrador a remover: ')).trim();
  const confirm = (await ask(`Confirma remoção de "${username}"? (sim/não): `)).trim().toLowerCase();
  rl.close();

  if (confirm !== 'sim') {
    console.log('Operação cancelada.');
    process.exit(0);
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: dbSsl(process.env.DATABASE_URL),
  });
  await client.connect();

  const count = await client.query('SELECT COUNT(*)::int AS total FROM usuarios_admin');
  if (count.rows[0].total <= 1) {
    console.error('Não é possível remover o único administrador.');
    await client.end();
    process.exit(1);
  }

  const result = await client.query(
    'DELETE FROM usuarios_admin WHERE username = $1 RETURNING id',
    [username],
  );

  if (result.rowCount === 0) {
    console.error('Administrador não encontrado.');
    await client.end();
    process.exit(1);
  }

  await client.end();
  console.log('✓ Administrador removido.');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
