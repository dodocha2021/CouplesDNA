
// This script is designed to be run from your terminal.
// Usage: node ingest-knowledge-sdk.js
// This is the definitive solution, using the official @huggingface/inference SDK as suggested by the user.

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const fs = require('fs/promises');
const { HfInference } = require('@huggingface/inference');

// --- Configuration (The SDK Approach) ---
const KNOWLEDGE_FILE_PATH = 'knowledge.txt';
const MODEL_NAME = 'sentence-transformers/all-mpnet-base-v2'; // User-selected model

// --- Get environment variables ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const hfToken = process.env.HUGGINGFACE_API_TOKEN;

// --- Initialize the official Hugging Face SDK ---
const hf = new HfInference(hfToken);

/**
 * Generates an embedding using the official Hugging Face Inference SDK.
 * This abstracts away all the complexities of URLs and payload formats.
 */
async function getEmbedding(text) {
  const cleanedText = text.replace(/\n/g, ' ');

  try {
    // The SDK's `featureExtraction` method is the correct tool for this job.
    const embedding = await hf.featureExtraction({
      model: MODEL_NAME,
      inputs: cleanedText
    });

    // The SDK returns the vector directly, but let's ensure it's in the expected format.
    if (Array.isArray(embedding) && typeof embedding[0] === 'number') {
      return embedding;
    }
    // Some pipelines might still nest it, so we handle that case.
    else if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
        return embedding[0];
    }

    throw new Error(`SDK returned an unexpected data structure: ${JSON.stringify(embedding)}`);

  } catch (error) {
    console.error("Error generating embedding via SDK:", error);
    throw error; // Propagate the error to stop the ingestion process
  }
}

// --- Main script logic ---
async function runIngestion() {
  if (!supabaseUrl || !supabaseServiceKey || !hfToken) {
    console.error("Missing environment variables. Please check your .env.local file.");
    return;
  }

  console.log(`Starting knowledge ingestion using the official HF SDK and model '${MODEL_NAME}'...`);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  let fileContent;
  try {
    fileContent = await fs.readFile(KNOWLEDGE_FILE_PATH, 'utf-8');
    console.log(`Successfully read ${KNOWLEDGE_FILE_PATH}.`);
  } catch (error) {
    console.error(`Failed to read file: ${KNOWLEDGE_FILE_PATH}`, error);
    return;
  }

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 384, chunkOverlap: 40 });
  const chunks = await splitter.createDocuments([fileContent]);
  console.log(`Text split into ${chunks.length} chunks.`);

  console.log("Embedding chunks and inserting into Supabase...");
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const content = chunk.pageContent;
    try {
      const embedding = await getEmbedding(content);
      const { error } = await supabase
        .from('knowledge_vectors')
        .insert({ content: content, embedding: embedding, metadata: { model: MODEL_NAME, source: KNOWLEDGE_FILE_PATH } });
      if (error) throw error;
      console.log(`[${i + 1}/${chunks.length}] Successfully embedded and inserted chunk.`);
    } catch (error) {
      console.error(`[${i + 1}/${chunks.length}] Failed to process chunk. Stopping.`);
      break;
    }
  }
  console.log("\n--- Ingestion complete! ---");
}

runIngestion();
