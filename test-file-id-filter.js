require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

async function testFileIdFilter() {
  console.log('=== 测试 file_id 过滤 ===\n');

  // 使用你的实际 file_id
  const testFileId = '11c5b76b-f2b7-49cf-b930-1107bccfc922';
  
  console.log(`测试 file_id: ${testFileId}\n`);

  // 生成查询向量
  const query = 'electrical engineering degree';
  const queryVec = await hf.featureExtraction({
    model: 'BAAI/bge-base-en-v1.5',
    inputs: query
  });
  const finalQueryVec = Array.isArray(queryVec[0]) ? queryVec[0] : queryVec;
  const vectorString = `[${finalQueryVec.join(',')}]`;

  // 使用 file_id 过滤搜索
  const { data: results, error } = await supabase
    .rpc('match_knowledge', {
      query_embedding: vectorString,
      match_threshold: 0.3,
      match_count: 5
    })
    .contains('metadata', { file_id: testFileId });

  if (error) {
    console.error('❌ 搜索失败:', error);
    return;
  }

  console.log(`✅ 找到 ${results.length} 个结果\n`);
  
  results.forEach((r, i) => {
    console.log(`[${i + 1}] 相似度: ${r.similarity.toFixed(4)}`);
    console.log(`    file_id: ${r.metadata?.file_id}`);
    console.log(`    Content: ${r.content.substring(0, 80)}...`);
    console.log();
  });
  
  // 验证所有结果都来自指定的 file_id
  const allFromSameFile = results.every(r => r.metadata?.file_id === testFileId);
  console.log(`\n验证: 所有结果都来自同一个文件? ${allFromSameFile ? '✅ 是' : '❌ 否'}`);
}

testFileIdFilter().catch(console.error);
