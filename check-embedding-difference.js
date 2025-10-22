require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDifference() {
  // 检查能找到的文件（95298b7e）
  const { data: working } = await supabase
    .from('knowledge_vectors')
    .select('id, embedding, created_at, source')
    .contains('metadata', { file_id: '95298b7e-8a70-4d1f-bd4c-817d7adde991' })
    .limit(1);
  
  // 检查找不到的文件（c9100e27）
  const { data: notWorking } = await supabase
    .from('knowledge_vectors')
    .select('id, embedding, created_at, source')
    .contains('metadata', { file_id: 'c9100e27-0e30-4372-b481-19880756bf88' })
    .limit(1);
  
  console.log('能找到的文件 (95298b7e):');
  console.log('  ID:', working[0].id);
  console.log('  创建时间:', working[0].created_at);
  console.log('  Source:', working[0].source);
  console.log('  Embedding 类型:', typeof working[0].embedding);
  console.log('  Embedding 前50字符:', working[0].embedding.toString().substring(0, 50));
  
  console.log('\n找不到的文件 (c9100e27):');
  console.log('  ID:', notWorking[0].id);
  console.log('  创建时间:', notWorking[0].created_at);
  console.log('  Source:', notWorking[0].source);
  console.log('  Embedding 类型:', typeof notWorking[0].embedding);
  console.log('  Embedding 前50字符:', notWorking[0].embedding.toString().substring(0, 50));
  
  // 比较是否有格式差异
  const workingIsString = typeof working[0].embedding === 'string';
  const notWorkingIsString = typeof notWorking[0].embedding === 'string';
  
  console.log('\n格式对比:');
  console.log('  95298b7e 是字符串?', workingIsString);
  console.log('  c9100e27 是字符串?', notWorkingIsString);
}

checkDifference();
