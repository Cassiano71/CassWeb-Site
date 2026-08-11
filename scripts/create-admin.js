import readline from 'readline';
import pg from 'pg';
import { hashPassword, validatePasswordStrength } from '../lib/password.js';
import { validateUsername } from '../lib/validators.js';
import { loadEnvFile } from '../lib/load-env.js';

loadEnvFile();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    if (!hidden) {
      rl.question(question, resolve);
      return;
    }

    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (!wasRaw) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let value = '';
    const onData = (char) => {
      if (char === '\u0003') {
        process.exit();
      }
      if (char === '\r' || char === '\n') {
        stdin.removeListener('data', onData);
        if (!wasRaw) stdin.setRawMode(false);
        process.stdout.write('\n');
        resolve(value);
        return;
      }
      if (char === '\u007f') {
        value = value.slice(0, -1);
        return;
      }
      value += char;
    };

    stdin.on('data', onData);
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Erro: defina DATABASE_URL antes de criar o administrador.');
    process.exit(1);
  }

  console.log('\n=== Criar primeiro administrador — Central CassWeb ===\n');

  const nome = (await ask('Nome completo: ')).trim();
  const username = (await ask('Usuário (username): ')).trim();
  const password = await ask('Senha: ', { hidden: true });
  const confirm = await ask('Confirmar senha: ', { hidden: true });

  rl.close();

  if (!nome) {
    console.error('Nome é obrigatório.');
    process.exit(1);
  }

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

  if (password !== confirm) {
    console.error('As senhas não coincidem.');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: /neon\.tech|sslmode=require/i.test(databaseUrl)
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();

  const existing = await client.query(
    'SELECT id FROM usuarios_admin WHERE username = $1',
    [username],
  );

  if (existing.rowCount > 0) {
    console.error('Este username já existe. Use outro ou o script admin:add.');
    await client.end();
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  await client.query(
    `INSERT INTO usuarios_admin (nome, username, password_hash, role)
     VALUES ($1, $2, $3, 'admin')`,
    [nome, username, passwordHash],
  );

  await client.end();

  console.log('\n✓ Administrador criado com sucesso.');
  console.log('  Acesse /central/login e entre com o usuário criado.\n');
}

main().catch((error) => {
  console.error('Erro:', error.message);
  process.exit(1);
});
