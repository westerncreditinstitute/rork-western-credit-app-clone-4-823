-- MUSO Token Economy System - Supabase Database Schema
-- This schema implements the complete token economy system with real-time synchronization

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Player Bank Accounts Table
-- ============================================
CREATE TABLE IF NOT EXISTS player_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number TEXT UNIQUE NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'checking', -- checking, savings
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  overdraft_limit DECIMAL(15, 2) NOT NULL DEFAULT 100.00,
  available_balance DECIMAL(15, 2) GENERATED ALWAYS AS (balance + overdraft_limit) STORED,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for player_bank_accounts
CREATE INDEX idx_bank_accounts_player_id ON player_bank_accounts(player_id);
CREATE INDEX idx_bank_accounts_account_number ON player_bank_accounts(account_number);

-- ============================================
-- 2. Player Token Wallets Table
-- ============================================
CREATE TABLE IF NOT EXISTS player_token_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  wallet_address TEXT UNIQUE NOT NULL,
  muso_balance DECIMAL(20, 8) NOT NULL DEFAULT 0.00,
  total_minted DECIMAL(20, 8) NOT NULL DEFAULT 0.00,
  total_burned DECIMAL(20, 8) NOT NULL DEFAULT 0.00,
  pending_mint DECIMAL(20, 8) NOT NULL DEFAULT 0.00,
  pending_burn DECIMAL(20, 8) NOT NULL DEFAULT 0.00,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'synced', -- synced, pending, failed
  blockchain_tx_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for player_token_wallets
CREATE INDEX idx_token_wallets_player_id ON player_token_wallets(player_id);
CREATE INDEX idx_token_wallets_wallet_address ON player_token_wallets(wallet_address);

-- ============================================
-- 3. Token Transactions Table
-- ============================================
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES player_token_wallets(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- mint, burn, transfer
  amount DECIMAL(20, 8) NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  balance_before DECIMAL(20, 8) NOT NULL,
  balance_after DECIMAL(20, 8) NOT NULL,
  game_transaction_id UUID REFERENCES game_transactions(id) ON DELETE SET NULL,
  blockchain_tx_hash TEXT,
  blockchain_status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, failed
  blockchain_confirmations INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for token_transactions
CREATE INDEX idx_token_transactions_player_id ON token_transactions(player_id);
CREATE INDEX idx_token_transactions_wallet_id ON token_transactions(wallet_id);
CREATE INDEX idx_token_transactions_type ON token_transactions(transaction_type);
CREATE INDEX idx_token_transactions_created_at ON token_transactions(created_at DESC);
CREATE INDEX idx_token_transactions_blockchain_status ON token_transactions(blockchain_status);

-- ============================================
-- 4. Enhanced Game Transactions Table
-- ============================================
CREATE TABLE IF NOT EXISTS game_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- income, expense, transfer
  amount DECIMAL(15, 2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  token_sync_status TEXT NOT NULL DEFAULT 'pending', -- pending, synced, failed
  token_transaction_id UUID REFERENCES token_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for game_transactions
CREATE INDEX idx_game_transactions_player_id ON game_transactions(player_id);
CREATE INDEX idx_game_transactions_type ON game_transactions(transaction_type);
CREATE INDEX idx_game_transactions_token_sync_status ON game_transactions(token_sync_status);
CREATE INDEX idx_game_transactions_created_at ON game_transactions(created_at DESC);

-- ============================================
-- 5. Token Sync Log Table
-- ============================================
CREATE TABLE IF NOT EXISTS token_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- auto, manual, batch
  game_balance DECIMAL(15, 2) NOT NULL,
  token_balance DECIMAL(20, 8) NOT NULL,
  expected_token_balance DECIMAL(20, 8) NOT NULL,
  difference DECIMAL(20, 8) NOT NULL,
  action_taken TEXT NOT NULL, -- mint, burn, none
  amount_adjusted DECIMAL(20, 8),
  status TEXT NOT NULL DEFAULT 'success', -- success, error, warning
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for token_sync_log
CREATE INDEX idx_token_sync_log_player_id ON token_sync_log(player_id);
CREATE INDEX idx_token_sync_log_status ON token_sync_log(status);
CREATE INDEX idx_token_sync_log_created_at ON token_sync_log(created_at DESC);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE player_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_token_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_bank_accounts
CREATE POLICY "Users can view their own bank accounts"
  ON player_bank_accounts FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Users can insert their own bank accounts"
  ON player_bank_accounts FOR INSERT
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can update their own bank accounts"
  ON player_bank_accounts FOR UPDATE
  USING (auth.uid() = player_id);

-- RLS Policies for player_token_wallets
CREATE POLICY "Users can view their own token wallets"
  ON player_token_wallets FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Users can insert their own token wallets"
  ON player_token_wallets FOR INSERT
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can update their own token wallets"
  ON player_token_wallets FOR UPDATE
  USING (auth.uid() = player_id);

-- RLS Policies for token_transactions
CREATE POLICY "Users can view their own token transactions"
  ON token_transactions FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Users can insert their own token transactions"
  ON token_transactions FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- RLS Policies for game_transactions
CREATE POLICY "Users can view their own game transactions"
  ON game_transactions FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Users can insert their own game transactions"
  ON game_transactions FOR INSERT
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can update their own game transactions"
  ON game_transactions FOR UPDATE
  USING (auth.uid() = player_id);

-- RLS Policies for token_sync_log
CREATE POLICY "Users can view their own sync logs"
  ON token_sync_log FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Users can insert their own sync logs"
  ON token_sync_log FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_player_bank_accounts_updated_at BEFORE UPDATE ON player_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_token_wallets_updated_at BEFORE UPDATE ON player_token_wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Initial Data and Configuration
-- ============================================

-- Insert exchange rate configuration
CREATE TABLE IF NOT EXISTS token_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO token_config (config_key, config_value) VALUES
  ('exchange_rate', '{"muso_per_dollar": 10, "dollars_per_muso": 0.1}'::jsonb),
  ('token_info', '{"name": "MUSO Token", "symbol": "MUSO", "decimals": 18, "network": "sepolia"}'::jsonb),
  ('sync_config', '{"batch_interval_seconds": 30, "max_retries": 3, "enable_auto_sync": true}'::jsonb)
ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- Views for Common Queries
-- ============================================

-- View for player complete token summary
CREATE OR REPLACE VIEW player_token_summary AS
SELECT 
  p.id as player_id,
  p.email,
  w.wallet_address,
  w.muso_balance,
  w.total_minted,
  w.total_burned,
  w.sync_status,
  ba.balance as bank_balance,
  ba.available_balance,
  COUNT(DISTINCT t.id) as total_transactions,
  COUNT(DISTINCT CASE WHEN t.blockchain_status = 'confirmed' THEN t.id END) as confirmed_transactions
FROM auth.users p
LEFT JOIN player_token_wallets w ON p.id = w.player_id
LEFT JOIN player_bank_accounts ba ON p.id = ba.player_id
LEFT JOIN token_transactions t ON w.id = t.wallet_id
GROUP BY p.id, p.email, w.wallet_address, w.muso_balance, w.total_minted, w.total_burned, w.sync_status, ba.balance, ba.available_balance;

-- View for recent token transactions
CREATE OR REPLACE VIEW recent_token_transactions AS
SELECT 
  t.id,
  t.player_id,
  t.transaction_type,
  t.amount,
  t.reason,
  t.balance_before,
  t.balance_after,
  t.blockchain_status,
  t.created_at,
  w.wallet_address
FROM token_transactions t
JOIN player_token_wallets w ON t.wallet_id = w.id
ORDER BY t.created_at DESC
LIMIT 100;