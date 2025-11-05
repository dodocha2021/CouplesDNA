require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

async function finalTest() {
  // 用完全相同的查询
  const query = "why radio technologist need climb the tower?";
  
  console.log(`查询: "${query}"\n`);
  
  const vec = await hf.featureExtraction({
    model: 'BAAI/bge-base-en-v1.5',
    inputs: query
  });
  const finalVec = Array.isArray(vec[0]) ? vec[0] : vec;
  const vectorString = `[${finalVec.join(',')}]`;
  
  const { data } = await supabase.rpc('match_knowledge', {
    query_embedding: vectorString,
    match_threshold: 0.3,
    match_count: 20
  });
  
  console.log(`找到 ${data.length} 个结果\n`);
  
  const has208 = data.find(r => r.id === 208);
  const has226 = data.find(r => r.id === 226);
  
  if (has208) {
    console.log(`✅ ID 208: 相似度 ${has208.similarity.toFixed(4)}`);
  } else {
    console.log(`❌ ID 208: 未找到`);
  }
  
  if (has226) {
    console.log(`✅ ID 226: 相似度 ${has226.similarity.toFixed(4)}`);
  } else {
    console.log(`❌ ID 226: 未找到`);
  }
  
  console.log(`\n前5个结果:`);
  data.slice(0, 5).forEach((r, i) => {
    console.log(`${i+1}. [${r.similarity.toFixed(4)}] ID:${r.id}`);
  });
}

finalTest();
