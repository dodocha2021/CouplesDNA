require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

// 强制创建新的客户端实例
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { 
    db: { schema: 'public' },
    auth: { persistSession: false }
  }
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
const MODEL = 'sentence-transformers/all-mpnet-base-v2';

async function getEmbedding(text) {
  const response = await hf.featureExtraction({
    model: MODEL,
    inputs: text.replace(/\n/g, ' '),
  });
  return Array.isArray(response[0]) ? response[0] : response;
}

async function runTests() {
  console.log('=== 新测试 ===\n');

  // 直接用 SQL 查询原始数据
  const { data: raw } = await supabase
    .from('knowledge_vectors')
    .select('id, content')
    .limit(1);
  
  console.log('数据库记录数:', raw?.length || 0);
  if (raw?.[0]) {
    console.log('第一条记录 ID:', raw[0].id);
    console.log('内容预览:', raw[0].content.substring(0, 50));
  }

  // 测试搜索
  const queryEmbedding = await getEmbedding('how much for the room');
  console.log('\n查询向量维度:', queryEmbedding.length);

  const { data: results, error } = await supabase.rpc('match_knowledge', {
    query_embedding: queryEmbedding,
    match_threshold: 0.3,
    match_count: 5,
  });

  if (error) {
    console.log('搜索错误:', error.message);
  } else {
    console.log(`找到 ${results.length} 个结果`);
    results.forEach((r, i) => {
      console.log(`${i+1}. 相似度: ${r.similarity.toFixed(4)}`);
    });
  }
}

runTests();