-- Fix migration: Add missing is_active column to cities table
-- This fixes the error "column cities.is_active does not exist"

-- Add is_active column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cities' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE cities ADD COLUMN is_active BOOLEAN DEFAULT true;
    RAISE NOTICE 'Added is_active column to cities table';
  ELSE
    RAISE NOTICE 'is_active column already exists in cities table';
  END IF;
END $$;

-- Update all existing cities to be active
UPDATE cities SET is_active = true WHERE is_active IS NULL;

-- Recreate the index if it doesn't exist
DROP INDEX IF EXISTS idx_cities_active;
CREATE INDEX idx_cities_active ON cities(is_active) WHERE is_active = true;

-- Drop and recreate the RLS policy to ensure it's correct
DROP POLICY IF EXISTS "Anyone can view active cities" ON cities;
CREATE POLICY "Anyone can view active cities"
ON cities FOR SELECT
USING (is_active = true);

RAISE NOTICE 'Cities table fix migration completed successfully';
