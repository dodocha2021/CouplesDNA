require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');
const fs = require('fs/promises');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
const MODEL = 'sentence-transformers/all-mpnet-base-v2';

async function getEmbedding(text) {
  const response = await hf.featureExtraction({
    model: MODEL,
    inputs: text.replace(/\n/g, ' '),
  });
  return Array.isArray(response[0]) ? response[0] : response;
}

// 简单的文本分块函数
function chunkText(text, chunkSize = 384, overlap = 40) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end));
    start += chunkSize - overlap;
  }
  
  return chunks;
}

async function runIngestion() {
  console.log('开始索引文档...\n');

  const fileContent = await fs.readFile('knowledge.txt', 'utf-8');
  const chunks = chunkText(fileContent);
  
  console.log(`文本已分割为 ${chunks.length} 个块\n`);

  for (let i = 0; i < chunks.length; i++) {
    const content = chunks[i].trim();
    if (!content) continue;

    try {
      const embedding = await getEmbedding(content);
      
      // 验证维度
      if (embedding.length !== 768) {
        console.error(`❌ 向量维度错误: ${embedding.length}, 期望768`);
        break;
      }

      const { error } = await supabase
        .from('knowledge_vectors')
        .insert({
          content,
          embedding,
          metadata: { model: MODEL, source: 'knowledge.txt' }
        });

      if (error) throw error;
      
      console.log(`[${i + 1}/${chunks.length}] ✓ 已索引`);
    } catch (error) {
      console.error(`[${i + 1}/${chunks.length}] ✗ 失败:`, error.message);
      break;
    }
  }

  console.log('\n索引完成！');
}

runIngestion().catch(console.error);