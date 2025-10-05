CREATE OR REPLACE FUNCTION public.match_knowledge(
    p_query_embedding vector,
    p_match_threshold double precision,
    p_match_count integer,
    p_user_id uuid,
    p_file_id uuid
)
RETURNS TABLE(id bigint, content text, similarity double precision)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    user_uploads.id,
    user_uploads.content,
    1 - (user_uploads.embedding <=> p_query_embedding) AS similarity
  FROM user_uploads
  WHERE
    user_uploads.user_id = p_user_id AND
    user_uploads.file_id = p_file_id AND
    1 - (user_uploads.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY
    similarity DESC
  LIMIT
    p_match_count;
END;
$$;