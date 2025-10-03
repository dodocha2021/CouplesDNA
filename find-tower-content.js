require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findTower() {
  const fileId = 'c9100e27-0e30-4372-b481-19880756bf88';
  
  // 获取所有记录
  const { data } = await supabase
    .from('knowledge_vectors')
    .select('id, content')
    .contains('metadata', { file_id: fileId });
  
  console.log(`总共 ${data.length} 条记录\n`);
  
  // 搜索包含 "tower" 或 "climb" 的片段
  const relevant = data.filter(chunk => 
    chunk.content.toLowerCase().includes('tower') || 
    chunk.content.toLowerCase().includes('climb')
  );
  
  console.log(`包含 "tower" 或 "climb" 的片段: ${relevant.length} 条\n`);
  
  relevant.forEach((chunk, i) => {
    console.log(`[${i+1}] ID: ${chunk.id}`);
    console.log(chunk.content);
    console.log('\n---\n');
  });
}

findTower();
