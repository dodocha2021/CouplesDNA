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
  let fileId = ""; // Declare fileId here to be accessible in catch block

  try {
    step = "parse request";
    const { record } = await req.json();
    fileId = record.id; // Assign fileId from the record
    const db = new SupabaseClient();
    
    console.log(`Processing: ${record.file_name} (ID: ${fileId})`);
    
    step = "download file";
    const buffer = await downloadFile(record.storage_path);
    console.log(`Downloaded: ${buffer.byteLength} bytes`);
    
    step = "extract text";
    const text = await extractText(buffer, record.file_name);
    console.log(`Extracted: ${text.length} characters`);
    
    step = "process chunks";
    const chunks = splitChunks(cleanText(text));
    console.log(`Created ${chunks.length} chunks`);
    
    step = "generate embeddings";
    const embeddings = await generateEmbeddings(chunks);
    console.log(`Generated ${embeddings.length} embeddings`);
    
    step = "insert vectors";
    await db.insertVectors(fileId, chunks, embeddings);
    console.log(`Inserted vectors`);
    
    step = "update status with file_id";
    await db.updateUploadRecord(fileId, 'completed', { file_id: fileId });
    console.log(`Completed successfully`);
    
    return new Response(JSON.stringify({ 
      success: true,
      chunks: chunks.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error(`Error at step: ${step}`, e.message);
    
    if (fileId) { // Only try to update status if fileId was parsed
      try {
        const db = new SupabaseClient();
        await db.updateUploadRecord(fileId, 'failed');
      } catch (dbError) {
        console.error("Failed to update status to 'failed'", dbError);
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
});
