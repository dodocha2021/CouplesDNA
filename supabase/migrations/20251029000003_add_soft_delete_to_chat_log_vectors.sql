-- Add soft delete support to chat_log_vectors table
-- Migration: 20251029000003_add_soft_delete_to_chat_log_vectors

-- Add is_active column for soft delete (cascades from user_uploads)
ALTER TABLE chat_log_vectors
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_log_vectors_is_active ON chat_log_vectors(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_log_vectors_user_id_is_active ON chat_log_vectors(user_id, is_active);

-- Comment
COMMENT ON COLUMN chat_log_vectors.is_active IS 'Soft delete flag: true = active, false = deleted (cascades from user_uploads)';
