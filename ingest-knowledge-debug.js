
// This script is designed to be run from your terminal.
// Usage: node ingest-knowledge-debug.js
// This script implements the user's debugging methodology: go back to the original endpoint and add detailed logging.

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const fs = require('fs/promises');
const axios = require('axios');

// --- Configuration (User-directed Debugging) ---
const KNOWLEDGE_FILE_PATH = 'knowledge.txt';
// Go back to the original model endpoint as requested.
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';
const MAX_RETRIES = 1; // We only need one attempt to see the logs.

// --- Get environment variables ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const hfToken = process.env.HUGGINGFACE_API_TOKEN;

/**
 * This `getEmbedding` function implements the user's debugging request.
 * It adds detailed console logs for the request payload and the full response data.
 * It also attempts to handle multiple possible successful response formats.
 */
async function getEmbedding(text) {
  const cleanedText = text.replace(/\n/g, ' ');
  const headers = {
    Authorization: `Bearer ${hfToken}`,
    'Content-Type': 'application/json'
  };
  
  // We will start with the most basic payload and let the logs guide us.
  const payload = {
    inputs: cleanedText,
    options: { wait_for_model: true }
  };

  // Add detailed logging as requested by the user.
  console.log('Request payload:', JSON.stringify(payload));

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await axios.post(HUGGINGFACE_API_URL, payload, { headers });
      
      // Add detailed logging as requested by the user.
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data));

      // Handle potential response formats as suggested by the user.
      if (response.data && Array.isArray(response.data)) {
        // Format: [[vector]]
        if (Array.isArray(response.data[0])) {
          console.log('Detected [[vector]] format.');
          return response.data[0];
        }
        // Format: [vector] (less common for this model, but good to handle)
        if (typeof response.data[0] === 'number') {
          console.log('Detected [vector] format.');
          return response.data;
        }
      }
      
      throw new Error(`Invalid or unexpected response structure`);
      
    } catch (error) {
      const errorMsg = error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message;
      console.error(`Request failed on attempt ${i + 1}: ${errorMsg}`);
      // We will let the main loop catch this and stop.
      throw error;
    }
  }
}

// --- Main script logic ---
async function runIngestion() {
  if (!supabaseUrl || !supabaseServiceKey || !hfToken) {
    console.error("Missing environment variables. Please check your .env.local file.");
    return;
  }

  console.log("Starting knowledge ingestion with detailed debugging...");
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

  console.log("Attempting to embed a single chunk for debugging...");
  if (chunks.length > 0) {
    const content = chunks[0].pageContent;
    try {
      const embedding = await getEmbedding(content);
      console.log("Successfully generated embedding. Embedding starts with: ", embedding.slice(0, 5));
      // We will not insert into the database during this debug run.
      // const { error } = await supabase.from('knowledge_vectors').insert({ content, embedding });
      // if (error) throw error;
      console.log("Debug run successful. Data was not inserted into Supabase.");
    } catch (error) {
      console.error("Debug run failed. Could not generate embedding.");
    }
  } else {
    console.log("No chunks to process.");
  }
  console.log("\n--- Debugging complete! ---");
}

runIngestion();
