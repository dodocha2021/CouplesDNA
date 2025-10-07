import { retrieveKnowledge, retrieveUserData } from '@/lib/retrieval';
import { buildReportContext, buildReportPrompt } from '@/lib/report-helpers';
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
  const { question, reportConfig, model, systemPrompt, userPromptTemplate } = req.body;

  if (!question || !reportConfig) {
    throw new Error("Missing required parameters for report mode.");
  }

  // 1. Generate embedding for the question
  console.log('[1/5] Vectorizing question...');
  const questionEmbedding = await generateEmbedding(question);

  // 2. Retrieve knowledge and user data in parallel
  console.log('[2/5] Retrieving knowledge and user data...');
  const knowledgeConfig = {
      selectedFileIds: req.body.scope.map(s => s.file_id),
      threshold: req.body.scope[0]?.threshold || 0.3, // Using first threshold for all
      topK: req.body.knowledgeTopK
  };

  const [knowledgeResults, userDataResults] = await Promise.all([
    retrieveKnowledge(questionEmbedding, knowledgeConfig),
    retrieveUserData(questionEmbedding, reportConfig.userData)
  ]);
  console.log(`  > Found ${knowledgeResults.length} knowledge chunks and ${userDataResults.length} user data chunks.`);

  // 3. Build context from results
  console.log('[3/5] Building context for AI...');
  const context = buildReportContext(knowledgeResults, userDataResults);

  // 4. Build the final prompt
  console.log('[4/5] Building final prompt...');
  const finalPrompt = buildReportPrompt(systemPrompt, userPromptTemplate, context, question);

  // 5. Call AI and get a structured JSON response
  console.log('[5/5] Sending request to AI model...');
  const aiResponse = await callAI(finalPrompt, model, null); // System prompt is already in finalPrompt

  console.log('--- Report Mode End ---\n');

  // 6. Return the structured response
  return res.status(200).json({
    answer: JSON.parse(aiResponse), // Expecting a JSON string from the AI
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
    const finalUserPrompt = userPromptTemplate.replace('{context}', context).replace('{question}', question);
    const generatedResponse = await callAI(finalUserPrompt, model, systemPrompt);
    
    console.log('--- Prompt Mode End ---\n');
    return res.status(200).json({ response: generatedResponse });
}
