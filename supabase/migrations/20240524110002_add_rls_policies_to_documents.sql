-- 4. Add RLS policies to the chat_log_vectors table
alter table chat_log_vectors enable row level security;

create policy "Allow users to access their own chat log vectors" 
on chat_log_vectors for all 
using (auth.uid() = user_id);

-- 5. Add RLS policies to the user_uploads table
alter table user_uploads enable row level security;

create policy "Allow users to access their own uploads" 
on user_uploads for all
using (auth.uid() = user_id);
