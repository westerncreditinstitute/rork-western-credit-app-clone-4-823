-- =============================================
-- MIGRATION: Fix game_states table for Credit Life Simulator
-- Run this in your Supabase SQL Editor to fix save functionality
-- =============================================

-- Step 1: Drop the existing game_states table (if it exists) and recreate without foreign key
-- NOTE: This will delete existing game state data. If you need to preserve data, 
-- use the alternative migration below instead.

-- OPTION A: Drop and recreate (simple, but loses existing data)
DROP TABLE IF EXISTS game_states CASCADE;

CREATE TABLE game_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  game_state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_game_states_user_id ON game_states(user_id);

-- Enable Row Level Security
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access on game_states" ON game_states;
DROP POLICY IF EXISTS "Allow public insert on game_states" ON game_states;
DROP POLICY IF EXISTS "Allow public update on game_states" ON game_states;
DROP POLICY IF EXISTS "Allow public delete on game_states" ON game_states;

-- Create RLS policies for public access
CREATE POLICY "Allow public read access on game_states" ON game_states FOR SELECT USING (true);
CREATE POLICY "Allow public insert on game_states" ON game_states FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on game_states" ON game_states FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on game_states" ON game_states FOR DELETE USING (true);

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_game_states_updated_at ON game_states;
CREATE TRIGGER update_game_states_updated_at 
  BEFORE UPDATE ON game_states 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- OPTION B: Alternative - Preserve existing data (use this instead if you have data to keep)
-- Uncomment the section below and comment out OPTION A above
-- =============================================

/*
-- Step 1: Create a backup of existing data
CREATE TABLE IF NOT EXISTS game_states_backup AS SELECT * FROM game_states;

-- Step 2: Drop the existing table
DROP TABLE IF EXISTS game_states CASCADE;

-- Step 3: Recreate with TEXT user_id (no foreign key)
CREATE TABLE game_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  game_state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Step 4: Restore data from backup (converting UUID to TEXT)
INSERT INTO game_states (id, user_id, game_state, created_at, updated_at)
SELECT id, user_id::TEXT, game_state, created_at, updated_at
FROM game_states_backup;

-- Step 5: Drop backup table (optional, you can keep it for safety)
-- DROP TABLE IF EXISTS game_states_backup;

-- Step 6: Create index
CREATE INDEX IF NOT EXISTS idx_game_states_user_id ON game_states(user_id);

-- Step 7: Enable RLS and create policies
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on game_states" ON game_states;
DROP POLICY IF EXISTS "Allow public insert on game_states" ON game_states;
DROP POLICY IF EXISTS "Allow public update on game_states" ON game_states;
DROP POLICY IF EXISTS "Allow public delete on game_states" ON game_states;

CREATE POLICY "Allow public read access on game_states" ON game_states FOR SELECT USING (true);
CREATE POLICY "Allow public insert on game_states" ON game_states FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on game_states" ON game_states FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on game_states" ON game_states FOR DELETE USING (true);

-- Step 8: Create trigger
DROP TRIGGER IF EXISTS update_game_states_updated_at ON game_states;
CREATE TRIGGER update_game_states_updated_at 
  BEFORE UPDATE ON game_states 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
*/

-- =============================================
-- Verify the migration was successful
-- =============================================
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'game_states'
ORDER BY ordinal_position;
