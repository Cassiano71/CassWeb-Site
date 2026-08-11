import readline from 'readline';
import pg from 'pg';
import { hashPassword, validatePasswordStrength } from '../lib/password.js';
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

  const nome = (await ask('Nome completo: ')).trim();
  const username = (await ask('Usuário (username): ')).trim();
  const password = (await ask('Senha: ')).trim();
  rl.close();

  const usernameError = validateUsername(username);
  if (usernameError) {
    console.error(usernameError);
    process.exit(1);
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    console.error(passwordError);
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: dbSsl(process.env.DATABASE_URL),
  });
  await client.connect();

  const passwordHash = await hashPassword(password);
  await client.query(
    `INSERT INTO usuarios_admin (nome, username, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
    [nome, username, passwordHash],
  );

  await client.end();
  console.log('✓ Administrador adicionado.');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
