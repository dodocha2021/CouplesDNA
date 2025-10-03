require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

async function testDirectSQL() {
  const query = "why radio technologist need climb the tower?";
  
  const vec = await hf.featureExtraction({
    model: 'BAAI/bge-base-en-v1.5',
    inputs: query
  });
  const finalVec = Array.isArray(vec[0]) ? vec[0] : vec;
  
  // 直接用 PostgreSQL 查询
  const { data, error } = await supabase
    .rpc('sql', {
      query: `
        SELECT 
          id,
          content,
          1 - (embedding <=> $1::vector) AS similarity
        FROM knowledge_vectors
        WHERE 1 - (embedding <=> $1::vector) >= 0.0
        ORDER BY embedding <=> $1::vector
        LIMIT 20
      `,
      params: [`[${finalVec.join(',')}]`]
    });
  
  if (error) {
    console.error('SQL 错误:', error);
    console.log('\n尝试另一种方法...\n');
    
    // 获取所有记录手动计算
    const { data: allRecords } = await supabase
      .from('knowledge_vectors')
      .select('id, content, embedding')
      .limit(300);
    
    console.log(`获取了 ${allRecords.length} 条记录`);
    
    const results = allRecords.map(record => {
      const emb = record.embedding;
      let embedding;
      
      if (typeof emb === 'string') {
        // 解析字符串为数组
        embedding = JSON.parse(emb);
      } else {
        embedding = emb;
      }
      
      // 计算余弦相似度
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      
      for (let i = 0; i < finalVec.length; i++) {
        dotProduct += finalVec[i] * embedding[i];
        normA += finalVec[i] * finalVec[i];
        normB += embedding[i] * embedding[i];
      }
      
      const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
      
      return {
        id: record.id,
        similarity,
        content: record.content.substring(0, 100)
      };
    });
    
    // 排序并显示前20个
    results.sort((a, b) => b.similarity - a.similarity);
    
    console.log('\n前20个结果:');
    results.slice(0, 20).forEach((r, i) => {
      const marker = (r.id === 208 || r.id === 226) ? ' ⭐' : '';
      console.log(`${i+1}. [${r.similarity.toFixed(4)}] ID:${r.id}${marker}`);
    });
  } else {
    console.log('SQL 查询成功！\n');
    console.log('前20个结果:');
    data.forEach((r, i) => {
        const marker = (r.id === 208 || r.id === 226) ? ' ⭐' : '';
        console.log(`${i+1}. [${r.similarity.toFixed(4)}] ID:${r.id}${marker}`);
    });
  }
}

testDirectSQL();
