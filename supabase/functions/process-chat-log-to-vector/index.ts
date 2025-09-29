import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.6.4'

// Initialize Hugging Face client using the environment secret
const hf = new HfInference(Deno.env.get('HUGGINGFACE_API_TOKEN'))
const embeddingModel = 'sentence-transformers/all-mpnet-base-v2'

console.log('Edge Function Initialized with model:', embeddingModel)

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const { record } = await req.json()
    console.log(`Processing record for user: ${record.user_id}`)

    if (!record || !record.content || !record.user_id) {
        console.error("Bad Request: Missing essential data in record.", record)
        return new Response('Bad Request: Missing record data (content or user_id)', { status: 400 })
    }

    // 1. Generate the embedding for the chat content
    const embedding = await hf.featureExtraction({
      model: embeddingModel,
      inputs: record.content.replace(/\n/g, ' '),
    })
    console.log('Embedding generated successfully.')

    // 2. Create a Supabase client with the service_role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    console.log('Supabase client initialized.')

    // 3. Insert the new vector into the chat_log_vectors table
    const { error } = await supabaseClient.from('chat_log_vectors').insert({
      user_id: record.user_id,
      content: record.content,
      embedding: embedding,
      metadata: { // Pass through relevant metadata from the source
        type: record.type, 
        session_id: record.session_id,
        speaker: record.speaker
      }
    })

    if (error) {
      console.error('Supabase insert error:', error)
      throw error
    }
    
    console.log(`Successfully inserted vector for user: ${record.user_id}`)

    return new Response(JSON.stringify({ message: 'Vector processed and stored successfully.' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Critical error in Edge Function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
