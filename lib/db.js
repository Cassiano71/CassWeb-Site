import pg from 'pg';
import { loadEnvFile } from './load-env.js';

const { Pool } = pg;

let pool;
let envLoaded = false;

function dbSsl(connectionString) {
  return /neon\.tech|sslmode=require/i.test(connectionString || '')
    ? { rejectUnauthorized: false }
    : undefined;
}

export function getPool() {
  if (!envLoaded) {
    loadEnvFile();
    envLoaded = true;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada.');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: dbSsl(process.env.DATABASE_URL),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  return pool;
}

export async function query(text, params) {
  const client = getPool();
  return client.query(text, params);
}

export async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
