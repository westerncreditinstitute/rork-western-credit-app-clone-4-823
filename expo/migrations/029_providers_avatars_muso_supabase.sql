-- Migration 029: migrate providers.ts, avatars.ts, and muso-token.ts off the
-- dead SurrealDB endpoint (process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT) onto
-- Supabase. None of these tables existed anywhere yet (SurrealDB was the
-- only backing store), so this migration creates them from scratch.

-- ============================================================
-- Hire A Pro marketplace: CSO providers, reviews, consultations
-- ============================================================

CREATE TABLE IF NOT EXISTS cso_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  specialties TEXT[] DEFAULT '{}',
  years_experience INTEGER DEFAULT 0,
  location TEXT DEFAULT '',
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  consultation_fee DECIMAL(10,2) DEFAULT 99.99,
  is_available BOOLEAN DEFAULT true,
  certified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cso_providers_user_id ON cso_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_cso_providers_is_available ON cso_providers(is_available);

CREATE TABLE IF NOT EXISTS cso_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES cso_providers(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer_name TEXT DEFAULT '',
  reviewer_avatar TEXT DEFAULT '',
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cso_reviews_provider_id ON cso_reviews(provider_id);

CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES cso_providers(id) ON DELETE CASCADE,
  provider_name TEXT DEFAULT '',
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_name TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  amount DECIMAL(10,2) DEFAULT 99.99,
  platform_fee DECIMAL(10,2) DEFAULT 25.00,
  provider_payout DECIMAL(10,2) DEFAULT 74.99,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'completed', 'refunded')),
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultations_provider_id ON consultations(provider_id);
CREATE INDEX IF NOT EXISTS idx_consultations_client_id ON consultations(client_id);

-- ============================================================
-- Section-embedded AI avatars (admin-managed, per course/section).
-- Distinct from the game's `avatar_items` table.
-- ============================================================

CREATE TABLE IF NOT EXISTS section_avatars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  title TEXT NOT NULL,
  embed_code TEXT DEFAULT '',
  api_key TEXT DEFAULT '',
  description TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_section_avatars_course_section ON section_avatars(course_id, section_id);

-- ============================================================
-- MUSO test-token economy (getWallet / mint / burn / sync / mainnet swap
-- registration). Distinct from the pre-existing `player_wallets` game
-- currency table and from the unrelated `muso_token_economy_tables.sql`
-- schema (which targets auth.users and was never wired to any router).
-- ============================================================

CREATE TABLE IF NOT EXISTS muso_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  balance DECIMAL(20,8) DEFAULT 0,
  total_minted DECIMAL(20,8) DEFAULT 0,
  total_burned DECIMAL(20,8) DEFAULT 0,
  last_updated BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_muso_wallets_player_id ON muso_wallets(player_id);

CREATE TABLE IF NOT EXISTS muso_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT NOT NULL,
  wallet_id UUID REFERENCES muso_wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mint', 'burn')),
  amount DECIMAL(20,8) NOT NULL,
  reason TEXT DEFAULT '',
  balance_after DECIMAL(20,8) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_muso_transactions_player_id ON muso_transactions(player_id);
CREATE INDEX IF NOT EXISTS idx_muso_transactions_created_at ON muso_transactions(created_at DESC);

CREATE TABLE IF NOT EXISTS muso_swap_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT NOT NULL UNIQUE,
  email TEXT,
  agreed_to_terms BOOLEAN DEFAULT false,
  registered_at BIGINT,
  snapshot_balance DECIMAL(20,8) DEFAULT 0,
  snapshot_total_minted DECIMAL(20,8) DEFAULT 0,
  last_balance_update BIGINT,
  status TEXT DEFAULT 'registered',
  eligible BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_muso_swap_registrations_player_id ON muso_swap_registrations(player_id);

-- ============================================================
-- Permissive RLS policies matching the rest of the project's convention
-- (server-only access via the service-role key; these are USING (true) /
-- WITH CHECK (true) like every other table added in prior migrations).
-- ============================================================

