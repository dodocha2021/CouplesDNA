require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

async function checkVectorColumn() {
  // 生成测试向量
  const testVector = await hf.featureExtraction({
    model: 'sentence-transformers/all-mpnet-base-v2',
    inputs: 'test',
  });
  
  const embedding = Array.isArray(testVector[0]) ? testVector[0] : testVector;
  console.log(`生成的向量维度: ${embedding.length}`);
  console.log(`向量前5个值: [${embedding.slice(0, 5).join(', ')}]`);
  
  // 尝试插入
  const { data, error } = await supabase
    .from('knowledge_vectors')
    .insert({ content: 'test', embedding })
    .select();
  
  if (error) {
    console.log('插入失败:', error);
  } else {
    console.log('插入成功');
    console.log(`返回的向量维度: ${data[0].embedding.length}`);
    console.log(`返回的前5个值: [${data[0].embedding.slice(0, 5).join(', ')}]`);
    
    // 清理测试数据
    await supabase.from('knowledge_vectors').delete().eq('content', 'test');
  }
}

checkVectorColumn();
