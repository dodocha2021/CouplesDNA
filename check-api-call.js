require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

async function checkAPICall() {
  const query = "why radio technologist need climb the tower?";
  
  const vec = await hf.featureExtraction({
    model: 'BAAI/bge-base-en-v1.5',
    inputs: query
  });
  const finalVec = Array.isArray(vec[0]) ? vec[0] : vec;
  
  // 测试1: 传数组
  console.log('测试1: 传数组给 RPC');
  const { data: test1, error: error1 } = await supabase.rpc('match_knowledge', {
    query_embedding: finalVec,
    match_threshold: 0.3,
    match_count: 20
  });
  
  console.log(`结果: ${test1?.length || 0} 个`);
  if (error1) console.log('错误:', error1.message);
  
  // 测试2: 传字符串
  console.log('\n测试2: 传字符串给 RPC');
  const { data: test2, error: error2 } = await supabase.rpc('match_knowledge', {
    query_embedding: `[${finalVec.join(',')}]`,
    match_threshold: 0.3,
    match_count: 20
  });
  
  console.log(`结果: ${test2?.length || 0} 个`);
  if (error2) console.log('错误:', error2.message);
  
  // 对比结果
  if (test1 && test2) {
    const has208_1 = test1.some(r => r.id === 208);
    const has208_2 = test2.some(r => r.id === 208);
    
    console.log(`\n测试1 找到 ID 208: ${has208_1}`);
    console.log(`测试2 找到 ID 208: ${has208_2}`);
  }
}

checkAPICall();
