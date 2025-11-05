require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
const MODEL = 'BAAI/bge-base-en-v1.5';

async function testRelevantQuery() {
  console.log('=== 测试真实相关的英文查询 ===\n');

  // 使用与你数据库内容匹配的英文查询
  const queries = [
    { text: 'tenant landlord agreement', desc: '高度相关 - 租赁协议' },
    { text: 'property rental rules', desc: '高度相关 - 租赁规则' },
    { text: 'security deposit', desc: '相关 - 押金' },
    { text: 'smoke-free property', desc: '相关 - 从结果中提取' },
    { text: 'illegal activities', desc: '相关 - 从结果中提取' },
    { text: 'cooking recipes', desc: '不相关' },
    { text: 'machine learning', desc: '完全不相关' }
  ];

  const allResults = [];

  for (const { text, desc } of queries) {
    console.log(`\n📝 查询: "${text}"`);
    console.log(`   类型: ${desc}`);
    console.log('─'.repeat(60));

    const queryVec = await hf.featureExtraction({
      model: MODEL,
      inputs: text
    });
    const finalQueryVec = Array.isArray(queryVec[0]) ? queryVec[0] : queryVec;
    const vectorString = `[${finalQueryVec.join(',')}]`;

    const { data: results, error } = await supabase.rpc('match_knowledge', {
      query_embedding: vectorString,
      match_threshold: 0.0,
      match_count: 5
    });

    if (error) {
      console.error('❌ 搜索失败:', error.message);
      continue;
    }

    if (results.length === 0) {
      console.log('⚠️ 没有找到结果');
      continue;
    }

    const maxSim = Math.max(...results.map(r => r.similarity));
    const minSim = Math.min(...results.map(r => r.similarity));
    const avgSim = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;

    console.log(`结果: ${results.length} 个`);
    console.log(`最高相似度: ${maxSim.toFixed(4)} ⭐`);
    console.log(`平均相似度: ${avgSim.toFixed(4)}`);
    console.log(`最低相似度: ${minSim.toFixed(4)}`);

    allResults.push({ query: text, desc, maxSim, avgSim, minSim });

    // 显示前3个结果
    console.log('\n前3个结果:');
    results.slice(0, 3).forEach((r, i) => {
      const bar = '█'.repeat(Math.floor(r.similarity * 100));
      console.log(`  ${i + 1}. [${r.similarity.toFixed(4)}] ${bar}`);
      console.log(`     ${r.content.substring(0, 80)}...`);
    });
  }

  // 汇总分析
  console.log('\n\n=== 相似度汇总 ===');
  console.log('─'.repeat(80));
  console.log('查询类型'.padEnd(25) + '最高相似度'.padEnd(15) + '平均相似度'.padEnd(15) + '类别');
  console.log('─'.repeat(80));

  allResults.forEach(r => {
    const category = r.maxSim >= 0.7 ? '✅ 强相关' :
                     r.maxSim >= 0.5 ? '🟡 中度相关' :
                     r.maxSim >= 0.4 ? '🟠 弱相关' : '❌ 不相关';
    
    console.log(
      r.query.padEnd(25) +
      r.maxSim.toFixed(4).padEnd(15) +
      r.avgSim.toFixed(4).padEnd(15) +
      category
    );
  });

  // 给出阈值建议
  console.log('\n\n📊 基于实际数据的阈值建议:');
  console.log('─'.repeat(60));
  
  const relevantScores = allResults
    .filter(r => r.desc.includes('相关'))
    .map(r => r.maxSim);
  
  const irrelevantScores = allResults
    .filter(r => r.desc.includes('不相关'))
    .map(r => r.maxSim);

  if (relevantScores.length > 0 && irrelevantScores.length > 0) {
    const minRelevant = Math.min(...relevantScores);
    const maxIrrelevant = Math.max(...irrelevantScores);
    const suggestedThreshold = ((minRelevant + maxIrrelevant) / 2).toFixed(2);

    console.log(`相关内容最低分: ${minRelevant.toFixed(4)}`);
    console.log(`不相关内容最高分: ${maxIrrelevant.toFixed(4)}`);
    console.log(`\n🎯 推荐阈值: ${suggestedThreshold}`);
    console.log('   (在相关和不相关之间找平衡点)');
  }

  console.log('\n✅ 测试完成!\n');
}

testRelevantQuery().catch(console.error);