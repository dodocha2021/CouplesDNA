require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkRLS() {
  // 直接查询，看能否访问 ID 208 和 226
  const { data, error } = await supabase
    .from('knowledge_vectors')
    .select('id')
    .in('id', [208, 226, 776, 828]);  // 包含能找到的和找不到的
  
  console.log('直接查询结果:');
  console.log(`找到 ${data?.length || 0} 条记录`);
  
  if (data) {
    data.forEach(r => console.log(`  ID: ${r.id}`));
  }
  
  if (error) {
    console.log('错误:', error);
  }
}

checkRLS();
