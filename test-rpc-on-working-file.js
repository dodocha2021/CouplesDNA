require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

async function testOnWorkingFile() {
  // 用一个能找到结果的查询词
  const query = "radio frequency channel";
  
  const vec = await hf.featureExtraction({
    model: 'BAAI/bge-base-en-v1.5',
    inputs: query
  });
  const finalVec = Array.isArray(vec[0]) ? vec[0] : vec;
  
  console.log(`查询: "${query}"\n`);
  
  // 1. 手动计算 - 只看文件 95298b7e（之前能找到结果的）
  const { data: chunks } = await supabase
    .from('knowledge_vectors')
    .select('id, content, embedding')
    .contains('metadata', { file_id: '95298b7e-8a70-4d1f-bd4c-817d7adde991' })
    .limit(100);
  
  console.log(`文件 95298b7e 总共 ${chunks.length} 个片段\n`);
  
  const manual = chunks.map(chunk => {
    let embedding = JSON.parse(chunk.embedding);
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < finalVec.length; i++) {
      dotProduct += finalVec[i] * embedding[i];
      normA += finalVec[i] * finalVec[i];
      normB += embedding[i] * embedding[i];
    }
    
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return { id: chunk.id, similarity, content: chunk.content.substring(0, 50) };
  });
  
  manual.sort((a, b) => b.similarity - a.similarity);
  
  console.log('手动计算 - 前5个:');
  manual.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i+1}. [${r.similarity.toFixed(4)}] ID:${r.id}`);
  });
  
  // 2. RPC 查询
  const { data: rpcData } = await supabase.rpc('match_knowledge', {
    query_embedding: finalVec,
    match_threshold: 0.3,
    match_count: 20
  });
  
  console.log(`\nRPC 返回 ${rpcData?.length || 0} 个结果 - 前5个:`);
  rpcData?.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i+1}. [${r.similarity.toFixed(4)}] ID:${r.id}`);
  });
  
  // 3. 对比
  const manualTop5Ids = manual.slice(0, 5).map(r => r.id);
  const rpcTop5Ids = rpcData?.slice(0, 5).map(r => r.id) || [];
  
  const match = manualTop5Ids.filter(id => rpcTop5Ids.includes(id)).length;
  
  console.log(`\n对比: 前5名中有 ${match} 个ID相同`);
  
  if (match >= 3) {
    console.log('✅ RPC 在这个文件上工作正常');
  } else {
    console.log('❌ RPC 在这个文件上也有问题');
  }
}

testOnWorkingFile();
