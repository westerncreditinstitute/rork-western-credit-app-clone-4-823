-- ============================================================
-- Migration 028: Finish the SurrealDB -> Supabase migration for
-- subscriptions, course progress, referrals, and wallets.
--
-- WHY THIS EXISTS
-- ----------------
-- The Railway migration moved the app off SurrealDB, but
-- `backend/trpc/routes/subscriptions.ts`, `progress.ts`, and
-- `wallet.ts` were left calling `process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT`,
-- a SurrealDB HTTP endpoint that no longer exists post-migration. Every
-- call to those routes threw "Database configuration missing", which is
-- the actual root cause of "free user upgrades do not persist after
-- logout/refresh": `subscriptions.create` (called from
-- `SubscriptionContext.upgradeToACE1`) failed silently server-side, so
-- nothing was ever written to a database - only to AsyncStorage, which a
-- fresh login on another device (or a cleared cache) does not see.
--
-- This migration extends the existing `subscriptions` and
-- `wallet_transactions` tables and adds the `course_progress`,
-- `referrals`, `wallets`, and `payout_requests` tables so the rewritten
-- Supabase-backed route files have somewhere to read and write.
-- ============================================================

-- ----------------------------------------------------------------
-- Subscriptions: add the columns the app's subscription model needs
-- beyond the original minimal (plan/status/start_date/end_date) shape.
-- ----------------------------------------------------------------
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS tier TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS initial_registration_date TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS initial_registration_expiry TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS certificate_paid BOOLEAN DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS referred_by UUID;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS promo_applied BOOLEAN DEFAULT false;

-- `plan` was the original column name; `tier` is what the app's TypeScript
-- types and every UI screen actually use. Keep both in sync going forward
-- (the new route writes to both) and backfill any existing rows once.
UPDATE subscriptions SET tier = plan WHERE tier IS NULL AND plan IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);

-- ----------------------------------------------------------------
-- Course progress: distinct from `video_progress` (which tracks a single
-- video's playhead). This tracks a user's completion of a whole course,
-- broken down by section - the shape `contexts/SubscriptionContext.tsx`
-- and `progress.ts` already expect (`sections`, `overallProgress`,
-- `enrolled`).
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  sections JSONB DEFAULT '{}'::jsonb,
  overall_progress INTEGER DEFAULT 0,
  enrolled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_progress_user_id ON course_progress(user_id);

ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on course_progress" ON course_progress;
DROP POLICY IF EXISTS "Allow public insert on course_progress" ON course_progress;
DROP POLICY IF EXISTS "Allow public update on course_progress" ON course_progress;

CREATE POLICY "Allow public read access on course_progress" ON course_progress FOR SELECT USING (true);
CREATE POLICY "Allow public insert on course_progress" ON course_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on course_progress" ON course_progress FOR UPDATE USING (true);

DROP TRIGGER IF EXISTS update_course_progress_updated_at ON course_progress;
CREATE TRIGGER update_course_progress_updated_at BEFORE UPDATE ON course_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------
-- Referrals: one row per successful referral, used by
-- subscriptions.getReferralStats to compute payouts.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referred_user_name TEXT DEFAULT '',
  referred_user_email TEXT DEFAULT '',
  referral_type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  referrer_tier_at_signup TEXT,
  qualifies_at TIMESTAMPTZ,
  total_earned DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on referrals" ON referrals;
DROP POLICY IF EXISTS "Allow public insert on referrals" ON referrals;
DROP POLICY IF EXISTS "Allow public update on referrals" ON referrals;

CREATE POLICY "Allow public read access on referrals" ON referrals FOR SELECT USING (true);
CREATE POLICY "Allow public insert on referrals" ON referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on referrals" ON referrals FOR UPDATE USING (true);

-- ----------------------------------------------------------------
-- Wallets: one aggregate balance row per user. `wallet_transactions`
-- (already in supabase-schema.sql) is the ledger; this is the running
-- total that ledger entries are folded into.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  available_balance DECIMAL(10,2) DEFAULT 0,
  pending_balance DECIMAL(10,2) DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0,
  total_withdrawn DECIMAL(10,2) DEFAULT 0,
  last_payout_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on wallets" ON wallets;
DROP POLICY IF EXISTS "Allow public insert on wallets" ON wallets;
DROP POLICY IF EXISTS "Allow public update on wallets" ON wallets;

CREATE POLICY "Allow public read access on wallets" ON wallets FOR SELECT USING (true);
CREATE POLICY "Allow public insert on wallets" ON wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on wallets" ON wallets FOR UPDATE USING (true);

DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- `wallet_transactions` already exists (supabase-schema.sql) but is
-- missing a few columns the ledger logic in wallet.ts needs.
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS reference_type TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- ----------------------------------------------------------------
-- Payout requests: withdrawal requests against a wallet's available
-- balance.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_details TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON payout_requests(user_id);

ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on payout_requests" ON payout_requests;
DROP POLICY IF EXISTS "Allow public insert on payout_requests" ON payout_requests;
DROP POLICY IF EXISTS "Allow public update on payout_requests" ON payout_requests;

CREATE POLICY "Allow public read access on payout_requests" ON payout_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert on payout_requests" ON payout_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on payout_requests" ON payout_requests FOR UPDATE USING (true);
