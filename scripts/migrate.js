import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { loadEnvFile } from '../lib/load-env.js';

loadEnvFile();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'migrations');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Erro: defina DATABASE_URL antes de executar as migrations.');
    console.error('Exemplo: DATABASE_URL="postgresql://..." npm run migrate');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: /neon\.tech|sslmode=require/i.test(databaseUrl)
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const applied = await client.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1',
      [file],
    );

    if (applied.rowCount > 0) {
      console.log(`✓ Já aplicada: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`→ Aplicando: ${file}`);

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file],
      );
      await client.query('COMMIT');
      console.log(`✓ Concluída: ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`✗ Falha em ${file}:`, error.message);
      process.exit(1);
    }
  }

  await client.end();
  console.log('\nMigrations finalizadas com sucesso.');
}

main().catch((error) => {
  console.error('Erro ao executar migrations:', error.message);
  process.exit(1);
});
