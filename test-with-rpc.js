require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

async function testWithRPC() {
  const query = "why radio technologist need climb the tower?";
  
  const vec = await hf.featureExtraction({
    model: 'BAAI/bge-base-en-v1.5',
    inputs: query
  });
  const finalVec = Array.isArray(vec[0]) ? vec[0] : vec;
  const vectorString = `[${finalVec.join(',')}]`;
  
  // 搜索整个数据库（不限制 file_id）
  const { data, error } = await supabase.rpc('match_knowledge', {
    query_embedding: vectorString,
    match_threshold: 0.0,
    match_count: 50
  });
  
  if (error) {
    console.error('错误:', error);
    return;
  }
  
  console.log(`找到 ${data.length} 个结果\n`);
  
  // 检查 ID 208, 217, 226 是否在结果中
  const targetIds = [208, 217, 226];
  const found = data.filter(r => targetIds.includes(r.id));
  
  console.log(`目标片段（包含爬塔内容）:`);
  targetIds.forEach(id => {
    const result = data.find(r => r.id === id);
    if (result) {
      console.log(`  ID ${id}: 相似度 ${result.similarity.toFixed(4)} ✅`);
    } else {
      console.log(`  ID ${id}: 未找到 ❌`);
    }
  });
  
  console.log(`\n前10个结果:`);
  data.slice(0, 10).forEach((r, i) => {
    const isTarget = targetIds.includes(r.id);
    console.log(`  ${i+1}. [${r.similarity.toFixed(4)}] ID:${r.id} ${isTarget ? '⭐' : ''}`);
  });
}

testWithRPC();
