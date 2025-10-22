import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.310.0";
import { RecursiveCharacterTextSplitter } from "https://esm.sh/langchain/text_splitter";
import { HfInference } from "https://esm.sh/@huggingface/inference@2.6.1";

// --- Helper: Read stream to string ---
async function streamToString(stream) {
  const reader = stream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(new Uint8Array(chunks.reduce((acc, chunk) => acc.concat(Array.from(chunk)), [])));
}

// --- Main Server Logic ---
serve(async (req) => {
  console.log("Function received a request.");

  // Add CORS headers to the response
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Respond to OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let payload;
  let fileId;
  let storagePath;

  try {
    // First, log the raw body to see what we are receiving
    const rawBody = await req.text();
    console.log("Raw request body:", rawBody);

    // Now, try to parse it
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      // Return a 400 Bad Request if JSON is malformed
      return new Response(JSON.stringify({ error: "Invalid JSON format in request body." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Parsed payload:", payload);
    
    // Validate the payload structure
    if (!payload.record || !payload.record.id || !payload.record.storage_path) {
        console.error("Invalid payload structure. Missing 'record', 'record.id', or 'record.storage_path'.");
        return new Response(JSON.stringify({ error: "Invalid payload structure." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }

    fileId = payload.record.id;
    storagePath = payload.record.storage_path;
    console.log(`Processing fileId: ${fileId}, storagePath: ${storagePath}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const hf = new HfInference(Deno.env.get("HUGGINGFACE_API_TOKEN"));

    const r2 = new S3Client({
        region: "auto",
        endpoint: `https://${Deno.env.get("CLOUDFLARE_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID") ?? "",
            secretAccessKey: Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY") ?? "",
        },
    });
    
    console.log("Step 1: Updating status to 'processing'");
    const { error: updateError } = await supabaseAdmin
      .from("user_uploads")
      .update({ status: "processing" })
      .eq("id", fileId);

    if (updateError) {
        console.error("Error updating status to processing:", updateError);
        throw new Error(`Failed to update status to processing for fileId ${fileId}: ${updateError.message}`);
    }

    console.log("Step 2: Downloading file from R2");
    const command = new GetObjectCommand({
        Bucket: Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME"),
        Key: storagePath,
    });
    const { Body: fileStream } = await r2.send(command);
    if (!fileStream) {
        throw new Error("File stream from R2 is empty.");
    }
    const fileContent = await streamToString(fileStream);
    console.log("File content downloaded successfully.");

    console.log("Step 3: Splitting text into chunks");
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });
    const chunks = await splitter.splitText(fileContent);
    console.log(`Text split into ${chunks.length} chunks.`);

    console.log("Step 4: Generating embeddings");
    const embeddings = await hf.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: chunks
    });
    console.log("Embeddings generated successfully.");

    const vectors = [];
    for(let i = 0; i < chunks.length; i++) {
        vectors.push({
            content: chunks[i],
            embedding: embeddings[i],
            metadata: {
                file_id: fileId,
                chunk_index: i
            }
        });
    }

    console.log("Step 5: Inserting vectors into database");
    const { error: insertError } = await supabaseAdmin.from("knowledge_vectors").insert(vectors);
    if (insertError) {
        console.error("Error inserting vectors:", insertError);
        throw new Error(`Failed to insert vectors: ${insertError.message}`);
    }

    console.log("Step 6: Updating status to 'processed'");
    await supabaseAdmin
      .from("user_uploads")
      .update({ status: "processed" })
      .eq("id", fileId);

    console.log("Processing complete for fileId:", fileId);

    return new Response(JSON.stringify({ message: "Processing complete" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("--- FULL ERROR ---");
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    
    // Attempt to update the status to "failed" in the database
    if (fileId) {
        const supabaseAdminForError = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        console.log(`Attempting to update status to 'failed' for fileId: ${fileId}`);
        await supabaseAdminForError
            .from("user_uploads")
            .update({ status: "failed" })
            .eq("id", fileId);
    }
    
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
