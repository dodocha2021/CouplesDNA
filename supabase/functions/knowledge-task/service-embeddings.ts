export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = Deno.env.get("HUGGINGFACE_API_TOKEN") ?? "";

  // Use new HuggingFace router endpoint
  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/BAAI/bge-base-en-v1.5",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: texts })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HuggingFace API error: ${response.status} - ${error}`);
  }

  return await response.json();
}