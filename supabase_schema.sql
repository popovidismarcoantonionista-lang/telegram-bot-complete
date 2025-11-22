-- ===============================
-- TELEGRAM BOT - SUPABASE SCHEMA
-- ===============================
-- Execute este SQL no editor SQL do Supabase

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  saldo DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de depósitos
CREATE TABLE IF NOT EXISTS deposits (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  txid VARCHAR(255) UNIQUE NOT NULL,
  pix_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  parametros JSONB,
  resultado JSONB,
  valor DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- Tabela de auto-retries (auto-compra de créditos)
CREATE TABLE IF NOT EXISTS auto_retries (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  pedido_original JSONB NOT NULL,
  falta DECIMAL(10, 2) NOT NULL,
  pix_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'waiting_payment',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_deposits_telegram_id ON deposits(telegram_id);
CREATE INDEX IF NOT EXISTS idx_deposits_txid ON deposits(txid);
CREATE INDEX IF NOT EXISTS idx_deposits_pix_id ON deposits(pix_id);
CREATE INDEX IF NOT EXISTS idx_orders_telegram_id ON orders(telegram_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_auto_retries_telegram_id ON auto_retries(telegram_id);
CREATE INDEX IF NOT EXISTS idx_auto_retries_pix_id ON auto_retries(pix_id);
CREATE INDEX IF NOT EXISTS idx_auto_retries_status ON auto_retries(status);

-- Comentários nas tabelas
COMMENT ON TABLE users IS 'Usuários do bot Telegram';
COMMENT ON TABLE deposits IS 'Histórico de depósitos via Pix';
COMMENT ON TABLE orders IS 'Histórico de pedidos (SMS e Seguidores)';
COMMENT ON TABLE auto_retries IS 'Auditoria de auto-compra de créditos';

-- Comentários nas colunas
COMMENT ON COLUMN users.telegram_id IS 'ID único do usuário no Telegram';
COMMENT ON COLUMN users.saldo IS 'Saldo em reais do usuário';
COMMENT ON COLUMN deposits.txid IS 'Transaction ID do Pix';
COMMENT ON COLUMN deposits.pix_id IS 'ID da cobrança na PaguePix';
COMMENT ON COLUMN orders.parametros IS 'Parâmetros do pedido em JSON';
COMMENT ON COLUMN auto_retries.pedido_original IS 'Dados do pedido original que será reexecutado';
COMMENT ON COLUMN auto_retries.falta IS 'Valor que faltava no momento do pedido';
