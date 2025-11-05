-- Drop the old function signatures to avoid conflicts
DROP FUNCTION IF EXISTS match_knowledge(vector, float, int);
DROP FUNCTION IF EXISTS match_knowledge(text, float, int);
DROP FUNCTION IF EXISTS match_knowledge(text, float, int, text);

-- Create the new, more efficient function with file_id filtering
CREATE OR REPLACE FUNCTION match_knowledge (
  query_embedding TEXT,  -- Accept embedding as TEXT
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5,
  p_file_id TEXT DEFAULT NULL -- New parameter for file_id
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kv.id,
    kv.content,
    kv.metadata,
    1 - (kv.embedding <=> query_embedding::vector) AS similarity  -- Cast TEXT to vector for comparison
  FROM knowledge_vectors kv
  WHERE
    (p_file_id IS NULL OR (kv.metadata->>'file_id')::text = p_file_id) AND -- Filter by file_id directly in the DB query
    (1 - (kv.embedding <=> query_embedding::vector) >= match_threshold)
  ORDER BY kv.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;

-- Confirmation message
SELECT 'match_knowledge function updated to accept TEXT embedding and an optional file_id for filtering!' AS status;
