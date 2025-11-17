/**
 * Service: Embeddings Generation
 * Handles text-to-vector embedding generation using HuggingFace API
 */

const EMBEDDING_MODEL = 'BAAI/bge-base-en-v1.5';

/**
 * Generate embedding vector for a given text
 * @param text - Text to generate embedding for
 * @returns Array of numbers representing the embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const hfToken = Deno.env.get("HUGGINGFACE_API_TOKEN");
  if (!hfToken) {
    throw new Error("HUGGINGFACE_API_TOKEN not configured");
  }

  console.log(`🔍 Generating embedding for text (${text.length} chars): "${text.substring(0, 100)}..."`);

  // Clean text (remove newlines)
  const cleanedText = text.replace(/\n/g, ' ');

  // Use HuggingFace router endpoint
  const response = await fetch(
    `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: cleanedText,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Ensure the output is a flat array of numbers
  let embedding: number[];
  if (Array.isArray(data) && typeof data[0] === 'number') {
    embedding = data as number[];
  } else if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === 'number') {
    embedding = data[0] as number[];
  } else {
    throw new Error("Failed to generate a valid embedding vector.");
  }

  console.log(`✅ Embedding generated successfully (${embedding.length} dimensions)`);
  return embedding;
}
