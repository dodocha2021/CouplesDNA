
import { retrieveKnowledge, retrieveUserData } from '@/lib/retrieval';
import { generateEmbedding } from '@/lib/embedding';
import { callAI } from '@/lib/ai';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Main handler for the API endpoint
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { mode = 'prompt' } = req.body;

    if (mode === 'report') {
      return await handleReportMode(req, res);
    } else {
      return await handlePromptMode(req, res);
    }

  } catch (error) {
    console.error("Error in RAG query handler:", error);
    res.status(500).json({ error: error.message || "An internal server error occurred." });
  }
}

// Handler for the new 'Report' mode
async function handleReportMode(req, res) {
  console.log('\n--- Report Mode Start ---\n');
  const { question, reportConfig, model, systemPrompt, userPromptTemplate, scope, knowledgeTopK } = req.body;

  console.log('🔍 DEBUG - scope:', JSON.stringify(scope, null, 2));

  if (!question || !reportConfig) {
    throw new Error("Missing required parameters for report mode.");
  }

  // 1. Vectorize question
  console.log('[1/5] Vectorizing question...');
  const questionEmbedding = await generateEmbedding(question);
  const vectorString = `[${questionEmbedding.join(',')}]`;

  // 2. Retrieve knowledge - ✅ 使用与 Prompt Mode 相同的逻辑
  console.log('[2/5] Retrieving knowledge and user data...');
  
  // 为每个文件分别搜索（和 Prompt Mode 一样）
  const knowledgePromises = scope.map(({ file_id, threshold }) =>
    supabaseAdmin.rpc('match_knowledge', {
      query_embedding: vectorString,
      match_threshold: parseFloat(threshold),
      match_count: knowledgeTopK || 5,
      p_file_id: file_id  // ✅ 单个 file_id
    })
  );
  
  const knowledgeSearchResults = await Promise.all(knowledgePromises);
  
  // 合并结果
  let knowledgeResults = [];
  knowledgeSearchResults.forEach(result => {
    if (result.data) knowledgeResults.push(...result.data);
  });
  
  // 去重并排序
  const uniqueKnowledge = Array.from(new Map(knowledgeResults.map(item => [item.id, item])).values());
  knowledgeResults = uniqueKnowledge.sort((a, b) => b.similarity - a.similarity).slice(0, knowledgeTopK || 5);
  
  // Retrieve user data
  const userDataResults = await retrieveUserData(questionEmbedding, reportConfig.userData);
  
  console.log(`  > Found ${knowledgeResults.length} knowledge chunks and ${userDataResults.length} user data chunks.`);

  // 3. Build context
  console.log('[3/5] Building context...');
  
  const knowledgeContext = knowledgeResults.length > 0
    ? knowledgeResults.map((r, i) => `[K${i+1}] ${r.content}`).join('\n\n---\n\n')
    : "No knowledge found.";
  
  const userDataContext = userDataResults.length > 0
    ? userDataResults.map((r, i) => `[U${i+1}] ${r.content}`).join('\n\n---\n\n')
    : "No user data found.";

  // 4. Build final prompt
  console.log('[4/5] Building final prompt...');
  const finalUserPrompt = userPromptTemplate
    .replace('{context}', knowledgeContext)
    .replace('{userdata}', userDataContext)
    .replace('{question}', question);

  // 5. Print debug info
  console.log('\n========== REPORT MODE - AI REQUEST ==========');
  console.log('Model:', model);
  console.log('\n--- System Prompt ---');
  console.log(systemPrompt);
  console.log('\n--- User Prompt ---');
  console.log(finalUserPrompt);
  console.log('\n--- Knowledge Results ---');
  console.log(`Found ${knowledgeResults.length} chunks`);
  console.log('\n--- User Data Results ---');
  console.log(`Found ${userDataResults.length} chunks`);
  console.log('==============================================\n');

  // 6. Call AI
  console.log('[5/5] Sending request to AI model...');
  const aiResponse = await callAI(finalUserPrompt, model, systemPrompt);

  console.log('\n========== REPORT MODE - AI RESPONSE ==========');
  console.log(aiResponse);
  console.log('===============================================\n');

  console.log('--- Report Mode End ---\n');

  // 7. Return the response
  return res.status(200).json({
    response: aiResponse,
    context: {
      knowledge: {
        found: knowledgeResults.length > 0,
        chunks: knowledgeResults,
        count: knowledgeResults.length
      },
      userData: {
        found: userDataResults.length > 0,
        chunks: userDataResults,
        count: userDataResults.length
      }
    }
  });
}


