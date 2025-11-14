-- Add onboarding questionnaire fields to profiles table
-- Migration: 20251114000001_add_onboarding_fields_to_profiles

-- Add new fields for first login onboarding questionnaire
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS relationship_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS relationship_duration TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consultation_focus JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primary_challenge TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN profiles.relationship_status IS 'Current relationship status: In a relationship, Married/Long-term partnership, Post-breakup/Divorce recovery, It''s complicated';
COMMENT ON COLUMN profiles.gender IS 'User gender: Male, Female, Non-binary, Prefer not to say';
COMMENT ON COLUMN profiles.relationship_duration IS 'How long in current relationship: Less than 3 months, 3-12 months, 1-3 years, 3-5 years, 5+ years';
COMMENT ON COLUMN profiles.consultation_focus IS 'Topics of interest (1-3 selections): Communication skills, Emotional connection & intimacy, etc.';
COMMENT ON COLUMN profiles.primary_challenge IS 'Open-ended text describing main challenge (optional, max 200 chars)';
COMMENT ON COLUMN profiles.profile_completed IS 'Whether user has completed the onboarding questionnaire';
COMMENT ON COLUMN profiles.profile_completed_at IS 'Timestamp when user completed the questionnaire';

-- Create index for faster queries on profile_completed
CREATE INDEX IF NOT EXISTS idx_profiles_profile_completed ON profiles(profile_completed);

-- Create index for querying by relationship_status
CREATE INDEX IF NOT EXISTS idx_profiles_relationship_status ON profiles(relationship_status);
