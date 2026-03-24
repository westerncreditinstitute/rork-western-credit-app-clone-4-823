-- Migration to fix persistent errors
-- Fixes:
-- 1. Ensure visitor_history view exists and is correct
-- 2. Create partnership tables if needed
-- 3. Add any missing columns or indexes

-- ============================================
-- Fix 1: Ensure visitor_history view exists
-- ============================================

-- Drop view if it exists to recreate it properly
DROP VIEW IF EXISTS public.visitor_history;

-- Recreate visitor_history view with all required columns
CREATE OR REPLACE VIEW public.visitor_history AS
SELECT 
  v.id,
  v.home_id,
  v.visitor_id,
  v.visit_start_time,
  v.visit_end_time,
  v.duration_seconds,
  v.is_online,
  v.rating,
  v.comment,
  v.created_at,
  h.home_name,
  h.home_tier,
  tc.tier_name,
  p.email as visitor_email,
  p.raw_user_meta_data->>'username' as visitor_name,
  o.raw_user_meta_data->>'username' as owner_name
FROM home_visitors v
JOIN player_homes h ON v.home_id = h.id
LEFT JOIN home_tier_config tc ON h.home_tier = tc.id
LEFT JOIN auth.users p ON v.visitor_id = p.id
LEFT JOIN auth.users o ON h.player_id = o.id;

-- ============================================
-- Fix 2: Create partnership tables (for multiplayer features)
-- ============================================

-- Table: partnership_proposals
CREATE TABLE IF NOT EXISTS partnership_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposal_type TEXT NOT NULL CHECK (proposal_type IN ('business', 'real_estate', 'investment', 'general')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  title TEXT NOT NULL,
  description TEXT,
  terms JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(proposer_id, receiver_id, status)
);

-- Table: partnerships
CREATE TABLE IF NOT EXISTS partnerships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partnership_type TEXT NOT NULL CHECK (partnership_type IN ('business', 'real_estate', 'investment', 'general')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  title TEXT NOT NULL,
  description TEXT,
  agreement_terms JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  CHECK (partner1_id < partner2_id), -- Ensure consistent ordering
  UNIQUE(partner1_id, partner2_id, partnership_type)
);

-- Indexes for partnership tables
CREATE INDEX IF NOT EXISTS idx_partnership_proposals_proposer ON partnership_proposals(proposer_id);
CREATE INDEX IF NOT EXISTS idx_partnership_proposals_receiver ON partnership_proposals(receiver_id);
CREATE INDEX IF NOT EXISTS idx_partnership_proposals_status ON partnership_proposals(status);
CREATE INDEX IF NOT EXISTS idx_partnership_proposals_created ON partnership_proposals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partnerships_partner1 ON partnerships(partner1_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_partner2 ON partnerships(partner2_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_status ON partnerships(status);
CREATE INDEX IF NOT EXISTS idx_partnerships_type ON partnerships(partnership_type);

-- RLS Policies for partnership_proposals
ALTER TABLE partnership_proposals ENABLE ROW LEVEL SECURITY;

-- Proposer can see their own proposals
CREATE POLICY "Proposers can view own proposals"
ON partnership_proposals FOR SELECT
USING (auth.uid() = proposer_id);

-- Receivers can see proposals sent to them
CREATE POLICY "Receivers can view proposals sent to them"
ON partnership_proposals FOR SELECT
USING (auth.uid() = receiver_id);

-- Proposers can create proposals
CREATE POLICY "Proposers can create proposals"
ON partnership_proposals FOR INSERT
WITH CHECK (auth.uid() = proposer_id);

-- Receivers can update proposals (accept/reject)
CREATE POLICY "Receivers can update proposals"
ON partnership_proposals FOR UPDATE
USING (auth.uid() = receiver_id);

-- Proposers can delete their pending proposals
CREATE POLICY "Proposers can delete own proposals"
ON partnership_proposals FOR DELETE
USING (auth.uid() = proposer_id AND status = 'pending');

-- RLS Policies for partnerships
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;

-- Partners can view their partnerships
CREATE POLICY "Partners can view partnerships"
ON partnerships FOR SELECT
USING (auth.uid() = partner1_id OR auth.uid() = partner2_id);

-- Partners can create partnerships
CREATE POLICY "Partners can create partnerships"
ON partnerships FOR INSERT
WITH CHECK (auth.uid() = partner1_id OR auth.uid() = partner2_id);

-- Partners can update partnerships
CREATE POLICY "Partners can update partnerships"
ON partnerships FOR UPDATE
USING (auth.uid() = partner1_id OR auth.uid() = partner2_id);

-- ============================================
-- Fix 3: Ensure home_visitors table has all required columns
-- ============================================

-- Check if created_at column exists, add if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'home_visitors' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE home_visitors ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- Fix 4: Create triggers for updated_at timestamps
-- ============================================

-- Trigger for partnership_proposals
CREATE OR REPLACE FUNCTION update_partnership_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_proposals_updated_at ON partnership_proposals;
CREATE TRIGGER trigger_update_proposals_updated_at
BEFORE UPDATE ON partnership_proposals
FOR EACH ROW
EXECUTE FUNCTION update_partnership_proposals_updated_at();

-- Trigger for partnerships
CREATE OR REPLACE FUNCTION update_partnerships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_partnerships_updated_at ON partnerships;
CREATE TRIGGER trigger_update_partnerships_updated_at
BEFORE UPDATE ON partnerships
FOR EACH ROW
EXECUTE FUNCTION update_partnerships_updated_at();

-- ============================================
-- Verification Queries
-- ============================================

-- Verify visitor_history view
SELECT 'visitor_history view exists' AS status;

-- Verify partnership tables
SELECT 
  'partnership_proposals table exists' AS status
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'partnership_proposals'
);

SELECT 
  'partnerships table exists' AS status
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'partnerships'
);

-- Verify home_visitors created_at column
SELECT 
  'home_visitors.created_at column exists' AS status
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'home_visitors' 
  AND column_name = 'created_at'
);