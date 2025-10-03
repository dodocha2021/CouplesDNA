require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

async function verifyFilter() {
  const query = "why radio technologist need climb the tower?";
  const fileId = 'c9100e27-0e30-4372-b481-19880756bf88';
  
  const vec = await hf.featureExtraction({
    model: 'BAAI/bge-base-en-v1.5',
    inputs: query
  });
  const finalVec = Array.isArray(vec[0]) ? vec[0] : vec;
  const vectorString = `[${finalVec.join(',')}]`;
  
  console.log('测试1: 无 file_id 过滤\n');
  const { data: noFilter } = await supabase.rpc('match_knowledge', {
    query_embedding: vectorString,
    match_threshold: 0.15,
    match_count: 10
  });
  
  console.log(`找到 ${noFilter.length} 个结果`);
  console.log(`ID 208 存在: ${noFilter.some(r => r.id === 208)}`);
  console.log(`ID 226 存在: ${noFilter.some(r => r.id === 226)}`);
  
  console.log('\n测试2: 加上 file_id 过滤\n');
  const { data: withFilter, error } = await supabase
    .rpc('match_knowledge', {
      query_embedding: vectorString,
      match_threshold: 0.15,
      match_count: 10
    })
    .contains('metadata', { file_id: fileId });
  
  if (error) {
    console.error('错误:', error);
  } else {
    console.log(`找到 ${withFilter.length} 个结果`);
    console.log(`ID 208 存在: ${withFilter.length > 0 && withFilter.some(r => r.id === 208)}`);
    console.log(`ID 226 存在: ${withFilter.length > 0 && withFilter.some(r => r.id === 226)}`);
  }
  
  // 检查 ID 208 和 226 的 metadata
  console.log('\n检查 ID 208 和 226 的 metadata:\n');
  const { data: records } = await supabase
    .from('knowledge_vectors')
    .select('id, metadata')
    .in('id', [208, 226]);
  
  records.forEach(r => {
    console.log(`ID ${r.id}:`);
    console.log(JSON.stringify(r.metadata, null, 2));
    console.log();
  });
}

verifyFilter();
