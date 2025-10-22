-- 2. Create an ENUM type for upload status
create type upload_status as enum ('pending', 'processing', 'completed', 'failed');

-- 3. Create the table for tracking user uploads and their status
create table user_uploads (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id),
    file_name text not null,
    file_size bigint not null,
    status upload_status not null default 'pending',
    uploaded_at timestamptz default now(),
    processed_at timestamptz
);
