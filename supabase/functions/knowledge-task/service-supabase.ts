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
      upload_id: fileId,
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
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
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
      `${this.url}/rest/v1/knowledge_uploads?id=eq.${fileId}&select=metadata`,
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
      `${this.url}/rest/v1/knowledge_uploads?id=eq.${fileId}`,
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
