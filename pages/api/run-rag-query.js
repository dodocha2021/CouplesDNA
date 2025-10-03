import { createClient } from '@supabase/supabase-js';
import { HfInference } from '@huggingface/inference';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from 'openai';

// Initialize all the clients we need
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
const embeddingModel = 'BAAI/bge-base-en-v1.5';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Function to generate embeddings
async function getEmbedding(text) {
  const cleanedText = text.replace(/\n/g, ' ');
  const response = await hf.featureExtraction({
    model: embeddingModel,
    inputs: cleanedText,
  });
  if (Array.isArray(response) && typeof response[0] === 'number') return response;
  if (Array.isArray(response) && Array.isArray(response[0])) return response[0];
  throw new Error("Failed to generate a valid embedding vector.");
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('\n--- RAG Query Start ---\n');

  try {
    // ✅ Default topK changed to 10
    const {
      question,
      systemPrompt,
      userPromptTemplate,
      model,
      scope,
      manualContext,
      topK = 10, 
      strictMode = false,
      fallbackAnswer = "I could not find an answer in the provided knowledge base.",
    } = req.body;
    
    let context = '';
    const isManualMode = manualContext !== undefined;

    if (isManualMode) {
        console.log('[1/3] Running in MANUAL mode.');
        context = manualContext;
        console.log('[1/3] Using provided manual context.');

    } else {
        // VECTOR SEARCH MODE
        // ✅ topK added to log
        console.log(`[1/5] Received question: "${question}" for model ${model}`);
        console.log(`[1/5] Scope includes ${scope?.length || 0} files. Top K: ${topK}. Strict Mode: ${strictMode}.`);

        if (!question || !Array.isArray(scope) || scope.length === 0) {
          return res.status(400).json({ error: "A question and a valid search scope are required for vector search." });
        }

        const questionVector = await getEmbedding(question);
        console.log('[2/5] Successfully vectorized question.');

        // ✅ Convert array to Postgres-compatible vector string
        const vectorString = `[${questionVector.join(',')}]`;

        console.log('[3/5] Starting vector search queries...');
        
        const searchPromises = scope.map(({ file_id, threshold }) => {
            console.log(`  - Searching file_id: ${file_id} with threshold: ${threshold}`);
            
            return supabaseAdmin
                .rpc('match_knowledge', {
                    query_embedding: vectorString, // ← Use the vector string here
                    match_threshold: parseFloat(threshold),
                    match_count: topK,
                })
                .then(result => {
                    if (result.error) {
                        console.error(`  ❌ Error for file ${file_id}:`, result.error);
                        return { data: [], file_id, threshold, error: result.error };
                    }
                    
                    // ✅ Manually filter by file_id
                    const filteredData = (result.data || []).filter(
                        item => item.metadata?.file_id === file_id
                    );
                    
                    console.log(`  ✅ File ${file_id}: ${filteredData.length} chunks found (total from RPC: ${result.data?.length || 0})`);
                    return { 
                        data: filteredData, 
                        file_id, 
                        threshold 
                    };
                });
        });

        const results = await Promise.all(searchPromises);
        
        let combinedResults = [];
        results.forEach(({ data }) => {
            if (data && data.length > 0) {
                combinedResults.push(...data);
            }
        });

        const uniqueResults = Array.from(
            new Map(combinedResults.map(item => [item.id, item])).values()
        );
        
        // ✅ Final sort and slice uses the dynamic topK value
        const sortedResults = uniqueResults
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
        
        console.log(`[3/5] Vector search completed. Found ${sortedResults.length} relevant chunks.`);
        
        if (sortedResults.length > 0) {
            console.log(`--- Found Chunks (Top ${sortedResults.length}) ---`);
            sortedResults.forEach(r => {
                const fileId = r.metadata?.file_id || 'unknown';
                console.log(`  - [Sim: ${r.similarity.toFixed(4)}] [File: ${fileId.substring(0, 8)}...] ${r.content.substring(0, 80)}...`);
            });
            console.log('---------------------------\n');
        }

        if (strictMode && sortedResults.length === 0) {
            console.log('[4/5] Strict mode is ON and no chunks found. Returning fallback answer.');
            return res.status(200).json({ response: fallbackAnswer });
        }

        context = sortedResults.length > 0
            ? sortedResults.map(result => result.content).join('\n\n---\n\n')
            : "No context was found in the knowledge base for this question.";
        
        console.log('[4/5] Assembled context for LLM.');
    }

    const finalUserPrompt = userPromptTemplate
      .replace('{context}', context)
      .replace('{question}', question);

    console.log('--- Final Prompt to LLM ---');
    console.log("System Prompt: ", systemPrompt);
    console.log("User Prompt: ", finalUserPrompt);
    console.log('----------------------------\n');
    
    const finalStep = isManualMode ? '[2/3]' : '[5/5]';
    console.log(`${finalStep} Sending request to LLM: ${model}...`);
    let generatedResponse;
    if (model.includes('claude')) {
        const msg = await anthropic.messages.create({
            model: model,
            max_tokens: 4096,
            ...(systemPrompt && { system: systemPrompt }),
            messages: [{ role: 'user', content: finalUserPrompt }],
        });
        generatedResponse = msg.content[0].text;
    } else if (model.includes('gemini')) {
        const geminiModel = genAI.getGenerativeModel({ model: model });
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${finalUserPrompt}` : finalUserPrompt;
        const result = await geminiModel.generateContent(fullPrompt);
        generatedResponse = (await result.response).text();
    } else if (model.includes('gpt')) {
        const messages = [{ role: "user", content: finalUserPrompt }];
        if (systemPrompt) messages.unshift({ role: "system", content: systemPrompt });
        const completion = await openai.chat.completions.create({ messages, model });
        generatedResponse = completion.choices[0].message.content;
    } else {
      return res.status(400).json({ error: `Unsupported model: ${model}` });
    }
    console.log(`${finalStep.replace('2','3')} Received response from LLM.`);

    res.status(200).json({ response: generatedResponse });

  } catch (error) {
    console.error("Error in RAG query:", error);
    res.status(500).json({ error: error.message || "An internal server error occurred." });
  } finally {
    console.log('--- RAG Query End ---\n');
  }
}
