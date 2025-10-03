require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkNormalization() {
  const { data } = await supabase
    .from('knowledge_vectors')
    .select('id, embedding')
    .in('id', [208, 226, 776, 828])  // 包含有问题的和"正常"的
    .limit(10);
  
  data.forEach(record => {
    let emb = JSON.parse(record.embedding);
    
    // 计算向量的模（长度）
    const norm = Math.sqrt(emb.reduce((sum, v) => sum + v * v, 0));
    
    // 检查是否归一化（模应该接近 1.0）
    console.log(`ID ${record.id}: 模 = ${norm.toFixed(6)} ${Math.abs(norm - 1.0) < 0.01 ? '✅ 已归一化' : '❌ 未归一化'}`);
    
    // 检查值的范围
    const max = Math.max(...emb);
    const min = Math.min(...emb);
    console.log(`  范围: [${min.toFixed(4)}, ${max.toFixed(4)}]`);
  });
}

checkNormalization();
