-- 修改 match_knowledge 函数，接受 TEXT 类型的向量
DROP FUNCTION IF EXISTS match_knowledge(vector, float, int);
DROP FUNCTION IF EXISTS match_knowledge(text, float, int);

CREATE OR REPLACE FUNCTION match_knowledge (
  query_embedding TEXT,  -- 改为 TEXT 类型
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5
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
    1 - (kv.embedding <=> query_embedding::vector) AS similarity  -- 转换为 vector
  FROM knowledge_vectors kv
  WHERE 1 - (kv.embedding <=> query_embedding::vector) >= match_threshold
  ORDER BY kv.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;

-- 测试函数
SELECT 'match_knowledge function updated to accept TEXT!' AS status;