require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
const MODEL = 'sentence-transformers/all-mpnet-base-v2';

async function finalDiagnostic() {
  console.log('=== RAG 端到端终极诊断 ===\n');

  // 1. 获取一个已知记录
  console.log('1. 获取 ID=5 的记录...');
  const { data: records, error: fetchError } = await supabase
    .from('knowledge_vectors')
    .select('id, content')
    .eq('id', 5)
    .limit(1);

  if (fetchError || !records || records.length === 0) {
    console.error('❌ 无法获取 ID=5 的记录:', fetchError?.message || '未找到记录');
    return;
  }

  const record = records[0];
  const originalContent = record.content;
  console.log(`✅ 成功获取记录，内容: "${originalContent.substring(0, 60)}..."\n`);

  // 2. 为该记录的内容重新生成向量
  console.log('2. 实时为该内容生成新向量...');
  
  let newVector;
  try {
    const response = await hf.featureExtraction({
      model: MODEL,
      inputs: originalContent.replace(/\n/g, ' ') // 确保与 ingest 脚本中的预处理相同
    });
    newVector = Array.isArray(response[0]) ? response[0] : response;
    console.log(`✅ 新向量已生成，维度: ${newVector.length}\n`);
  } catch (e) {
    console.error('❌ 向量生成失败:', e.message);
    return;
  }
  
  const vectorString = `[${newVector.join(',')}]`;

  // 3. 使用新生成的向量进行搜索
  console.log('3. 使用新向量搜索数据库 (期望匹配 ID=5)...');
  const { data: results, error: rpcError } = await supabase.rpc('match_knowledge', {
    query_embedding: vectorString,
    match_threshold: 0.1, // 低阈值以捕获任何匹配
    match_count: 5
  });

  if (rpcError) {
    console.error('❌ 搜索失败:', rpcError.message);
    return;
  }

  if (results.length === 0) {
    console.error('❌ 诊断失败！即使是完全相同的内容，新生成的向量也无法匹配旧向量。');
    console.log('   这证实了向量生成过程存在不一致性。');
    console.log('   可能原因：Hugging Face 模型后端有微小更新或非确定性行为。');
    console.log('   解决方案：必须重新运行完整的 ingest 脚本 (`node ingest-fixed.js`) 来同步所有向量。');
    return;
  }

  console.log(`✅ 搜索成功！找到 ${results.length} 个结果。\n`);
  let foundMatch = false;
  results.forEach((r, i) => {
    console.log(`  [${i + 1}] ID: ${r.id}, 相似度: ${r.similarity.toFixed(6)}`);
    if (r.id === 5 && r.similarity > 0.99) {
      foundMatch = true;
    }
  });

  console.log('\n=== 最终诊断结论 ===');
  if (foundMatch) {
    console.log('✅ 系统功能正常！端到端测试通过。');
    console.log('   之前 "非暴力沟通" 查询失败的原因可能是极其微小的文本差异（如空格、编码）。');
    console.log('   您的 RAG 系统已准备就绪。专注于查询即可。');
  } else {
    console.log('❌ 关键失败: 新生成的向量与旧向量的相似度过低。');
    console.log('   请重新运行 `node ingest-fixed.js` 以确保所有数据使用完全相同的向量版本。');
  }
}

finalDiagnostic().catch(console.error);
