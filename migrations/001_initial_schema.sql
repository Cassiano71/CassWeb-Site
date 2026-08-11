-- Migration 001: schema inicial da Central CassWeb

CREATE TABLE IF NOT EXISTS usuarios_admin (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  projeto VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  client_id VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clientes_status_check CHECK (status IN ('ATIVO', 'SUSPENSO'))
);

CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes (status);
CREATE INDEX IF NOT EXISTS idx_clientes_client_id ON clientes (client_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS usuarios_admin_updated_at ON usuarios_admin;
CREATE TRIGGER usuarios_admin_updated_at
  BEFORE UPDATE ON usuarios_admin
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS clientes_updated_at ON clientes;
CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
