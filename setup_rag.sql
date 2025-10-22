-- Step 1: Ensure the vector extension is enabled.
-- This should be run only once.
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Create the table to store our knowledge vectors.
-- This table will hold both the static 'basic knowledge' and the dynamic 'user chat history'.
CREATE TABLE knowledge_vectors (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL, -- The actual text chunk
  metadata JSONB,      -- For filtering by source, user_id, etc.
  embedding VECTOR(1536) -- Stores the vector representation of the content. Assumes 1536 dimensions like OpenAI's ada-002.
);

-- Step 3: Create an index on the metadata column.
-- This is crucial for fast filtering, especially when the table grows.
-- It allows us to quickly find all vectors for a specific user or from a specific book.
CREATE INDEX ON knowledge_vectors USING GIN (metadata);

-- Step 4: Create the function to search for similar documents.
-- This function will be the core of our RAG retrieval process.
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(1536),
  match_count INT,
  filter JSONB DEFAULT '{}'
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_variable
BEGIN
  RETURN QUERY
  SELECT
    kv.id,
    kv.content,
    kv.metadata,
    1 - (kv.embedding <=> query_embedding) AS similarity -- Cosine similarity
  FROM
    knowledge_vectors AS kv
  WHERE
    kv.metadata @> filter -- This is the magic part that filters our documents based on the metadata.
  ORDER BY
    kv.embedding <=> query_embedding -- Order by distance (closest first)
  LIMIT
    match_count;
END;
$$;
