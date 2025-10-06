export class SupabaseClient {
  private url = Deno.env.get("SUPABASE_URL") ?? "";
  private key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  async insertVectors(
    userId: string,
    fileId: string, 
    chunks: string[], 
    embeddings: number[][]
  ): Promise<void> {
    const vectors = chunks.map((chunk, i) => ({
      user_id: userId,
      content: chunk,
      embedding: embeddings[i],
      metadata: { 
        file_id: fileId, 
        chunk_index: i 
      }
    }));
    
    const response = await fetch(`${this.url}/rest/v1/chat_log_vectors`, {
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

  async updateUploadRecord(
    fileId: string,
    status: string,
    metadataUpdate?: Record<string, any>
  ): Promise<void> {
    const getResponse = await fetch(
      `${this.url}/rest/v1/user_uploads?id=eq.${fileId}&select=metadata`,
      {
        method: "GET",
        headers: { "apikey": this.key, "Authorization": `Bearer ${this.key}` },
      }
    );
    if (!getResponse.ok) throw new Error("Failed to fetch existing metadata");
    const existingData = await getResponse.json();
    const existingMetadata = existingData[0]?.metadata || {};

    const updateBody = {
      status,
      metadata: { ...existingMetadata, ...metadataUpdate },
    };

    const response = await fetch(
      `${this.url}/rest/v1/user_uploads?id=eq.${fileId}`,
      {
        method: "PATCH",
        headers: {
          "apikey": this.key,
          "Authorization": `Bearer ${this.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateBody),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update record: ${error}`);
    }
  }
}
