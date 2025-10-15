// supabase/functions/knowledge-task/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { downloadFile } from "./service-r2.ts";
import { extractText } from "./extractor-files.ts";
import { splitChunks, cleanText } from "./utils-text.ts";
import { generateEmbeddings } from "./service-embeddings.ts";
import { SupabaseClient } from "./service-supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let step = "init";
  let fileId = "";

  try {
    step = "parse request";
    const { record } = await req.json();
    fileId = record.id;
    const db = new SupabaseClient();
    
    console.log(`
${'='.repeat(60)}`);
    console.log(`📄 Processing Knowledge Upload: ${record.file_name} (ID: ${fileId})`);
    console.log(`👤 User ID: ${record.user_id}`);
    console.log(`📂 Source: ${record.metadata?.source || 'file_upload'}`);
    console.log(`${'='.repeat(60)}
`);
    
    let text: string;
    
    // Check if it's a manual entry
    if (record.metadata?.source === 'manual_entry' && record.metadata?.manual_content) {
      step = "extract manual content";
      console.log(`✍️  Step 1: Using manual content (skipping R2 download)`);
      text = record.metadata.manual_content;
      console.log(`✅ Content length: ${text.length} characters`);
    } else {
      // Original file download logic
      step = "download file";
      console.log(`📥 Step 1: Downloading file from R2...`);
      const buffer = await downloadFile(record.storage_path);
      console.log(`✅ Downloaded: ${(buffer.byteLength / 1024).toFixed(2)} KB`);
      
      step = "extract text";
      console.log(`
📝 Step 2: Extracting text...`);
      text = await extractText(buffer, record.file_name);
      console.log(`✅ Extracted: ${text.length} characters`);
    }
    
    // Step 3: Clean and split text (使用新的 LangChain splitter)
    step = "process chunks";
    console.log(`
✂️  Step 3: Cleaning and splitting text...`);
    const cleanedText = cleanText(text);
    const chunks = await splitChunks(cleanedText);  // ← 注意这里添加了 await
    console.log(`✅ Created ${chunks.length} chunks`);
    
    // Step 4: Generate embeddings
    step = "generate embeddings";
    console.log(`
🧠 Step 4: Generating embeddings...`);
    const embeddings = await generateEmbeddings(chunks);
    console.log(`✅ Generated ${embeddings.length} embeddings`);
    
    // Step 5: Insert vectors into database
    step = "insert vectors";
    console.log(`
💾 Step 5: Inserting vectors into database...`);
    await db.insertVectors(fileId, chunks, embeddings);
    console.log(`✅ Inserted ${chunks.length} vectors`);
    
    // Step 6: Update upload record status
    step = "update status";
    console.log(`
📊 Step 6: Updating upload record status...`);
    await db.updateUploadRecord(fileId, "completed", {
      chunks_count: chunks.length,
      processed_at: new Date().toISOString()
    });
    console.log(`✅ Status updated to 'completed'`);
    
    console.log(`
${'='.repeat(60)}`);
    console.log(`✨ Successfully processed: ${record.file_name}`);
    console.log(`${'='.repeat(60)}
`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        fileId, 
        chunksCount: chunks.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error(`
❌ Error at step '${step}':`, error);
    
    // Try to update the record status to 'failed'
    if (fileId) {
      try {
        const db = new SupabaseClient();
        await db.updateUploadRecord(fileId, "failed", {
          error_message: error.message,
          failed_at: new Date().toISOString(),
          failed_step: step
        });
        console.log(`📝 Updated record status to 'failed'`);
      } catch (updateError) {
        console.error(`❌ Failed to update error status:`, updateError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        step,
        fileId 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
