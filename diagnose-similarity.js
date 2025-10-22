require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
const MODEL = 'sentence-transformers/all-mpnet-base-v2';

function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function diagnose() {
  console.log('=== 详细诊断 ===\n');

  // 1. 读取数据库
  const { data: records } = await supabase
    .from('knowledge_vectors')
    .select('*');
  
  console.log(`数据库记录数: ${records.length}`);
  if (records.length === 0) return;

  const firstRecord = records[0];
  console.log(`\n第一条记录:`);
  console.log(`  ID: ${firstRecord.id}`);
  console.log(`  内容: ${firstRecord.content.substring(0, 80)}`);
  console.log(`  向量维度: ${firstRecord.embedding.length}`);
  console.log(`  向量类型: ${typeof firstRecord.embedding}`);
  console.log(`  向量前3个值: [${firstRecord.embedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}]`);

  // 2. 生成查询向量
  console.log(`\n生成查询向量...`);
  const queryText = '沟通';
  const queryVec = await hf.featureExtraction({
    model: MODEL,
    inputs: queryText
  });
  const finalQueryVec = Array.isArray(queryVec[0]) ? queryVec[0] : queryVec;
  
  console.log(`  查询: "${queryText}"`);
  console.log(`  向量维度: ${finalQueryVec.length}`);
  console.log(`  向量前3个值: [${finalQueryVec.slice(0, 3).map(v => v.toFixed(4)).join(', ')}]`);

  // 3. 手动计算相似度
  console.log(`\n手动计算相似度:`);
  const similarity = cosineSimilarity(finalQueryVec, firstRecord.embedding);
  console.log(`  余弦相似度: ${similarity.toFixed(6)}`);
  console.log(`  这个值应该在 0.0 - 1.0 之间`);

  // 4. 测试不同查询
  console.log(`\n测试不同查询的相似度:`);
  const queries = [
    '沟通',
    '非暴力沟通',
    '观察感受需要请求',
    firstRecord.content.substring(0, 50)
  ];

  for (const q of queries) {
    const qVec = await hf.featureExtraction({ model: MODEL, inputs: q });
    const qFinal = Array.isArray(qVec[0]) ? qVec[0] : qVec;
    const sim = cosineSimilarity(qFinal, firstRecord.embedding);
    console.log(`  "${q.substring(0, 30).padEnd(30)}" -> ${sim.toFixed(4)}`);
  }

  // 5. 测试 RPC 不同阈值
  console.log(`\n测试 RPC 函数 (不同阈值):`);
  const thresholds = [0.0, 0.1, 0.2, 0.3, 0.5];
  
  for (const threshold of thresholds) {
    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: finalQueryVec,
      match_threshold: threshold,
      match_count: 5
    });
    
    const status = error ? `❌ ${error.message}` : `✅ ${data.length} 个结果`;
    console.log(`  阈值 ${threshold.toFixed(1)}: ${status}`);
    
    if (data && data.length > 0) {
      console.log(`    最高相似度: ${data[0].similarity.toFixed(4)}`);
    }
  }

  // 6. 检查数据库向量是否有效
  console.log(`\n检查向量数据有效性:`);
  const hasNaN = firstRecord.embedding.some(v => isNaN(v));
  const hasInfinity = firstRecord.embedding.some(v => !isFinite(v));
  const allZeros = firstRecord.embedding.every(v => v === 0);
  
  console.log(`  包含 NaN: ${hasNaN ? '是 ❌' : '否 ✅'}`);
  console.log(`  包含 Infinity: ${hasInfinity ? '是 ❌' : '否 ✅'}`);
  console.log(`  全是 0: ${allZeros ? '是 ❌' : '否 ✅'}`);
  
  // 7. 计算向量的模
  const norm = Math.sqrt(firstRecord.embedding.reduce((sum, v) => sum + v*v, 0));
  console.log(`  向量的模: ${norm.toFixed(4)} (应该接近 1.0)`);
}

diagnose().catch(console.error);
