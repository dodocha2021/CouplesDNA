import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { HfInference } from 'https://esm.sh/@huggingface/inference@2';
import { S3Client, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3";
import { cleanText, splitChunks } from './utils-text.ts';
// ... 其他导入

serve(async (req) => {
  try {
    // ... 前面的代码保持不变，直到获取文本内容

    // 假设你已经有了 fileContent (文本内容)
    console.log("Step 3: Cleaning and splitting text");
    const cleanedText = cleanText(fileContent);
    
    // 使用新的 splitChunks (现在是异步的)
    const chunks = await splitChunks(cleanedText);  // ← 注意添加 await
    console.log(`Text split into ${chunks.length} chunks`);

    // ... 后面的代码保持不变
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});