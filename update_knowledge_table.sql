
-- Add category and source columns to the knowledge_vectors table
ALTER TABLE public.knowledge_vectors
ADD COLUMN category TEXT,
ADD COLUMN source TEXT;

-- Optional: Add comments to the new columns for clarity
COMMENT ON COLUMN public.knowledge_vectors.category IS 'The category of the knowledge chunk, e.g., "Product Docs" or "Sales Scripts".';
COMMENT ON COLUMN public.knowledge_vectors.source IS 'The origin of the knowledge chunk, e.g., a filename or a URL.';
