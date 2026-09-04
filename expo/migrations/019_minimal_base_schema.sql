-- ============================================================
-- STEP 1 (MINIMAL) — Base schema required by the My Agent feature
-- ============================================================
-- Use this INSTEAD of the full supabase-schema.sql if you hit a
-- syntax error pasting the large file into the Supabase SQL Editor.
--
-- The full supabase-schema.sql is ~130,000 characters / 2,767 lines,
-- which frequently gets TRUNCATED when pasted into the web SQL Editor.
-- A truncated paste cuts a CREATE POLICY statement in half and leaves
-- an orphaned "USING (...)" line, producing exactly this error:
--     ERROR: 42601: syntax error at or near "USING"
--
-- This script contains ONLY the two tables the My Agent feature needs
-- (users + disputes) and is small enough to paste safely.
--
-- Safe to re-run: every statement uses IF NOT EXISTS / idempotent guards.
-- ============================================================

-- Required for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  member_since TEXT DEFAULT '',
  role TEXT DEFAULT 'Student',
  courses_completed INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  referrals INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. disputes
-- ------------------------------------------------------------
-- NOTE: the column is "creditor" (NOT "creditor_name").
-- backend/trpc/routes/ai-agents.ts inserts into this exact shape.
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  creditor TEXT NOT NULL,
  account_number TEXT DEFAULT '',
  dispute_type TEXT NOT NULL,
  date_sent DATE NOT NULL,
  status TEXT DEFAULT 'sent',
  last_updated DATE,
  response_by DATE,
  letter_content TEXT DEFAULT '',
  timeline JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  reminders JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes (user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_date_sent ON disputes (date_sent DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status);

-- ------------------------------------------------------------
-- 3. Row Level Security
-- ------------------------------------------------------------
-- Permissive policies matching the rest of this project: the backend
-- validates user identity in the tRPC context, not at the DB layer.
-- DROP first so this script is safely re-runnable (CREATE POLICY has
-- no IF NOT EXISTS in older Postgres versions).

ALTER TABLE users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on users"   ON users;
DROP POLICY IF EXISTS "Allow public insert on users"        ON users;
DROP POLICY IF EXISTS "Allow public update on users"        ON users;
DROP POLICY IF EXISTS "Allow public delete on users"        ON users;

CREATE POLICY "Allow public read access on users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public insert on users"      ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on users"      ON users FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on users"      ON users FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read access on disputes" ON disputes;
DROP POLICY IF EXISTS "Allow public insert on disputes"      ON disputes;
DROP POLICY IF EXISTS "Allow public update on disputes"      ON disputes;
DROP POLICY IF EXISTS "Allow public delete on disputes"      ON disputes;

CREATE POLICY "Allow public read access on disputes" ON disputes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on disputes"      ON disputes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on disputes"      ON disputes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on disputes"      ON disputes FOR DELETE USING (true);

-- ------------------------------------------------------------
-- 4. Verification — should return both table names
-- ------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'disputes')
ORDER BY table_name;
