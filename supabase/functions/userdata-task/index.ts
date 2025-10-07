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
    console.log(`📄 Processing User Upload: ${record.file_name} (ID: ${fileId})`);
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
    
    // Subsequent processing is the same
    step = "process chunks";
    console.log(`
✂️  Step 3: Chunking text...`);
    const chunks = splitChunks(cleanText(text));
    console.log(`✅ Created ${chunks.length} chunks`);
    
    step = "generate embeddings";
    console.log(`
🧠 Step 4: Generating embeddings...`);
    const embeddings = await generateEmbeddings(chunks);
    console.log(`✅ Generated ${embeddings.length} embeddings`);
    
    step = "insert vectors";
    console.log(`
💾 Step 5: Inserting vectors into database...`);
    await db.insertVectors(record.user_id, fileId, chunks, embeddings);
    console.log(`✅ All vectors inserted successfully`);
    
    step = "update status";
    await db.updateUploadRecord(fileId, 'completed', { 
      file_id: fileId,
      processed_at: new Date().toISOString(),
      chunk_count: chunks.length
    });
    console.log(`✅ Status updated to 'completed'`);
    
    console.log(`
${'='.repeat(60)}`);
    console.log(`🎉 Processing completed successfully!`);
    console.log(`${'='.repeat(60)}
`);
    
    return new Response(JSON.stringify({ 
      success: true,
      chunks: chunks.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (e) {
    // Error handling remains unchanged
    console.error(`
${'!'.repeat(60)}`);
    console.error(`💥 Error at step: ${step}`);
    console.error(`Error message: ${e.message}`);
    console.error(`${'!'.repeat(60)}
`);
    
    if (fileId) {
      try {
        const db = new SupabaseClient();
        await db.updateUploadRecord(fileId, 'failed', {
          error_message: e.message,
          error_step: step,
          failed_at: new Date().toISOString()
        });
        console.log(`✅ Status updated to 'failed' in database`);
      } catch (dbError) {
        console.error(`❌ Failed to update status: ${dbError.message}`);
      }
    }
    
    return new Response(JSON.stringify({ 
      error: e.message, 
      step: step
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});gen