-- Add phone and timezone fields to profiles table
-- Migration: 20251114000002_add_phone_timezone_to_profiles

-- Add phone and timezone fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC-8';

-- Add comments for documentation
COMMENT ON COLUMN profiles.phone IS 'User phone number';
COMMENT ON COLUMN profiles.timezone IS 'User timezone preference (e.g., UTC-8 for Pacific Time)';
