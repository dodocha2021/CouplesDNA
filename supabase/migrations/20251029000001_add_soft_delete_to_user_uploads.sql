-- Add soft delete support to user_uploads table
-- Migration: 20251029000001_add_soft_delete_to_user_uploads

-- Add is_active column for soft delete
ALTER TABLE user_uploads
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_uploads_is_active ON user_uploads(is_active);
CREATE INDEX IF NOT EXISTS idx_user_uploads_user_id_is_active ON user_uploads(user_id, is_active);

-- Comment
COMMENT ON COLUMN user_uploads.is_active IS 'Soft delete flag: true = active, false = deleted';