// Handler for the existing 'Prompt' mode (Vector Search part)
async function handlePromptMode(req, res) {
    console.log('\n--- Prompt Mode Start ---\n');
    const {
        question, systemPrompt, userPromptTemplate, model, scope,
        topK = 10, strictMode = false, fallbackAnswer
    } = req.body;

    if (!question || !Array.isArray(scope) || scope.length === 0) {
        throw new Error("A question and a valid search scope are required.");
    }

    // 1. Vectorize question
    console.log(`[1/4] Vectorizing question for model ${model}...`);
    const questionVector = await generateEmbedding(question);
    const vectorString = `[${questionVector.join(',')}]`;

    // 2. Perform vector search
    console.log(`[2/4] Starting vector search with ${scope.length} files...`);
    const searchPromises = scope.map(({ file_id, threshold }) =>
        supabaseAdmin.rpc('match_knowledge', {
            query_embedding: vectorString,
            match_threshold: parseFloat(threshold),
            match_count: topK,
            p_file_id: file_id
        })
    );
    const results = await Promise.all(searchPromises);

    let combinedResults = [];
    results.forEach(result => {
        if (result.data) combinedResults.push(...result.data);
    });

    const uniqueResults = Array.from(new Map(combinedResults.map(item => [item.id, item])).values());
    const sortedResults = uniqueResults.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
    console.log(`  > Found ${sortedResults.length} relevant chunks.`);

    // 3. Assemble Context & Handle Strict Mode
    console.log('[3/4] Assembling context...');
    if (strictMode && sortedResults.length === 0) {
        console.log('  > Strict mode ON, no results found. Returning fallback.');
        console.log('--- Prompt Mode End ---\n');
        return res.status(200).json({ response: fallbackAnswer });
    }
    const context = sortedResults.length > 0
        ? sortedResults.map(r => r.content).join('\n\n---\n\n')
        : "No context was found.";

    // 4. Call AI Model
    console.log('[4/4] Sending request to AI model...');
    let finalUserPrompt = userPromptTemplate
      .replace('{context}', context)
      .replace('{question}', question)
      .replace('{userdata}', '')
      .replace(/USER DATA \(Personal History\):\s*\n*/gi, '')
      .replace(/\n\n\n+/g, '\n\n')
      .trim();

    // ===== 新增：打印完整的 Request =====
    console.log('\n========== AI REQUEST ==========');
    console.log('Model:', model);
    console.log('\n--- System Prompt ---');
    console.log(systemPrompt || '(No system prompt)');
    console.log('\n--- User Prompt ---');
    console.log(finalUserPrompt);
    console.log('\n--- Context Preview (first 500 chars) ---');
    console.log(context.substring(0, 500) + '...');
    console.log('\n--- Search Results Metadata ---');
    sortedResults.forEach((r, i) => {
        console.log(`  [${i+1}] ID: ${r.id}, Similarity: ${r.similarity.toFixed(4)}, Length: ${r.content.length} chars`);
    });
    console.log('================================\n');
    // ===== 结束新增 =====

    const generatedResponse = await callAI(finalUserPrompt, model, systemPrompt);

    // ===== 新增：打印完整的 Response =====
    console.log('\n========== AI RESPONSE ==========');
    console.log(generatedResponse);
    console.log('=================================\n');
    // ===== 结束新增 =====

    console.log('--- Prompt Mode End ---\n');
    return res.status(200).json({ response: generatedResponse });
}
