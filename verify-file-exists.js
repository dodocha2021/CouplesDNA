require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verify() {
  const fileId = 'c9100e27-0e30-4372-b481-19880756bf88';
  
  // 检查这个 file_id 在数据库中有多少条记录
  const { data, count } = await supabase
    .from('knowledge_vectors')
    .select('*', { count: 'exact' })
    .contains('metadata', { file_id: fileId });
  
  console.log(`文件 c9100e27 在数据库中的记录数: ${count}`);
  
  if (count > 0) {
    console.log(`\n前3条内容预览:`);
    data.slice(0, 3).forEach((chunk, i) => {
      console.log(`\n[${i+1}] ${chunk.content.substring(0, 200)}...`);
    });
  } else {
    console.log('\n❌ 这个文件没有被索引！');
  }
}

verify();
