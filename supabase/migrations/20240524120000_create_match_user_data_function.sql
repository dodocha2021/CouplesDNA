
-- 2. 创建 User Data 检索函数
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
  WHERE
    clv.user_id = p_user_id
    AND (p_file_ids IS NULL OR (clv.metadata->>'file_id') = ANY(p_file_ids))
  ORDER BY
    clv.embedding <=> query_embedding
  LIMIT
    match_count;
END;
$$;
