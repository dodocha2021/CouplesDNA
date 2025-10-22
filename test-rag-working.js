require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
const MODEL = 'BAAI/bge-base-en-v1.5';

async function testRAG() {
  console.log('=== RAG 测试（使用原始 SQL）===\n');

  // 1. 生成查询向量
  console.log('生成查询向量...');
  const query = '沟通技巧';
  const queryVec = await hf.featureExtraction({
    model: MODEL,
    inputs: query
  });
  const finalQueryVec = Array.isArray(queryVec[0]) ? queryVec[0] : queryVec;
  
  console.log(`查询: "${query}"`);
  console.log(`向量维度: ${finalQueryVec.length}\n`);

  // 2. 将向量转换为 pgvector 格式
  const vectorString = `[${finalQueryVec.join(',')}]`;

  // 3. 使用 RPC 函数进行搜索
  console.log('执行向量搜索...');
  const { data: results, error } = await supabase.rpc('match_knowledge', {
    query_embedding: vectorString,
    match_threshold: 0.3,
    match_count: 5
  });

  if (error) {
    console.error('❌ 搜索失败:', error.message);
    console.log('\n提示: 确保 match_knowledge 函数接受 TEXT 类型的参数\n');
    return;
  }

  console.log(`✅ 找到 ${results.length} 个结果\n`);

  if (results.length > 0) {
    console.log('搜索结果:');
    results.forEach((r, i) => {
      console.log(`\n[${i + 1}] 相似度: ${r.similarity.toFixed(4)}`);
      console.log(`    ID: ${r.id}`);
      console.log(`    内容: ${r.content.substring(0, 100)}...`);
    });
  } else {
    console.log('⚠️  没有找到结果，可能需要降低阈值');
  }

  // 4. 测试不同阈值
  console.log('\n\n=== 测试不同阈值 ===');
  const thresholds = [0.0, 0.1, 0.2, 0.3, 0.5];
  
  for (const threshold of thresholds) {
    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: vectorString,
      match_threshold: threshold,
      match_count: 3
    });
    
    if (error) {
      console.log(`阈值 ${threshold}: ❌ ${error.message}`);
    } else {
      const maxSim = data.length > 0 ? data[0].similarity.toFixed(4) : 'N/A';
      console.log(`阈值 ${threshold}: ${data.length} 个结果 (最高: ${maxSim})`);
    }
  }
}

testRAG().catch(console.error);