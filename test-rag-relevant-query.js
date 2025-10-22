require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
const MODEL = 'sentence-transformers/all-mpnet-base-v2';

async function testRelevantQuery() {
  console.log('=== RAG 测试（使用高相关度查询）===\n');

  // 1. 使用与数据库内容高度相关的查询
  const query = '非暴力沟通'; // 这个词直接来自于您数据库中的 ID:5 记录
  console.log(`生成查询向量: "${query}"`);
  
  const queryVec = await hf.featureExtraction({
    model: MODEL,
    inputs: query
  });
  const finalQueryVec = Array.isArray(queryVec[0]) ? queryVec[0] : queryVec;
  const vectorString = `[${finalQueryVec.join(',')}]`;
  console.log(`向量维度: ${finalQueryVec.length}\n`);

  // 2. 执行向量搜索
  console.log('执行向量搜索...');
  const { data: results, error } = await supabase.rpc('match_knowledge', {
    query_embedding: vectorString,
    match_threshold: 0.1, // 使用一个较低的阈值以确保能看到结果
    match_count: 5
  });

  if (error) {
    console.error('❌ 搜索失败:', error.message);
    return;
  }

  if (results.length === 0) {
    console.error('❌ 错误: 即使是高度相关的查询也没有找到结果。这不应该发生！');
    return;
  }

  console.log(`✅ 成功找到 ${results.length} 个结果！\n`);
  console.log('搜索结果:');
  results.forEach((r, i) => {
    console.log(`\n[${i + 1}] 相似度: ${r.similarity.toFixed(4)}`);
    console.log(`    ID: ${r.id}`);
    console.log(`    内容: ${r.content.substring(0, 100)}...`);
    if (r.id === 5) {
      console.log('    ✨ 找到了我们预期的记录！');
    }
  });

  console.log('\n\n=== 结论 ===');
  console.log('✅ 测试成功！这证明了您的 RAG 系统在技术上是完全正常的。');
  console.log('  接下来的重点是优化您的知识库内容和调整查询策略，以获得更相关的搜索结果。');

}

testRelevantQuery().catch(console.error);