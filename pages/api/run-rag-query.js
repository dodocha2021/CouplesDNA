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
  const debugLogs = [];
  const log = (message, ...optionalParams) => {
    const logMessage = [message, ...optionalParams].map(p => {
        if (typeof p === 'object' && p !== null) {
            return JSON.stringify(p, null, 2);
        }
        return p;
    }).join(' ');
    
    console.log(logMessage);
    debugLogs.push(logMessage);
  };

  log('\n--- Report Mode Start ---\n');
  
  const { 
    question, 
    reportConfig,
    model, 
    systemPrompt, 
    userPromptTemplate, 
    scope 
  } = req.body;

  log('🔍 DEBUG - reportConfig:', reportConfig);
  log('🔍 DEBUG - scope:', scope);

  if (!question || !reportConfig) {
    throw new Error("Missing required parameters for report mode.");
  }

  if (!reportConfig.userData || !reportConfig.userData.selectedUserId) {
    throw new Error("Missing userData configuration in reportConfig.");
  }

  // Validate that at least one user file is selected
  if (!reportConfig.userData.selectedFileIds || reportConfig.userData.selectedFileIds.length === 0) {
    throw new Error("At least one user data file must be selected.");
  }

  // Validate that at least one knowledge file is selected (scope)
  if (!scope || !Array.isArray(scope) || scope.length === 0) {
    throw new Error("At least one knowledge base file must be selected.");
  }

  // 1. Vectorize question
  log('[1/5] Vectorizing question...');
  const questionEmbedding = await generateEmbedding(question);
  const vectorString = `[${questionEmbedding.join(',')}]`;

  // 2. Retrieve knowledge and user data
  log('[2/5] Retrieving knowledge and user data...');
  
  const knowledgePromises = scope.map(({ file_id, threshold }) =>
    supabaseAdmin.rpc('match_knowledge', {
      query_embedding: vectorString,
      match_threshold: parseFloat(threshold),
      match_count: reportConfig.knowledge.topK || 5,
      p_file_ids: [file_id]
    })
  );
  
  const knowledgeSearchResults = await Promise.all(knowledgePromises);

  let knowledgeResults = [];
  knowledgeSearchResults.forEach((result, index) => {
    const fileId = scope[index].file_id.substring(0, 8);
    const count = result.data ? result.data.length : 0;
    const errorMsg = result.error ? ` ERROR: ${result.error.message}` : '';
    log(`  > File ${fileId}...: ${count} chunks${errorMsg}`);
    if (result.data) knowledgeResults.push(...result.data);
  });

  log(`  > Total before dedup: ${knowledgeResults.length} chunks`);

  const uniqueKnowledge = Array.from(new Map(knowledgeResults.map(item => [item.id, item])).values());
  log(`  > After dedup: ${uniqueKnowledge.length} chunks`);

  knowledgeResults = uniqueKnowledge.sort((a, b) => b.similarity - a.similarity).slice(0, reportConfig.knowledge.topK || 5);
  log(`  > After topK limit: ${knowledgeResults.length} chunks`);

  const userDataResults = await retrieveUserData(questionEmbedding, reportConfig.userData);

  log(`  > Found ${knowledgeResults.length} knowledge chunks and ${userDataResults.length} user data chunks.`);

  // 3. Build context
  log('[3/5] Building context...');
  const knowledgeContext = knowledgeResults.length > 0
    ? knowledgeResults.map((r, i) => `[K${i+1}] ${r.content}`).join('\n\n---\n\n')
    : "No knowledge found.";
  const userDataContext = userDataResults.length > 0
    ? userDataResults.map((r, i) => `[U${i+1}] ${r.content}`).join('\n\n---\n\n')
    : "No user data found.";

  // 4. Build final prompt
  log('[4/5] Building final prompt...');
  const finalUserPrompt = userPromptTemplate
    .replace('{context}', knowledgeContext)
    .replace('{userdata}', userDataContext)
    .replace('{question}', question);

  // 5. Print debug info
  log('\n========== REPORT MODE - AI REQUEST ==========');
  log('Model:', model);
  log('\n--- System Prompt ---');
  log(systemPrompt);
  log('\n--- User Prompt ---');
  log(finalUserPrompt);
  log('\n--- Knowledge Results ---');
  log(`Found ${knowledgeResults.length} chunks`);
  log('\n--- User Data Results ---');
  log(`Found ${userDataResults.length} chunks`);
  log('==============================================\n');

  // 6. Call AI
  log('[5/5] Sending request to AI model...');
  const result = await callAI(
    model,
    finalUserPrompt,
    systemPrompt,
    { temperature: 0.7, max_tokens: 4096 }
  );

  log('\n========== REPORT MODE - AI RESPONSE ==========');
  log(result.content);
  log('===============================================\n');

  log('--- Report Mode End ---\n');

  // 7. Return the response
  return res.status(200).json({
    response: result.content,
    usage: result.usage,
    model: result.model,
    debugLogs: debugLogs.join('\n'),
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
    const debugLogs = [];
    const log = (message, ...optionalParams) => {
        const logMessage = [message, ...optionalParams].map(p => {
            if (typeof p === 'object' && p !== null) {
                return JSON.stringify(p, null, 2);
            }
            return p;
        }).join(' ');
        
        console.log(logMessage);
        debugLogs.push(logMessage);
    };

    log('\n--- Prompt Mode Start ---\n');
    const {
        question, systemPrompt, userPromptTemplate, model, scope,
        topK = 10, strictMode = false
    } = req.body;

    if (!question || !Array.isArray(scope) || scope.length === 0) {
        throw new Error("A question and a valid search scope are required.");
    }

    // 1. Vectorize question
    log(`[1/4] Vectorizing question for model ${model}...`);
    const questionVector = await generateEmbedding(question);
    const vectorString = `[${questionVector.join(',')}]`;

    // 2. Perform vector search
    log(`[2/4] Starting vector search with ${scope.length} files...`);
    const searchPromises = scope.map(({ file_id, threshold }) =>
        supabaseAdmin.rpc('match_knowledge', {
            query_embedding: vectorString,
            match_threshold: parseFloat(threshold),
            match_count: topK,
            p_file_ids: [file_id]
        })
    );
    const results = await Promise.all(searchPromises);

    let combinedResults = [];
    results.forEach(result => {
        if (result.data) combinedResults.push(...result.data);
    });

    const uniqueResults = Array.from(new Map(combinedResults.map(item => [item.id, item])).values());
    const sortedResults = uniqueResults.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
    log(`  > Found ${sortedResults.length} relevant chunks.`);

    // 3. Assemble Context & Handle Strict Mode
    log('[3/4] Assembling context...');
    if (strictMode && sortedResults.length === 0) {
        log('  > Strict mode ON, no results found. Returning fallback.');
        log('--- Prompt Mode End ---\n');
        const fallbackAnswer = "I could not find an answer in the provided knowledge base.";
        return res.status(200).json({ response: fallbackAnswer, debugLogs: debugLogs.join('\n') });
    }
    const context = sortedResults.length > 0
        ? sortedResults.map(r => r.content).join('\n\n---\n\n')
        : "No context was found.";

    // 4. Call AI Model
    log('[4/4] Sending request to AI model...');
    let finalUserPrompt = userPromptTemplate
      .replace('{context}', context)
      .replace('{question}', question)
      .replace('{userdata}', '')
      .replace(/USER DATA \(Personal History\):\s*\n*/gi, '')
      .replace(/\n\n\n+/g, '\n\n')
      .trim();

    log('\n========== AI REQUEST ==========');
    log('Model:', model);
    log('\n--- System Prompt ---');
    log(systemPrompt || '(No system prompt)');
    log('\n--- User Prompt ---');
    log(finalUserPrompt);
    log('\n--- Context Preview (first 500 chars) ---');
    log(context.substring(0, 500) + '...');
    log('\n--- Search Results Metadata ---');
    sortedResults.forEach((r, i) => {
        log(`  [${i+1}] ID: ${r.id}, Similarity: ${r.similarity.toFixed(4)}, Length: ${r.content.length} chars`);
    });
    log('================================\\n');

    const result = await callAI(
      model,
      finalUserPrompt,
      systemPrompt,
      { temperature: 0.7, max_tokens: 4096 }
    );

    log('\n========== AI RESPONSE ==========');
    log(result.content);
    log('=================================\n');

    log('--- Prompt Mode End ---\n');
    return res.status(200).json({ 
      response: result.content,
      usage: result.usage,
      model: result.model,
      debugLogs: debugLogs.join('\n') 
    });
}
