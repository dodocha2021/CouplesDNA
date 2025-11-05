-- Create RPC function to handle cascade soft delete for knowledge uploads
-- Migration: 20251029000007_create_soft_delete_knowledge_function

CREATE OR REPLACE FUNCTION soft_delete_knowledge_upload(p_upload_id uuid)
RETURNS TABLE(upload_updated boolean, vectors_updated bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vectors_count bigint;
BEGIN
  -- Soft delete the knowledge_uploads record
  UPDATE knowledge_uploads
  SET is_active = false
  WHERE id = p_upload_id;

  -- Cascade soft delete to knowledge_vectors
  UPDATE knowledge_vectors
  SET is_active = false
  WHERE (metadata->>'file_id')::uuid = p_upload_id
  AND is_active = true;

  -- Get count of updated vectors
  GET DIAGNOSTICS v_vectors_count = ROW_COUNT;

  -- Return results
  RETURN QUERY SELECT true, v_vectors_count;
END;
$$;

COMMENT ON FUNCTION soft_delete_knowledge_upload IS 'Soft delete a knowledge upload and cascade to all related vectors';
