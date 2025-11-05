-- Add 'slide' to prompt_type enum
-- Migration: 20251020000001_add_slide_prompt_type

-- This needs to be run in a separate transaction
ALTER TYPE prompt_type ADD VALUE IF NOT EXISTS 'slide';

-- Verify the change
-- Expected result: {general,report,slide}
COMMENT ON TYPE prompt_type IS 'Enum for prompt configuration types: general, report, slide';