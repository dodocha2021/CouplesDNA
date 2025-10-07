import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
const embeddingModel = 'BAAI/bge-base-en-v1.5';

// Function to generate embeddings
export async function generateEmbedding(text) {
  const cleanedText = text.replace(/\n/g, ' ');
  const response = await hf.featureExtraction({
    model: embeddingModel,
    inputs: cleanedText,
  });
  // Ensure the output is a flat array of numbers
  if (Array.isArray(response) && typeof response[0] === 'number') return response;
  if (Array.isArray(response) && Array.isArray(response[0]) && typeof response[0][0] === 'number') return response[0];
  
  throw new Error("Failed to generate a valid embedding vector.");
}
