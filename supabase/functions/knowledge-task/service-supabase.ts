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

    // 分批插入，每批 400 条
    const batchSize = 400;
    const totalBatches = Math.ceil(vectors.length / batchSize);

    console.log(`📦 Inserting ${vectors.length} vectors in ${totalBatches} batches (batch size: ${batchSize})`);

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;

      console.log(`💾 Inserting batch ${batchNum}/${totalBatches} (${batch.length} vectors)...`);

      const response = await fetch(`${this.url}/rest/v1/knowledge_vectors`, {
        method: "POST",
        headers: {
          "apikey": this.key,
          "Authorization": `Bearer ${this.key}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(batch)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to insert vectors batch ${batchNum}/${totalBatches}: ${error}`);
      }

      console.log(`✅ Batch ${batchNum}/${totalBatches} inserted (${i + batch.length}/${vectors.length} total)`);

      // 批次之间短暂延迟，避免数据库压力过大（最后一批不需要延迟）
      if (i + batchSize < vectors.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✨ All ${vectors.length} vectors inserted successfully`);
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
