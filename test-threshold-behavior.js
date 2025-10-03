require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

async function testThresholds() {
  const query = "why radio technologist need climb the tower?";
  
  const vec = await hf.featureExtraction({
    model: 'BAAI/bge-base-en-v1.5',
    inputs: query
  });
  const finalVec = Array.isArray(vec[0]) ? vec[0] : vec;
  const vectorString = `[${finalVec.join(',')}]`;
  
  const thresholds = [0.0, 0.15, 0.3, 0.5, 0.65, 0.7];
  
  for (const threshold of thresholds) {
    const { data } = await supabase.rpc('match_knowledge', {
      query_embedding: vectorString,
      match_threshold: threshold,
      match_count: 20
    });
    
    const has208 = data.some(r => r.id === 208);
    const has226 = data.some(r => r.id === 226);
    
    console.log(`阈值 ${threshold.toFixed(2)}: ${data.length} 个结果, ID 208: ${has208}, ID 226: ${has226}`);
    
    if (data.length > 0 && (has208 || has226)) {
      const found = data.filter(r => r.id === 208 || r.id === 226);
      found.forEach(r => {
        console.log(`  -> ID ${r.id}: 相似度 ${r.similarity.toFixed(4)}`);
      });
    }
  }
}

testThresholds();
