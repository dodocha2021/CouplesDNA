-- Change the vector dimensions of the embedding column from 1536 to 768.
ALTER TABLE knowledge_vectors
ALTER COLUMN embedding TYPE VECTOR(768);