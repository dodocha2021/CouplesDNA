require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

async function debugContains() {
  const query = "tower";
  
  const vec = await hf.featureExtraction({
    model: 'BAAI/bge-base-en-v1.5',
    inputs: query
  });
  const finalVec = Array.isArray(vec[0]) ? vec[0] : vec;
  const vectorString = `[${finalVec.join(',')}]`;
  
  console.log('测试1: 搜索 95298b7e（能找到的）\n');
  
  const { data: test1 } = await supabase
    .rpc('match_knowledge', {
      query_embedding: vectorString,
      match_threshold: 0.3,
      match_count: 20
    })
    .contains('metadata', { file_id: '95298b7e-8a70-4d1f-bd4c-817d7adde991' });
  
  console.log(`结果: ${test1?.length || 0} 个\n`);
  
  console.log('测试2: 搜索 c9100e27（找不到的）\n');
  
  const { data: test2, error: error2 } = await supabase
    .rpc('match_knowledge', {
      query_embedding: vectorString,
      match_threshold: 0.3,
      match_count: 20
    })
    .contains('metadata', { file_id: 'c9100e27-0e30-4372-b481-19880756bf88' });
  
  console.log(`结果: ${test2?.length || 0} 个`);
  if (error2) console.log('错误:', error2);
  
  console.log('\n测试3: 不用 contains，直接搜索，看看返回什么\n');
  
  const { data: test3 } = await supabase.rpc('match_knowledge', {
    query_embedding: vectorString,
    match_threshold: 0.3,
    match_count: 20
  });
  
  console.log(`总共: ${test3?.length || 0} 个结果`);
  
  // 统计每个 file_id 的数量
  const byFile = {};
  test3.forEach(r => {
    const fid = r.metadata?.file_id?.substring(0, 8) || 'unknown';
    byFile[fid] = (byFile[fid] || 0) + 1;
  });
  
  console.log('\n按文件分组:');
  Object.entries(byFile).forEach(([fid, count]) => {
    console.log(`  ${fid}: ${count} 个`);
  });
}

debugContains();
