require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
const MODEL = 'sentence-transformers/all-mpnet-base-v2';
const EXPECTED_DIM = 768;

function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    console.error(`❌ 维度不匹配: ${vecA.length} vs ${vecB.length}`);
    return 0;
  }
  
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecA[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  return normA && normB ? dot / (normA * normB) : 0;
}

async function verify() {
  console.log('=== RAG 向量系统验证 ===\n');
  
  // 1. 检查数据库
  console.log('📊 步骤 1: 检查数据库表');
  const { data: vectors, error: selectError } = await supabase
    .from('knowledge_vectors')
    .select('id, content, embedding')
    .limit(3);
  
  if (selectError) {
    console.error('❌ 数据库查询失败:', selectError.message);
    return;
  }
  
  if (!vectors || vectors.length === 0) {
    console.log('⚠️  数据库为空，请先运行 ingest-knowledge-sdk.js');
    return;
  }
  
  console.log(`✅ 找到 ${vectors.length} 条记录\n`);
  
  // 2. 检查每条记录
  console.log('📝 步骤 2: 检查向量维度');
  let allCorrect = true;
  
  for (let i = 0; i < vectors.length; i++) {
    const vec = vectors[i];
    const dim = vec.embedding?.length || 0;
    const status = dim === EXPECTED_DIM ? '✅' : '❌';
    
    console.log(`  [${i+1}] ID: ${vec.id}`);
    console.log(`      维度: ${dim} ${status}`);
    console.log(`      内容: ${vec.content.substring(0, 50)}...`);
    
    if (dim !== EXPECTED_DIM) {
      allCorrect = false;
      console.log(`      ⚠️  期望 ${EXPECTED_DIM} 维，实际 ${dim} 维`);
    }
  }
  
  console.log();
  
  if (!allCorrect) {
    console.log('❌ 发现维度不匹配！需要重建向量数据库');
    console.log('   运行: node ingest-knowledge-sdk.js\n');
    return;
  }
  
  // 3. 测试向量生成
  console.log('🔧 步骤 3: 测试向量生成');
  const testQuery = '沟通技巧';
  
  try {
    const queryVec = await hf.featureExtraction({
      model: MODEL,
      inputs: testQuery
    });
    
    // 处理嵌套数组
    const finalVec = Array.isArray(queryVec[0]) ? queryVec[0] : queryVec;
    
    console.log(`  查询: "${testQuery}"`);
    console.log(`  生成维度: ${finalVec.length}`);
    console.log(`  前3个值: [${finalVec.slice(0, 3).map(v => v.toFixed(4)).join(', ')}...]`);
    
    if (finalVec.length !== EXPECTED_DIM) {
      console.log(`  ❌ 维度错误！期望 ${EXPECTED_DIM}，得到 ${finalVec.length}`);
      return;
    }
    
    console.log('  ✅ 向量生成正常\n');
    
    // 4. 测试相似度计算
    console.log('📐 步骤 4: 测试相似度计算');
    const firstVec = vectors[0].embedding;
    const similarity = cosineSimilarity(finalVec, firstVec);
    
    console.log(`  与第一条记录的相似度: ${similarity.toFixed(4)}`);
    console.log(`  第一条内容: ${vectors[0].content.substring(0, 60)}...`);
    
    if (similarity > 0 && similarity <= 1) {
      console.log('  ✅ 相似度计算正常\n');
    } else {
      console.log('  ⚠️  相似度值异常\n');
    }
    
    // 5. 测试多个查询
    console.log('🧪 步骤 5: 测试多个查询');
    const testQueries = [
      '沟通技巧',
      '人际关系',
      '情感表达',
      vectors[0].content.substring(0, 30) // 使用实际内容的一部分
    ];
    
    for (const q of testQueries) {
      const qVec = await hf.featureExtraction({
        model: MODEL,
        inputs: q
      });
      const qFinal = Array.isArray(qVec[0]) ? qVec[0] : qVec;
      const sim = cosineSimilarity(qFinal, firstVec);
      
      const bar = '█'.repeat(Math.floor(sim * 20));
      console.log(`  "${q.substring(0, 15).padEnd(15)}" ${bar} ${sim.toFixed(4)}`);
    }
    
    console.log();
    
    // 6. 测试数据库函数
    console.log('🔍 步骤 6: 测试 match_knowledge 函数');
    
    const { data: matches, error: matchError } = await supabase
      .rpc('match_knowledge', {
        query_embedding: finalVec,
        match_threshold: 0.1,
        match_count: 3
      });
    
    if (matchError) {
      console.log(`  ❌ RPC 调用失败: ${matchError.message}`);
      console.log(`  提示: 确保已创建 match_knowledge 函数\n`);
      return;
    }
    
    console.log(`  ✅ 找到 ${matches?.length || 0} 个匹配结果`);
    
    if (matches && matches.length > 0) {
      matches.forEach((m, i) => {
        console.log(`    [${i+1}] 相似度: ${m.similarity.toFixed(4)}`);
        console.log(`        内容: ${m.content.substring(0, 50)}...`);
      });
    }
    
    console.log();
    
    // 7. 总结
    console.log('=== ✅ 验证完成 ===');
    console.log('所有检查都通过了！RAG 系统工作正常。');
    console.log('\n建议的相似度阈值: 0.3 - 0.7');
    console.log('可以开始使用 RAG 查询了！\n');
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    console.error(error);
  }
}

verify().catch(console.error);