ALTER TABLE cso_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cso_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE muso_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE muso_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE muso_swap_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on cso_providers" ON cso_providers;
DROP POLICY IF EXISTS "Allow public insert on cso_providers" ON cso_providers;
DROP POLICY IF EXISTS "Allow public update on cso_providers" ON cso_providers;
DROP POLICY IF EXISTS "Allow public delete on cso_providers" ON cso_providers;
CREATE POLICY "Allow public read access on cso_providers" ON cso_providers FOR SELECT USING (true);
CREATE POLICY "Allow public insert on cso_providers" ON cso_providers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on cso_providers" ON cso_providers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on cso_providers" ON cso_providers FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read access on cso_reviews" ON cso_reviews;
DROP POLICY IF EXISTS "Allow public insert on cso_reviews" ON cso_reviews;
CREATE POLICY "Allow public read access on cso_reviews" ON cso_reviews FOR SELECT USING (true);
CREATE POLICY "Allow public insert on cso_reviews" ON cso_reviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access on consultations" ON consultations;
DROP POLICY IF EXISTS "Allow public insert on consultations" ON consultations;
DROP POLICY IF EXISTS "Allow public update on consultations" ON consultations;
CREATE POLICY "Allow public read access on consultations" ON consultations FOR SELECT USING (true);
CREATE POLICY "Allow public insert on consultations" ON consultations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on consultations" ON consultations FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public read access on section_avatars" ON section_avatars;
DROP POLICY IF EXISTS "Allow public insert on section_avatars" ON section_avatars;
DROP POLICY IF EXISTS "Allow public update on section_avatars" ON section_avatars;
DROP POLICY IF EXISTS "Allow public delete on section_avatars" ON section_avatars;
CREATE POLICY "Allow public read access on section_avatars" ON section_avatars FOR SELECT USING (true);
CREATE POLICY "Allow public insert on section_avatars" ON section_avatars FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on section_avatars" ON section_avatars FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on section_avatars" ON section_avatars FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read access on muso_wallets" ON muso_wallets;
DROP POLICY IF EXISTS "Allow public insert on muso_wallets" ON muso_wallets;
DROP POLICY IF EXISTS "Allow public update on muso_wallets" ON muso_wallets;
CREATE POLICY "Allow public read access on muso_wallets" ON muso_wallets FOR SELECT USING (true);
CREATE POLICY "Allow public insert on muso_wallets" ON muso_wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on muso_wallets" ON muso_wallets FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public read access on muso_transactions" ON muso_transactions;
DROP POLICY IF EXISTS "Allow public insert on muso_transactions" ON muso_transactions;
CREATE POLICY "Allow public read access on muso_transactions" ON muso_transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on muso_transactions" ON muso_transactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access on muso_swap_registrations" ON muso_swap_registrations;
DROP POLICY IF EXISTS "Allow public insert on muso_swap_registrations" ON muso_swap_registrations;
DROP POLICY IF EXISTS "Allow public update on muso_swap_registrations" ON muso_swap_registrations;
CREATE POLICY "Allow public read access on muso_swap_registrations" ON muso_swap_registrations FOR SELECT USING (true);
CREATE POLICY "Allow public insert on muso_swap_registrations" ON muso_swap_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on muso_swap_registrations" ON muso_swap_registrations FOR UPDATE USING (true);

-- updated_at triggers (reuses the shared update_updated_at_column() function
-- already defined by earlier migrations / supabase-schema.sql)
DROP TRIGGER IF EXISTS update_cso_providers_updated_at ON cso_providers;
CREATE TRIGGER update_cso_providers_updated_at BEFORE UPDATE ON cso_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_consultations_updated_at ON consultations;
CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_section_avatars_updated_at ON section_avatars;
CREATE TRIGGER update_section_avatars_updated_at BEFORE UPDATE ON section_avatars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_muso_wallets_updated_at ON muso_wallets;
CREATE TRIGGER update_muso_wallets_updated_at BEFORE UPDATE ON muso_wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_muso_swap_registrations_updated_at ON muso_swap_registrations;
CREATE TRIGGER update_muso_swap_registrations_updated_at BEFORE UPDATE ON muso_swap_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
