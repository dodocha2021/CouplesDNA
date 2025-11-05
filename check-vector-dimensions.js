require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDimensions() {
  // 检查所有向量的维度
  const { data } = await supabase
    .from('knowledge_vectors')
    .select('id, embedding')
    .limit(1000);
  
  const dimensions = {};
  
  data.forEach(record => {
    let emb = record.embedding;
    if (typeof emb === 'string') {
      emb = JSON.parse(emb);
    }
    const dim = emb.length;
    
    if (!dimensions[dim]) {
      dimensions[dim] = [];
    }
    dimensions[dim].push(record.id);
  });
  
  console.log('向量维度分布:\n');
  Object.entries(dimensions).forEach(([dim, ids]) => {
    console.log(`${dim} 维: ${ids.length} 个记录`);
    if (dim !== '768') {
      console.log(`  ⚠️ 异常维度！ID 示例: ${ids.slice(0, 3).join(', ')}`);
    }
  });
  
  // 特别检查 ID 208 和 226
  const id208 = data.find(r => r.id === 208);
  const id226 = data.find(r => r.id === 226);
  
  if (id208) {
    const emb208 = typeof id208.embedding === 'string' ? JSON.parse(id208.embedding) : id208.embedding;
    console.log(`\nID 208 维度: ${emb208.length}`);
  }
  
  if (id226) {
    const emb226 = typeof id226.embedding === 'string' ? JSON.parse(id226.embedding) : id226.embedding;
    console.log(`ID 226 维度: ${emb226.length}`);
  }
}

checkDimensions();
