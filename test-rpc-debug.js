require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
const MODEL = 'sentence-transformers/all-mpnet-base-v2';

async function debugRPC() {
  console.log('=== RPC 调试 ===\n');

  // 1. 获取数据库中的向量
  console.log('步骤 1: 从数据库读取向量');
  const { data: records } = await supabase
    .from('knowledge_vectors')
    .select('id, embedding')
    .limit(1);
  
  const dbVector = records[0].embedding;
  console.log(`数据库向量格式: ${dbVector.substring(0, 60)}...`);
  console.log(`数据库向量类型: ${typeof dbVector}\n`);

  // 2. 用数据库向量调用 RPC（应该返回相似度 1.0）
  console.log('步骤 2: 用数据库向量调用 RPC');
  const { data: r1, error: e1 } = await supabase.rpc('match_knowledge', {
    query_embedding: dbVector,
    match_threshold: 0.0,
    match_count: 3
  });

  console.log(`结果: ${e1 ? '❌' : '✅'}`);
  if (e1) {
    console.log(`错误消息: ${e1.message}`);
    console.log(`错误详情:`, e1);
  } else {
    console.log(`返回记录数: ${r1.length}`);
    if (r1.length > 0) {
      console.log(`第一条相似度: ${r1[0].similarity}`);
    }
  }

  console.log('\n步骤 3: 生成新查询向量');
  const vec = await hf.featureExtraction({ model: MODEL, inputs: '沟通' });
  const finalVec = Array.isArray(vec[0]) ? vec[0] : vec;
  const vecString = `[${finalVec.join(',')}]`;
  
  console.log(`查询向量格式: ${vecString.substring(0, 60)}...`);
  console.log(`查询向量类型: ${typeof vecString}\n`);

  // 4. 用新向量调用 RPC
  console.log('步骤 4: 用新向量调用 RPC');
  const { data: r2, error: e2 } = await supabase.rpc('match_knowledge', {
    query_embedding: vecString,
    match_threshold: 0.0,
    match_count: 3
  });

  console.log(`结果: ${e2 ? '❌' : '✅'}`);
  if (e2) {
    console.log(`错误消息: ${e2.message}`);
    console.log(`错误详情:`, e2);
  } else {
    console.log(`返回记录数: ${r2.length}`);
    if (r2.length > 0) {
      r2.forEach((r, i) => {
        console.log(`  [${i+1}] ID: ${r.id}, 相似度: ${r.similarity.toFixed(4)}`);
      });
    }
  }

  console.log('\n=== 诊断结论 ===');
  if (!e1 && r1.length > 0) {
    console.log('✅ 用数据库向量成功');
  }
  if (!e2 && r2.length > 0) {
    console.log('✅ 用新生成向量成功');
  }
  if (e1 || e2 || (r1.length === 0 && r2.length === 0)) {
    console.log('❌ RPC 调用有问题');
    console.log('\n可能的原因:');
    console.log('1. match_knowledge 函数参数类型不匹配');
    console.log('2. 向量维度不对');
    console.log('3. 权限问题');
  }
}

debugRPC().catch(console.error);
