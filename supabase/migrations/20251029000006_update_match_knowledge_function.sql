-- Update match_knowledge function to support soft delete
-- Migration: 20251029000006_update_match_knowledge_function

-- Recreate function with correct table (knowledge_vectors) and soft delete support
CREATE OR REPLACE FUNCTION public.match_knowledge(
    query_embedding vector(768),
    match_threshold double precision,
    match_count integer,
    p_file_ids text[] DEFAULT NULL
)
RETURNS TABLE(content text, metadata jsonb, similarity double precision)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kv.content,
    kv.metadata,
    1 - (kv.embedding <=> query_embedding) AS similarity
  FROM knowledge_vectors AS kv
  INNER JOIN knowledge_uploads AS ku ON (kv.metadata->>'file_id')::text = ku.id::text
  WHERE
    kv.is_active = true  -- Only active vectors
    AND ku.is_active = true  -- Only active uploads
    AND (p_file_ids IS NULL OR (kv.metadata->>'file_id') = ANY(p_file_ids))
    AND 1 - (kv.embedding <=> query_embedding) > match_threshold
  ORDER BY
    similarity DESC
  LIMIT
    match_count;
END;
$$;

COMMENT ON FUNCTION match_knowledge IS 'Retrieve knowledge base vectors with soft delete support - only returns results from active uploads and vectors';
