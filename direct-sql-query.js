require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

async function directSQL() {
  const query = "why radio technologist need climb the tower?";
  
  const vec = await hf.featureExtraction({
    model: 'BAAI/bge-base-en-v1.5',
    inputs: query
  });
  const finalVec = Array.isArray(vec[0]) ? vec[0] : vec;
  
  // 绕过 RPC，直接用 postgrest
  const { data, error } = await supabase
    .from('knowledge_vectors')
    .select('id, content, metadata, embedding')
    .limit(1000);  // 获取所有数据
  
  if (error) {
    console.log('错误:', error);
    return;
  }
  
  console.log(`获取了 ${data.length} 条记录\n`);
  
  // 手动计算相似度
  const results = data.map(record => {
    let embedding = record.embedding;
    if (typeof embedding === 'string') {
      embedding = JSON.parse(embedding);
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < finalVec.length; i++) {
      dotProduct += finalVec[i] * embedding[i];
      normA += finalVec[i] * finalVec[i];
      normB += embedding[i] * embedding[i];
    }
    
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    
    return { id: record.id, similarity };
  });
  
  results.sort((a, b) => b.similarity - a.similarity);
  
  console.log('手动计算 - 前10个结果:');
  results.slice(0, 10).forEach((r, i) => {
    const marker = (r.id === 208 || r.id === 226) ? ' ⭐' : '';
    console.log(`${i+1}. [${r.similarity.toFixed(4)}] ID:${r.id}${marker}`);
  });
  
  console.log('\n\n现在测试 RPC 返回什么:');
  const { data: rpcData } = await supabase.rpc('match_knowledge', {
    query_embedding: finalVec,
    match_threshold: 0.0,
    match_count: 20
  });
  
  console.log(`RPC 返回 ${rpcData?.length || 0} 个结果:`);
  rpcData?.forEach((r, i) => {
    const marker = (r.id === 208 || r.id === 226) ? ' ⭐' : '';
    console.log(`${i+1}. [${r.similarity.toFixed(4)}] ID:${r.id}${marker}`);
  });
}

directSQL();
