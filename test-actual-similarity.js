require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

async function testSimilarity() {
  // 你的原始问题
  const yourQuery = "why radio technologist need climb the tower?";
  
  console.log(`你的问题: "${yourQuery}"\n`);
  
  // 生成向量
  const vec = await hf.featureExtraction({
    model: 'BAAI/bge-base-en-v1.5',
    inputs: yourQuery
  });
  const finalVec = Array.isArray(vec[0]) ? vec[0] : vec;
  
  // 获取那3个包含答案的片段
  const targetIds = [208, 226, 217];
  
  const { data } = await supabase
    .from('knowledge_vectors')
    .select('id, content, embedding')
    .in('id', targetIds);
  
  console.log('与包含答案的片段的相似度:\n');
  
  for (const chunk of data) {
    // 计算余弦相似度
    const embedding = chunk.embedding;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < finalVec.length; i++) {
      dotProduct += finalVec[i] * embedding[i];
      normA += finalVec[i] * finalVec[i];
      normB += embedding[i] * embedding[i];
    }
    
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    
    console.log(`ID ${chunk.id}: 相似度 ${similarity.toFixed(4)}`);
    console.log(`内容: ${chunk.content.substring(0, 100)}...`);
    console.log();
  }
  
  console.log('\n现在测试改进的问题:\n');
  
  const betterQueries = [
    "tower climbing requirements",
    "why climb towers",
    "tower maintenance job duties"
  ];
  
  for (const query of betterQueries) {
    const vec2 = await hf.featureExtraction({
      model: 'BAAI/bge-base-en-v1.5',
      inputs: query
    });
    const finalVec2 = Array.isArray(vec2[0]) ? vec2[0] : vec2;
    
    // 只计算 ID 226 的相似度（最直接的答案）
    const chunk226 = data.find(c => c.id === 226);
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < finalVec2.length; i++) {
      dotProduct += finalVec2[i] * chunk226.embedding[i];
      normA += finalVec2[i] * finalVec2[i];
      normB += chunk226.embedding[i] * chunk226.embedding[i];
    }
    
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    
    console.log(`"${query}": ${similarity.toFixed(4)}`);
  }
}

testSimilarity();
