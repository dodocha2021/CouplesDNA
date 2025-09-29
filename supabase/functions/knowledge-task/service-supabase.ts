export class SupabaseClient {
  private url = Deno.env.get("SUPABASE_URL") ?? "";
  private key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  async insertVectors(
    fileId: string, 
    chunks: string[], 
    embeddings: number[][]
  ): Promise<void> {
    const vectors = chunks.map((chunk, i) => ({
      content: chunk,
      embedding: embeddings[i],
      metadata: { 
        file_id: fileId, 
        chunk_index: i 
      }
    }));
    
    const response = await fetch(`${this.url}/rest/v1/knowledge_vectors`, {
      method: "POST",
      headers: {
        "apikey": this.key,
        "Authorization": `Bearer ${this.key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(vectors)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to insert vectors: ${error}`);
    }
  }

  async updateStatus(fileId: string, status: string): Promise<void> {
    const response = await fetch(
      `${this.url}/rest/v1/knowledge_uploads?id=eq.${fileId}`,
      {
        method: "PATCH",
        headers: {
          "apikey": this.key,
          "Authorization": `Bearer ${this.key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update status: ${error}`);
    }
  }
}