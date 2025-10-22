-- 1. Create the table for storing user-specific chat log vectors
create table chat_log_vectors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, -- Foreign key to auth.users table for strict isolation
  content text,          -- The text content of the chat snippet
  embedding extensions.vector(768), -- The embedding vector for similarity search
  metadata jsonb,        -- For storing type (ai_chat/uploaded_log), session_id, speaker, etc.
  created_at timestamptz default now()
);
