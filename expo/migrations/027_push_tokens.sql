-- ============================================================
-- STEP 27 — Push notification token storage
-- ============================================================
-- Stores one Expo push token per (user_id, device) so the backend can
-- send real push notifications (e.g. for overdue disputes) even when
-- the app is closed, via Expo's push API:
--   https://exp.host/--/api/v2/push/send
--
-- A user may have multiple devices, so this is NOT a single column on
-- `users` — it's its own table keyed by the token itself (a token is
-- unique per device+app install, so re-registering the same device
-- just upserts the existing row instead of creating duplicates).
--
-- Safe to re-run: every statement uses IF NOT EXISTS / idempotent
-- guards, matching the style of 019_minimal_base_schema.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL UNIQUE,
  platform TEXT DEFAULT 'unknown',
  device_name TEXT DEFAULT '',
  last_registered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens (user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on push_tokens"  ON push_tokens;
DROP POLICY IF EXISTS "Allow public insert on push_tokens"       ON push_tokens;
DROP POLICY IF EXISTS "Allow public update on push_tokens"       ON push_tokens;
DROP POLICY IF EXISTS "Allow public delete on push_tokens"       ON push_tokens;

-- Permissive policies matching the rest of this project: the backend
-- validates user identity in the tRPC context, not at the DB layer.
CREATE POLICY "Allow public read access on push_tokens" ON push_tokens
  FOR SELECT USING (true);
CREATE POLICY "Allow public insert on push_tokens" ON push_tokens
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on push_tokens" ON push_tokens
  FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on push_tokens" ON push_tokens
  FOR DELETE USING (true);
