
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
const embeddingModel = 'sentence-transformers/all-mpnet-base-v2';

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

  console.log('\n--- RAG Query Start ---');

  try {
    const {
      question,
      systemPrompt,
      userPromptTemplate,
      model,
      scope, // Array of {id, threshold} - Used for Vector Search
      manualContext, // Optional string - Used for Manual Run
      topK = 5,
      strictMode = false,
      fallbackAnswer = "I could not find an answer in the provided knowledge base.",
    } = req.body;
    
    let context = '';
    const isManualMode = manualContext !== undefined;

    if (isManualMode) {
        // MANUAL MODE: Use the user-provided context directly
        console.log('[1/3] Running in MANUAL mode.');
        context = manualContext;
        console.log('[1/3] Using provided manual context.');

    } else {
        // VECTOR SEARCH MODE: Go through the RAG retrieval process
        console.log('\n--- RAG Query Start ---');
        console.log(`[1/5] Received question: "${question}" for model ${model}`);
        console.log(`[1/5] Scope includes ${scope?.length || 0} items. Strict Mode: ${strictMode}.`);

        if (!question || !Array.isArray(scope) || scope.length === 0) {
          return res.status(400).json({ error: "A question and a valid search scope are required for vector search." });
        }

        const questionVector = await getEmbedding(question);
        console.log('[2/5] Successfully vectorized question.');

        const groupedByThreshold = scope.reduce((acc, item) => {
            const { id, threshold } = item;
            if (!acc[threshold]) acc[threshold] = [];
            acc[threshold].push(id);
            return acc;
        }, {});

        console.log('[3/5] Starting parallel vector search queries...');
        const searchPromises = Object.entries(groupedByThreshold).map(([threshold, ids]) => {
            return supabaseAdmin.rpc('match_knowledge', {
                query_embedding: questionVector,
                match_threshold: parseFloat(threshold),
                match_count: topK,
            }).in('id', ids);
        });

        const promiseResults = await Promise.allSettled(searchPromises);
        let combinedResults = [];
        promiseResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value.data) {
                combinedResults.push(...result.value.data);
            } else if (result.status === 'rejected') {
                console.error("A parallel vector search query failed:", result.reason);
            }
        });

        const uniqueResults = Array.from(new Map(combinedResults.map(item => [item.id, item])).values());
        const sortedResults = uniqueResults.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
        
        console.log(`[3/5] Vector search completed. Found ${sortedResults.length} relevant chunks.`);
        if (sortedResults.length > 0) {
            console.log(`--- Found Chunks (Top ${sortedResults.length}) ---`);
            sortedResults.forEach(r => console.log(`  - [Sim: ${r.similarity.toFixed(4)}] [Src: ${r.source}] ${r.content.substring(0, 80)}...`));
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

    // --- The rest of the process is common for both modes ---

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
