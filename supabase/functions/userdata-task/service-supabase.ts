export class SupabaseClient {
  url = Deno.env.get("SUPABASE_URL") ?? "";
  key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // 插入向量 - 添加 userId，改表名
  async insertVectors(userId, fileId, chunks, embeddings) {
    const vectors = chunks.map((chunk, i) => ({
      user_id: userId,  // 添加 user_id
      content: chunk,
      embedding: embeddings[i],
      metadata: {
        file_id: fileId,
        chunk_index: i
      }
    }));
    
    // 改表名为 chat_log_vectors
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

  // 更新上传记录 - 改表名，保持 metadata 逻辑
  async updateUploadRecord(fileId, status, metadataUpdate) {
    // 改表名为 user_uploads
    const getResponse = await fetch(
      `${this.url}/rest/v1/user_uploads?id=eq.${fileId}&select=metadata`,
      {
        method: "GET",
        headers: {
          "apikey": this.key,
          "Authorization": `Bearer ${this.key}`
        }
      }
    );

    if (!getResponse.ok) throw new Error("Failed to fetch existing metadata");
    
    const existingData = await getResponse.json();
    const existingMetadata = existingData[0]?.metadata || {};

    const updateBody = {
      status,
      metadata: {
        ...existingMetadata,
        ...metadataUpdate
      }
    };

    // 改表名为 user_uploads
    const response = await fetch(
      `${this.url}/rest/v1/user_uploads?id=eq.${fileId}`,
      {
        method: "PATCH",
        headers: {
          "apikey": this.key,
          "Authorization": `Bearer ${this.key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateBody)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update record: ${error}`);
    }
  }
}