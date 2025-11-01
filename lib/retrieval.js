import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function retrieveKnowledge(embedding, config) {
  const { selectedFileIds, threshold, topK } = config;

  const { data, error } = await supabase.rpc('match_knowledge', {
    query_embedding: `[${embedding.join(',')}]`,
    match_threshold: threshold,
    match_count: topK,
    p_file_ids: selectedFileIds.length > 0 ? selectedFileIds : null
  });

  if (error) throw error;
  return data || [];
}

export async function retrieveUserData(embedding, config) {
  const { selectedUserId, selectedFileIds, topK } = config;
  
  if (!selectedUserId) return [];
  
  const { data, error } = await supabase.rpc('match_user_data_by_files', {
    p_user_id: selectedUserId,
    query_embedding: `[${embedding.join(',')}]`,
    match_count: topK,
    p_file_ids: selectedFileIds.length > 0 ? selectedFileIds : null
  });
  
  if (error) throw error;
  return data || [];
}
