require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

async function verifyMismatch() {
  // 测试两种模型
  const models = [
    'BAAI/bge-base-en-v1.5',
    'sentence-transformers/all-mpnet-base-v2'
  ];
  
  const query = "climb towers";
  
  for (const model of models) {
    console.log(`\n使用模型: ${model}\n`);
    
    const vec = await hf.featureExtraction({
      model: model,
      inputs: query
    });
    const finalVec = Array.isArray(vec[0]) ? vec[0] : vec;
    const vectorString = `[${finalVec.join(',')}]`;
    
    const { data } = await supabase.rpc('match_knowledge', {
      query_embedding: vectorString,
      match_threshold: 0.3,
      match_count: 10
    });
    
    // 检查是否找到 ID 208 或 226
    const found208 = data.find(r => r.id === 208);
    const found226 = data.find(r => r.id === 226);
    
    console.log(`找到 ${data.length} 个结果`);
    console.log(`ID 208: ${found208 ? found208.similarity.toFixed(4) : '未找到'}`);
    console.log(`ID 226: ${found226 ? found226.similarity.toFixed(4) : '未找到'}`);
  }
}

verifyMismatch();
