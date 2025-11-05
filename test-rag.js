require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
const MODEL = 'sentence-transformers/all-mpnet-base-v2';

async function getEmbedding(text) {
  const response = await hf.featureExtraction({
    model: MODEL,
    inputs: text.replace(/\n/g, ' '),
  });
  return Array.isArray(response[0]) ? response[0] : response;
}

async function runTests() {
  console.log('=== RAG 诊断测试 ===\n');

  // 测试1: 检查向量维度
  console.log('测试1: 检查嵌入维度');
  const testEmbedding = await getEmbedding('test');
  console.log(`✓ 模型生成的向量维度: ${testEmbedding.length}`);

  // 测试2: 检查数据库中的向量数量和维度
  console.log('\n测试2: 检查数据库');
  const { data: allVectors, count } = await supabase
    .from('knowledge_vectors')
    .select('id, embedding', { count: 'exact' })
    .limit(1);
  
  console.log(`✓ 数据库中的向量总数: ${count}`);
  if (allVectors && allVectors.length > 0) {
    const dbVector = allVectors[0].embedding;
    console.log(`✓ 数据库中向量的维度: ${dbVector.length || '无法确定'}`);
    console.log(`✓ 第一个向量ID: ${allVectors[0].id}`);
  }

  // 测试3: 测试向量搜索
  console.log('\n测试3: 测试向量搜索');
  const queryEmbedding = await getEmbedding('how much for the room');
  console.log(`✓ 查询向量维度: ${queryEmbedding.length}`);

  const { data: searchResults, error } = await supabase.rpc('match_knowledge', {
    query_embedding: queryEmbedding,
    match_threshold: 0.3, // 降低阈值
    match_count: 5,
  });

  if (error) {
    console.log(`✗ 搜索失败: ${error.message}`);
  } else {
    console.log(`✓ 搜索成功，找到 ${searchResults.length} 个结果`);
    if (searchResults.length > 0) {
      searchResults.forEach((r, i) => {
        console.log(`  ${i+1}. 相似度: ${r.similarity.toFixed(4)} | ${r.content.substring(0, 50)}...`);
      });
    }
  }

  // 测试4: 检查match_knowledge函数
  console.log('\n测试4: 检查数据库函数');
  try {
    const { data, error } = await supabase.rpc('pg_get_functiondef', {
      funcid: 'match_knowledge'
    });
    if (error) throw error;
    console.log(data ? '✓ match_knowledge 函数存在' : '✗ match_knowledge 函数不存在或无法查询');
  } catch (err) {
    console.log(`✗ 检查函数时出错: ${err.message}`);
  }
}

runTests().catch(console.error);
