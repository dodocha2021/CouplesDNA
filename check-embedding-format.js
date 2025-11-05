require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkFormat() {
  const { data } = await supabase
    .from('knowledge_vectors')
    .select('id, embedding')
    .eq('id', 226)
    .single();
  
  console.log('ID 226 的 embedding:');
  console.log('类型:', typeof data.embedding);
  console.log('是否为数组:', Array.isArray(data.embedding));
  
  if (typeof data.embedding === 'string') {
    console.log('前100个字符:', data.embedding.substring(0, 100));
  } else if (Array.isArray(data.embedding)) {
    console.log('长度:', data.embedding.length);
    console.log('前5个值:', data.embedding.slice(0, 5));
    console.log('第一个值的类型:', typeof data.embedding[0]);
  }
}

checkFormat();
