require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkLimitation() {
  // 直接获取 ID 208 的 embedding
  const { data: record208 } = await supabase
    .from('knowledge_vectors')
    .select('id, embedding')
    .eq('id', 208)
    .single();
  
  console.log('直接用 ID 208 的 embedding 查询自己:\n');
  
  // 用它自己的 embedding 查询，应该返回相似度 1.0
  const { data: results, error } = await supabase.rpc('match_knowledge', {
    query_embedding: record208.embedding,
    match_threshold: 0.0,
    match_count: 50
  });

  if (error) {
    console.error('RPC 调用出错:', error);
    return;
  }
  
  console.log(`总共找到: ${results.length} 个结果`);
  
  const self = results.find(r => r.id === 208);
  if (self) {
    console.log(`✅ 找到了 ID 208 自己，相似度: ${self.similarity.toFixed(4)}`);
  } else {
    console.log(`❌ 连 ID 208 自己都找不到！`);
    console.log('\n返回的 ID 列表:');
    console.log(results.map(r => r.id).join(', '));
  }
}

checkLimitation();
