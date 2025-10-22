import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, GetObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.374.0'

// --- Interfaces for type safety ---
interface UserUploadRecord {
  id: string;
  storage_path: string;
  user_id: string;
}

// --- Environment Variable Checks ---
const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY', // For client-side access, though service key is used here
  'SUPABASE_SERVICE_ROLE_KEY',
  'HUGGINGFACE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_R2_ACCESS_KEY_ID',
  'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
  'CLOUDFLARE_R2_BUCKET_NAME'
];
requiredEnv.forEach(v => { if (!Deno.env.get(v)) throw new Error(`Missing env var: ${v}`) });

// --- Client Initializations ---
const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${Deno.env.get('CLOUDFLARE_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')!,
  },
});

// --- Helper Functions ---

// Simple text chunking function
function chunkText(text: string, chunkSize = 256): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

// Function to get embeddings from Hugging Face
async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('HUGGINGFACE_API_TOKEN')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } })
    }
  )
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Hugging Face API error: ${response.statusText} - ${errorBody}`);
  }
  return await response.json();
}

// --- Main Server Logic ---
serve(async (req) => {
  // 1. Set up CORS headers for OPTIONS requests and response
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Get the file record from the POST request body (sent by the trigger)
    const { record } = await req.json() as { record: UserUploadRecord };

    // 3. Download the file from R2
    const command = new GetObjectCommand({
        Bucket: Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')!,
        Key: record.storage_path,
    });
    const r2Response = await R2.send(command);
    const fileContent = await r2Response.Body?.transformToString();

    if (!fileContent) {
      throw new Error('File is empty or could not be read from R2.');
    }

    // 4. Chunk the text, generate embeddings, and prepare for batch insert
    const chunks = chunkText(fileContent);
    const vectors = [];

    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk);
      vectors.push({
        user_id: record.user_id,
        content: chunk,
        embedding: embedding,
        metadata: { 
          source: 'file_upload',
          file_id: record.id,
          storage_path: record.storage_path
        }
      });
    }
    
    // 5. Insert all vectors into the database
    const { error: insertError } = await supabaseAdmin
      .from('chat_log_vectors')
      .insert(vectors);

    if (insertError) throw insertError;

    // 6. Update the status of the upload record to 'processed'
    const { error: updateError } = await supabaseAdmin
      .from('user_uploads')
      .update({ status: 'processed' })
      .eq('id', record.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ message: `Successfully processed file ${record.storage_path}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Processing error:', error);
    // Optional: Update the status to 'failed' in your database here
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
