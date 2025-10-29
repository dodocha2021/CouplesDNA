-- Add soft delete support to knowledge_vectors table
-- Migration: 20251029000004_add_soft_delete_to_knowledge_vectors

-- Add is_active column for soft delete (cascades from knowledge_uploads)
ALTER TABLE knowledge_vectors
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_is_active ON knowledge_vectors(is_active);

-- Comment
COMMENT ON COLUMN knowledge_vectors.is_active IS 'Soft delete flag: true = active, false = deleted (cascades from knowledge_uploads)';
