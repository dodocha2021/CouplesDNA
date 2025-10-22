require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
const MODEL = 'sentence-transformers/all-mpnet-base-v2';

function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function calculateSim() {
  console.log('=== 手动计算相似度 ===\n');

  // 1. 读取数据库向量
  const { data: records } = await supabase
    .from('knowledge_vectors')
    .select('id, content, embedding')
    .limit(5);

  console.log(`数据库记录数: ${records.length}\n`);

  // 2. 生成查询向量
  const queries = [
    '沟通',
    '沟通技巧', 
    '非暴力沟通',
    '亲密关系',
    '情绪管理',
    records[0].content.substring(0, 50)  // 使用实际内容的一部分
  ];

  for (const query of queries) {
    console.log(`\n查询: "${query.substring(0, 30)}..."`);
    
    const vec = await hf.featureExtraction({ model: MODEL, inputs: query });
    const finalVec = Array.isArray(vec[0]) ? vec[0] : vec;

    console.log('相似度排名:');
    
    // 计算与所有记录的相似度
    const similarities = records.map(r => {
      const dbVec = JSON.parse(r.embedding);
      const sim = cosineSimilarity(finalVec, dbVec);
      return {
        id: r.id,
        content: r.content.substring(0, 60),
        similarity: sim
      };
    });

    // 排序并显示
    similarities.sort((a, b) => b.similarity - a.similarity);
    similarities.slice(0, 3).forEach((s, i) => {
      console.log(`  ${i+1}. 相似度: ${s.similarity.toFixed(4)} - ${s.content}...`);
    });

    // 检查是否有任何结果 >= 0.3
    const passed = similarities.filter(s => s.similarity >= 0.3);
    if (passed.length === 0) {
      console.log(`  ⚠️  没有记录相似度 >= 0.3（最高: ${similarities[0].similarity.toFixed(4)}）`);
    }
  }

  console.log('\n=== 结论 ===');
  console.log('如果所有查询的相似度都很低(<0.3)，说明:');
  console.log('1. 查询词太短/太泛化');
  console.log('2. 知识库内容与查询语义距离较远');
  console.log('3. 需要降低阈值或使用更具体的查询');
}

calculateSim().catch(console.error);
