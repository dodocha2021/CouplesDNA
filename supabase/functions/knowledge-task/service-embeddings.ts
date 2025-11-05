// 辅助函数：延迟
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 核心 API 调用函数
async function callHuggingFaceAPI(texts: string[], retryCount = 0): Promise<number[][]> {
  const apiKey = Deno.env.get("HUGGINGFACE_API_TOKEN") ?? "";

  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/BAAI/bge-base-en-v1.5",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: texts
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    const errorObj: any = new Error(`HuggingFace API error: ${response.status} - ${error}`);
    errorObj.status = response.status;
    errorObj.retryCount = retryCount;
    throw errorObj;
  }

  return await response.json();
}

// 主函数：支持分批和自适应 batch size
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const startTime = Date.now();
  console.log(`\n📊 Total texts to process: ${texts.length}`);

  // 初始 batch size = 400（优化后，避免超时）
  let batchSize = 400;
  let allEmbeddings: number[][] = [];
  let processedCount = 0;

  let i = 0;
  while (i < texts.length) {
    const batch = texts.slice(i, i + batchSize);
    const currentBatchNum = Math.floor(i / batchSize) + 1;
    const estimatedTotalBatches = Math.ceil((texts.length - processedCount) / batchSize) + Math.floor(processedCount / batchSize);

    console.log(`🔄 Batch ${currentBatchNum}: Processing ${batch.length} texts (batch size: ${batchSize}, ${processedCount}/${texts.length} done)`);

    let success = false;
    let retries = 3;

    while (!success && retries > 0) {
      try {
        const embeddings = await callHuggingFaceAPI(batch, 3 - retries);
        allEmbeddings.push(...embeddings);
        processedCount += batch.length;
        success = true;

        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.ceil(((texts.length - processedCount) / batchSize) * 6);
        console.log(`✅ Batch done (${processedCount}/${texts.length}) [${elapsed}s elapsed, ~${remaining}s remaining]`);

      } catch (error: any) {
        const errorStatus = error.status;

        // 504 超时或 500 服务器错误 - 尝试减小 batch size
        if (errorStatus === 504 || errorStatus === 500) {
          if (batchSize > 20) {
            const oldBatchSize = batchSize;
            batchSize = Math.max(20, Math.floor(batchSize * 0.5)); // 减半
            console.log(`⚠️  Error ${errorStatus}! Reducing batch size: ${oldBatchSize} → ${batchSize}`);
            continue; // 用新的 batch size 重新处理当前批次
          } else {
            console.error(`❌ Failed with smallest batch size (20)`);
            throw error;
          }
        }

        // 410 或其他错误 - 重试
        retries--;
        if (retries > 0) {
          const waitTime = (4 - retries) * 2000; // 2s, 4s, 6s
          console.log(`⚠️  Error ${errorStatus}, retrying in ${waitTime/1000}s... (${retries} left)`);
          await delay(waitTime);
        } else {
          console.error(`❌ Batch failed after all retries`);
          throw error;
        }
      }
    }

    // 移动到下一批
    i += batchSize;

    // 批次之间延迟 100ms（优化后，减少总时间）
    if (i < texts.length) {
      await delay(100);
    }
  }

  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  console.log(`✨ All embeddings generated: ${allEmbeddings.length} vectors in ${totalTime}s`);
  return allEmbeddings;
}
