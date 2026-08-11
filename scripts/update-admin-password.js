import readline from 'readline';
import pg from 'pg';
import { hashPassword, validatePasswordStrength } from '../lib/password.js';
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

  const username = (await ask('Username do administrador: ')).trim();
  const password = (await ask('Nova senha: ')).trim();
  const confirm = (await ask('Confirmar nova senha: ')).trim();
  rl.close();

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    console.error(passwordError);
    process.exit(1);
  }

  if (password !== confirm) {
    console.error('As senhas não coincidem.');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: dbSsl(process.env.DATABASE_URL),
  });
  await client.connect();

  const result = await client.query(
    'SELECT id FROM usuarios_admin WHERE username = $1',
    [username],
  );

  if (result.rowCount === 0) {
    console.error('Administrador não encontrado.');
    await client.end();
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  await client.query(
    'UPDATE usuarios_admin SET password_hash = $1 WHERE username = $2',
    [passwordHash, username],
  );

  await client.end();
  console.log('✓ Senha atualizada com sucesso.');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
