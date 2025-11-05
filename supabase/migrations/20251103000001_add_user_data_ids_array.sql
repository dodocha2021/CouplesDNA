-- Add user_data_ids array column for multi-file support
-- Migration: 20251103000001_add_user_data_ids_array
-- Phase 2: Multi-File Support for User Reports

-- Step 1: Add new array column for multi-file support
ALTER TABLE user_reports
  ADD COLUMN IF NOT EXISTS user_data_ids TEXT[] DEFAULT NULL;

-- Step 2: Migrate existing data from user_data_id to user_data_ids
-- Convert single ID to array format
UPDATE user_reports
SET user_data_ids = ARRAY[user_data_id::text]
WHERE user_data_id IS NOT NULL
  AND user_data_ids IS NULL;

-- Step 3: Add check constraint
-- At least one method must be used: either user_data_id OR user_data_ids
ALTER TABLE user_reports
  DROP CONSTRAINT IF EXISTS user_data_selection_check;

ALTER TABLE user_reports
  ADD CONSTRAINT user_data_selection_check
  CHECK (
    user_data_id IS NOT NULL OR
    (user_data_ids IS NOT NULL AND array_length(user_data_ids, 1) > 0)
  );

-- Step 4: Add comment for documentation
COMMENT ON COLUMN user_reports.user_data_ids IS 'Array of user data file IDs for multi-file support. Use this for new reports. Legacy reports use user_data_id (single file).';

-- Step 5: Create index for array column to improve query performance
CREATE INDEX IF NOT EXISTS idx_user_reports_user_data_ids
  ON user_reports USING GIN (user_data_ids);
