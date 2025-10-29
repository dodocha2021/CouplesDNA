-- Update match_user_data_by_files function to support soft delete
-- Migration: 20251029000005_update_match_user_data_function

-- Recreate function with soft delete support
CREATE OR REPLACE FUNCTION match_user_data_by_files(
  p_user_id uuid,
  query_embedding vector(768),
  match_count int DEFAULT 5,
  p_file_ids text[] DEFAULT NULL
)
RETURNS TABLE (
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    clv.content,
    clv.metadata,
    1 - (clv.embedding <=> query_embedding) as similarity
  FROM chat_log_vectors AS clv
  INNER JOIN user_uploads AS uu ON (clv.metadata->>'file_id')::text = uu.id::text
  WHERE
    clv.user_id = p_user_id
    AND clv.is_active = true  -- Only active vectors
    AND uu.is_active = true   -- Only active uploads
    AND (p_file_ids IS NULL OR (clv.metadata->>'file_id') = ANY(p_file_ids))
  ORDER BY
    clv.embedding <=> query_embedding
  LIMIT
    match_count;
END;
$$;

COMMENT ON FUNCTION match_user_data_by_files IS 'Retrieve user data vectors with soft delete support - only returns results from active uploads and vectors';
