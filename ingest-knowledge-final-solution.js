
// This script is designed to be run from your terminal.
// Usage: node ingest-knowledge-final-solution.js
// This script implements the final, evidence-based solution.

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const fs = require('fs/promises');
const axios = require('axios');

// --- Configuration ---
const KNOWLEDGE_FILE_PATH = 'knowledge.txt';
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

// --- Get environment variables ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const hfToken = process.env.HUGGINGFACE_API_TOKEN;

// --- Utility to introduce a delay ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * The definitive `getEmbedding` function.
 * Based on unambiguous debug logs, the API requires a `sentences` key with a string array.
 */
async function getEmbedding(text) {
  const cleanedText = text.replace(/\n/g, ' ');
  const headers = {
    Authorization: `Bearer ${hfToken}`,
    'Content-Type': 'application/json'
  };
  
  // The API explicitly and consistently requested the `sentences` parameter.
  // The payload is now definitively correct.
  const payload = {
    sentences: [cleanedText],
    options: { wait_for_model: true }
  };

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await axios.post(HUGGINGFACE_API_URL, payload, { headers });
      
      // This model returns the embedding as a 2D array: [[vector]]
      if (response.data && Array.isArray(response.data) && Array.isArray(response.data[0])) {
        return response.data[0]; // Return the inner vector array.
      }
      
      throw new Error(`API returned an unexpected data structure: ${JSON.stringify(response.data)}`);
      
    } catch (error) {
      const errorMsg = error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message;
      console.warn(`Attempt ${i + 1}/${MAX_RETRIES} failed: ${errorMsg}`);
      
      if (i < MAX_RETRIES - 1) {
        console.log(`Waiting ${RETRY_DELAY_MS / 1000}s before retrying...`);
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error("All retry attempts failed.");
        throw new Error(`Failed after ${MAX_RETRIES} retries: ${errorMsg}`);
      }
    }
  }
}

// --- Main script logic ---
async function runIngestion() {
  if (!supabaseUrl || !supabaseServiceKey || !hfToken) {
    console.error("Missing environment variables. Please check your .env.local file.");
    return;
  }

  console.log("Starting final knowledge ingestion with the evidence-based payload...");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  let fileContent;
  try {
    fileContent = await fs.readFile(KNOWLEDGE_FILE_PATH, 'utf-8');
    console.log(`Successfully read ${KNOWLEDGE_FILE_PATH}.`);
  } catch (error) {
    console.error(`Failed to read file: ${KNOWLEDGE_FILE_PATH}`, error);
    return;
  }

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 512, chunkOverlap: 50 });
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
        .insert({ content: content, embedding: embedding, metadata: { source_type: 'basic_knowledge', source_file: KNOWLEDGE_FILE_PATH } });
      if (error) throw error;
      console.log(`[${i + 1}/${chunks.length}] Successfully embedded and inserted chunk.`);
    } catch (error) {
      console.error(`[${i + 1}/${chunks.length}] Failed to process chunk. Stopping.`);
      break; // Stop the loop on the first failure.
    }
  }
  console.log("\n--- Ingestion complete! ---");
}

runIngestion();
