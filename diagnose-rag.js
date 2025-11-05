
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function diagnose() {
  console.log('=== RAG 诊断脚本 ===\n');

  // 1. 检查表中是否有数据
  console.log('1. 从 `knowledge_vectors` 表中获取一条记录...');
  const { data: sample, error: sampleError } = await supabase
    .from('knowledge_vectors')
    .select('id, content, embedding')
    .limit(1);

  if (sampleError) {
    console.error('❌ 获取数据失败:', sampleError.message);
    return;
  }

  if (!sample || sample.length === 0) {
    console.error('❌ 错误: `knowledge_vectors` 表为空！');
    console.log('   请先运行 `node ingest-fixed.js` 脚本来填充数据。');
    return;
  }

  const firstRecord = sample[0];
  console.log('✅ 成功获取一条记录:');
  console.log(`  - ID: ${firstRecord.id}`);
  console.log(`  - 内容: "${firstRecord.content.substring(0, 50)}..."`);
  
  // 2. 检查向量格式
  console.log('\n2. 检查向量 (embedding) 的格式...');
  const embedding = firstRecord.embedding;
  const embeddingType = typeof embedding;
  console.log(`  - 向量的数据类型: ${embeddingType}`);

  let vectorString;
  if (embeddingType === 'string' && embedding.startsWith('[')) {
    console.log('  - 格式看起来是 pgvector 的字符串格式 (e.g., "[0.1,0.2,...]")。');
    vectorString = embedding;
  } else if (Array.isArray(embedding)) {
    console.log('  - 格式是数组。正在转换为字符串...');
    vectorString = `[${embedding.join(',')}]`;
  } else {
    console.error(`❌ 错误: 未知的向量格式。类型: ${embeddingType}`);
    console.log('   向量应该是字符串或数组。');
    return;
  }
  console.log('✅ 向量格式检查通过。');


  // 3. 使用记录自身的向量进行搜索 (应该返回相似度为 1)
  console.log('\n3. 使用自身的向量测试 `match_knowledge` 函数...');
  console.log('   (期望找到至少一个结果，相似度为 1.0)');

  const { data: selfMatch, error: selfMatchError } = await supabase.rpc('match_knowledge', {
    query_embedding: vectorString, // 使用从数据库中获取的向量
    match_threshold: 0.95,        // 阈值设得很高，因为我们期望完美的匹配
    match_count: 5
  });

  if (selfMatchError) {
    console.error('❌ RPC 调用失败:', selfMatchError.message);
    return;
  }

  if (!selfMatch || selfMatch.length === 0) {
    console.error('❌ 严重错误: 未能匹配到记录自身！');
    console.log('   这表明 `match_knowledge` 函数或数据索引存在问题。');
    console.log('   请检查您的 pgvector 索引和 `match_knowledge` 函数的 SQL 代码。');
    return;
  }

  console.log('✅ 成功找到匹配项:');
  selfMatch.forEach((r, i) => {
    console.log(`  [${i + 1}] ID: ${r.id}, 相似度: ${r.similarity.toFixed(4)}`);
    if(r.id === firstRecord.id) {
        console.log("      (这是原始记录，匹配成功！)");
    }
  });

  console.log('\n=== 诊断完成 ===');
  if (selfMatch.some(r => r.id === firstRecord.id && r.similarity > 0.99)) {
      console.log('✅ 核心 RAG 功能看起来是正常的！');
      console.log('   `test-rag-working.js` 没有结果的问题可能是因为查询的 "沟通技巧" 与数据库中的内容确实不相似。');
      console.log('   尝试使用更相关的查询词，或者降低 `match_threshold`。');
  } else {
      console.log(' Dagnosis failed, please check the previous steps.');
  }

}

diagnose().catch(console.error);
