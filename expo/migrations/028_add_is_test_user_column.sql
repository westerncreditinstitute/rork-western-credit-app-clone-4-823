-- Migration 028: Add is_test_user column to users table for testing support
-- This allows the Testing Dashboard to mark test users for cleanup and testing purposes

-- Add is_test_user column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_test_user BOOLEAN DEFAULT FALSE;

-- Create an index for faster queries on test users
CREATE INDEX IF NOT EXISTS idx_users_is_test_user ON users(is_test_user);

-- Add comment for documentation
COMMENT ON COLUMN users.is_test_user IS 'Flag to identify test users created via Testing Dashboard for end-to-end testing';
