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
  console.log('=== 开始索引（修复版）===\n');

  // 1. 清空旧数据
  console.log('清空旧数据...');
  const { error: deleteError } = await supabase
    .from('knowledge_vectors')
    .delete()
    .neq('id', 0);
  
  if (deleteError) {
    console.error('清空失败:', deleteError);
    return;
  }
  console.log('✓ 旧数据已清空\n');

  // 2. 读取文件
  const fileContent = await fs.readFile('knowledge.txt', 'utf-8');
  const chunks = chunkText(fileContent);
  
  console.log(`文本已分割为 ${chunks.length} 个块\n`);

  // 3. 索引每个块
  for (let i = 0; i < chunks.length; i++) {
    const content = chunks[i].trim();
    if (!content) continue;

    try {
      console.log(`[${i + 1}/${chunks.length}] 生成向量...`);
      const embedding = await hf.featureExtraction({
        model: MODEL,
        inputs: content.replace(/\n/g, ' ')
      });
      
      // 确保是一维数组
      const finalEmbedding = Array.isArray(embedding[0]) ? embedding[0] : embedding;
      
      console.log(`  向量维度: ${finalEmbedding.length}`);
      
      if (finalEmbedding.length !== 768) {
        console.error(`  ❌ 维度错误: ${finalEmbedding.length}, 期望 768`);
        break;
      }

      // 🔑 关键修复：将数组转换为 pgvector 格式的字符串
      // 格式: [0.1,0.2,0.3,...]
      const vectorString = `[${finalEmbedding.join(',')}]`;

      console.log(`  插入数据库...`);
      
      // 使用原始 SQL 插入，绕过 JS 客户端的序列化
      const { error } = await supabase.rpc('insert_knowledge_vector', {
        p_content: content,
        p_embedding: vectorString,
        p_metadata: { model: MODEL, source: 'knowledge.txt' }
      });

      if (error) {
        console.error(`  ❌ 插入失败:`, error);
        // 如果 RPC 函数不存在，尝试直接插入
        console.log(`  尝试直接插入...`);
        const { error: directError } = await supabase
          .from('knowledge_vectors')
          .insert({
            content,
            embedding: vectorString,  // 使用字符串格式
            metadata: { model: MODEL, source: 'knowledge.txt' }
          });
        
        if (directError) {
          console.error(`  ❌ 直接插入也失败:`, directError);
          break;
        }
      }
      
      console.log(`  ✓ 成功\n`);
      
    } catch (error) {
      console.error(`[${i + 1}/${chunks.length}] ✗ 失败:`, error.message);
      break;
    }
  }

  console.log('\n=== 验证数据 ===');
  const { data: check } = await supabase
    .from('knowledge_vectors')
    .select('*')
    .limit(1);
  
  if (check && check[0]) {
    console.log(`记录数: ${check.length}`);
    console.log(`ID: ${check[0].id}`);
    console.log(`向量类型: ${typeof check[0].embedding}`);
    console.log(`是数组: ${Array.isArray(check[0].embedding)}`);
    
    if (typeof check[0].embedding === 'string') {
      console.log('⚠️  向量仍是字符串，需要创建 RPC 函数');
    } else if (Array.isArray(check[0].embedding)) {
      console.log(`✓ 向量维度: ${check[0].embedding.length}`);
      console.log('✅ 数据格式正确！');
    }
  }

  console.log('\n索引完成！');
}

runIngestion().catch(console.error);