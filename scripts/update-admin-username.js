import readline from 'readline';
import pg from 'pg';
import { validateUsername } from '../lib/validators.js';
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

  const current = (await ask('Username atual: ')).trim();
  const next = (await ask('Novo username: ')).trim();
  rl.close();

  const usernameError = validateUsername(next);
  if (usernameError) {
    console.error(usernameError);
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: dbSsl(process.env.DATABASE_URL),
  });
  await client.connect();

  const result = await client.query(
    'UPDATE usuarios_admin SET username = $1 WHERE username = $2 RETURNING id',
    [next, current],
  );

  if (result.rowCount === 0) {
    console.error('Administrador não encontrado.');
    await client.end();
    process.exit(1);
  }

  await client.end();
  console.log('✓ Username atualizado com sucesso.');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
