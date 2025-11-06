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
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`✨ All ${vectors.length} vectors inserted successfully`);
  }

  /**
   * 带全局索引的向量插入方法，支持segmented processing
   * 自适应重试：400 → 200 → 100 → 50
   */
  async insertVectorsWithIndex(
    fileId: string,
    chunksWithIndex: Array<{ content: string; index: number }>,
    embeddings: number[][]
  ): Promise<void> {
    const vectors = chunksWithIndex.map((chunk, i) => ({
      content: chunk.content,
      embedding: embeddings[i],
      upload_id: fileId,
      metadata: {
        file_id: fileId,
        chunk_index: chunk.index  // 使用全局chunk索引
      }
    }));

    console.log(`📦 Inserting ${vectors.length} vectors with adaptive batch size`);

    await this.insertVectorsAdaptive(vectors);

    console.log(`✅ Inserted ${vectors.length} vectors`);
  }

  /**
   * 自适应批量插入：支持batch size降级和重试
   */
  private async insertVectorsAdaptive(
    vectors: Array<{
      content: string;
      embedding: number[];
      upload_id: string;
      metadata: { file_id: string; chunk_index: number };
    }>
  ): Promise<void> {
    const batchSizes = [400, 200, 100, 50]; // 降级策略
    let currentBatchSizeIndex = 0;
    let batchSize = batchSizes[currentBatchSizeIndex];

    const totalBatches = Math.ceil(vectors.length / batchSize);
    console.log(`📦 Inserting ${vectors.length} vectors in ${totalBatches} batches (initial batch size: ${batchSize})`);

    let i = 0;
    while (i < vectors.length) {
      const batch = vectors.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;

      console.log(`💾 Inserting batch ${batchNum} (${batch.length} vectors, batch size: ${batchSize})...`);

      try {
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
          throw new Error(`Failed to insert: ${error}`);
        }

        console.log(`✅ Batch ${batchNum} inserted (${i + batch.length}/${vectors.length} total)`);

        // 成功：继续下一批
        i += batchSize;

        // 批次之间延迟200ms（最后一批不需要延迟）
        if (i < vectors.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Batch ${batchNum} failed: ${errorMsg}`);

        // 如果是超时错误，尝试降级batch size
        if (errorMsg.includes('57014') || errorMsg.includes('timeout')) {
          if (currentBatchSizeIndex < batchSizes.length - 1) {
            // 降级到更小的batch size
            currentBatchSizeIndex++;
            batchSize = batchSizes[currentBatchSizeIndex];

            console.log(`🔄 Reducing batch size to ${batchSize}, waiting 1 second before retry...`);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 不增加 i，重试当前batch（用新的batch size）
            continue;
          } else {
            // 已经是最小batch size还失败，抛出错误
            throw new Error(`Failed to insert vectors even with smallest batch size (${batchSize}): ${errorMsg}`);
          }
        } else {
          // 非超时错误，直接抛出
          throw error;
        }
      }
    }

    console.log(`✨ All ${vectors.length} vectors inserted successfully`);
  }

  /**
   * 更新上传记录状态，支持重试机制
   */
  async updateUploadRecord(
    fileId: string,
    status: string,
    metadataUpdate?: Record<string, any>
  ): Promise<void> {
    const maxRetries = 5;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 第1步：获取现有metadata
        const getResponse = await fetch(
          `${this.url}/rest/v1/knowledge_uploads?id=eq.${fileId}&select=metadata`,
          {
            method: "GET",
            headers: { "apikey": this.key, "Authorization": `Bearer ${this.key}` },
          }
        );

        if (!getResponse.ok) {
          throw new Error("Failed to fetch existing metadata");
        }

        const existingData = await getResponse.json();
        const existingMetadata = existingData[0]?.metadata || {};

        // 第2步：合并并更新
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

        // 成功，返回
        if (attempt > 1) {
          console.log(`✅ Update succeeded on attempt ${attempt}`);
        }
        return;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMsg = lastError.message;

        console.error(`❌ Update attempt ${attempt}/${maxRetries} failed: ${errorMsg}`);

        // 如果还有重试机会，等待后重试
        if (attempt < maxRetries) {
          const waitTime = attempt * 1000; // 1s, 2s, 3s, 4s, 5s
          console.log(`🔄 Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // 所有重试都失败
    throw new Error(`Failed to update record after ${maxRetries} attempts: ${lastError?.message}`);
  }
}
