-- Add soft delete support to knowledge_uploads table
-- Migration: 20251029000002_add_soft_delete_to_knowledge_uploads

-- Add is_active column for soft delete
ALTER TABLE knowledge_uploads
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_knowledge_uploads_is_active ON knowledge_uploads(is_active);

-- Comment
COMMENT ON COLUMN knowledge_uploads.is_active IS 'Soft delete flag: true = active, false = deleted';
