// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { CohereClient } from 'npm:cohere-ai'
import PDF from 'npm:pdf-parse'

console.log("Process Chat Log to Vector Function Loaded!")

// Function to extract text from PDF with timeout
async function extractPdfText(fileBlob: Blob): Promise<string> {
  try {
    const arrayBuffer = await fileBlob.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('PDF processing timeout after 30 seconds')), 30000)
    })
    
    // Race between PDF parsing and timeout
    const data = await Promise.race([
      PDF(buffer),
      timeoutPromise
    ])
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('No text content found in PDF')
    }
    
    return data.text.trim()
  } catch (error) {
    console.error('PDF text extraction error:', error)
    if (error.message?.includes('timeout')) {
      throw new Error('PDF file too complex to process (timeout)')
    }
    throw new Error(`Failed to extract text from PDF: ${error.message}`)
  }
}

// Function to split text into chunks - prioritizes chunk size over line boundaries
function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = []
  
  // For large files, use character-based splitting to avoid too many chunks
  if (text.length > chunkSize * 2) {
    // Simple character-based splitting for efficiency
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize).trim()
      if (chunk.length > 0) {
        chunks.push(chunk)
      }
    }
    return chunks
  }
  
  // For smaller files, try line-based splitting but enforce chunk size limit
  const lines = text.split('\n')
  let currentChunk = ''
  
  for (const line of lines) {
    // If adding this line would exceed chunk size, save current chunk
    if (currentChunk.length + line.length + 1 > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = line
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks.filter(chunk => chunk.length > 0) // Remove empty chunks
}

Deno.serve(async (req) => {
  try {
    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const cohereApiKey = Deno.env.get('COHERE_API_KEY')!

    if (!supabaseUrl || !supabaseKey || !cohereApiKey) {
      throw new Error(`Missing required environment variables: ${!supabaseUrl ? 'SUPABASE_URL ' : ''}${!supabaseKey ? 'SUPABASE_ANON_KEY ' : ''}${!cohereApiKey ? 'COHERE_API_KEY ' : ''}`)
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey)
    const cohereClient = new CohereClient({ token: cohereApiKey })

    // Parse trigger payload from database
    const payload = await req.json()
    console.log('Received payload:', payload)

    const record = payload.record
    if (!record) {
      return new Response(
        JSON.stringify({ error: 'Missing record in payload' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const filePath = record.name || record.path
    const bucketName = record.bucket_id || 'chat-logs'

    // Extract user_id from file path 
    // Format can be: users/user_id/filename OR user_id/filename
    const pathParts = filePath.split('/')
    let userId = null
    
    if (pathParts.length >= 2 && pathParts[0] === 'users') {
      // Format: users/user_id/filename
      userId = pathParts[1]
    } else if (pathParts.length >= 2) {
      // Format: user_id/filename (direct user folder)
      userId = pathParts[0]
    } else {
      console.log(`Unable to extract user_id from path: ${filePath}`)
      return new Response(
        JSON.stringify({ message: "Unable to extract user_id, skipping file" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    console.log(`Processing file: ${filePath} for user: ${userId}`)

    // Download file content from Storage
    const { data: fileBlob, error: downloadError } = await supabaseClient.storage
      .from(bucketName)
      .download(filePath)

    if (downloadError) {
      console.error('Storage download error:', downloadError)
      console.error('Download error details:', JSON.stringify(downloadError, null, 2))
      
      // Return a successful response but don't process the file
      return new Response(
        JSON.stringify({ 
          status: "error",
          error_type: "download_failed",
          message: "File download failed - file may not exist or be accessible",
          data: {
            error_detail: downloadError.message,
            file_path: filePath,
            user_id: userId
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // Check file size (different limits for different file types)
    const fileName = filePath.toLowerCase();
    const maxFileSize = fileName.endsWith('.pdf') ? 2 * 1024 * 1024 : 5 * 1024 * 1024 // 2MB for PDF, 5MB for text files
    if (fileBlob.size > maxFileSize) {
      console.log(`File too large: ${fileBlob.size} bytes, skipping`)
      const maxSizeLabel = fileName.endsWith('.pdf') ? "2MB" : "5MB"
      const tooLargeResponse = { 
        status: "error",
        error_type: "file_too_large",
        message: "File too large for processing",
        data: {
          max_size: maxSizeLabel,
          current_size: `${Math.round(fileBlob.size / 1024)}KB`,
          file_path: filePath,
          user_id: userId
        }
      };
      console.log('EDGE_FUNCTION_RESPONSE (file_too_large):', JSON.stringify(tooLargeResponse, null, 2));
      return new Response(
        JSON.stringify(tooLargeResponse),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // Handle different file types
    let fileContent = '';
    
    try {
      if (fileName.endsWith('.pdf')) {
        console.log('Extracting text from PDF file...')
        fileContent = await extractPdfText(fileBlob)
        console.log(`Extracted ${fileContent.length} characters from PDF`)
      } else {
        // For text-based files, use standard text extraction
        fileContent = await fileBlob.text()
      }
    } catch (extractionError) {
      console.error('File content extraction error:', extractionError)
      return new Response(
        JSON.stringify({ 
          status: "error",
          error_type: "extraction_failed",
          message: `Failed to extract content from file: ${extractionError.message}`,
          data: {
            file_path: filePath,
            user_id: userId,
            file_type: fileName.endsWith('.pdf') ? 'PDF' : 'Text',
            error_details: extractionError.message
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }
    
    if (!fileContent || fileContent.trim().length === 0) {
      console.log('File is empty, skipping')
      return new Response(
        JSON.stringify({ 
          status: "error",
          error_type: "file_empty",
          message: "File is empty, skipping",
          data: {
            file_path: filePath,
            user_id: userId
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // Intelligent classification (supports multiple languages)
    const contentSnippet = fileContent.substring(0, 3000) // First 3000 characters for classification
    
    const classificationPrompt = `You are an expert text classifier. Analyze the following text and determine if it contains chat/conversation logs (including WhatsApp, Telegram, WeChat, SMS, or any messaging platform).

Look for patterns like:
- Timestamps and user names/numbers
- Message exchanges between people
- Conversation threads
- Messaging app formatting

Respond with ONLY "CHAT" if it's a chat/conversation log, or "OTHER" if it's not.

Text to analyze:
"""
${contentSnippet}
"""`

    console.log('Starting classification...')
    
    const classificationResponse = await cohereClient.chat({
      message: classificationPrompt,
      temperature: 0,
      maxTokens: 5,
    })

    const classification = classificationResponse.text?.trim().toUpperCase()
    
    console.log(`Classification result: ${classification}`)

    if (classification !== 'CHAT') {
      console.log(`File ${filePath} is not a chat log. Classification: ${classification}`)
      const rejectedResponse = { 
        status: "rejected",
        reason: "not_chat_log",
        message: "File is not a chat log, skipping",
        data: {
          classification: classification,
          file_path: filePath,
          user_id: userId
        }
      };
      console.log('EDGE_FUNCTION_RESPONSE (rejected):', JSON.stringify(rejectedResponse, null, 2));
      return new Response(
        JSON.stringify(rejectedResponse),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // Split content into chunks for better embedding
    console.log(`File ${filePath} is a chat log. Splitting into chunks for embedding generation...`)
    
    const CHUNK_SIZE = 5000 // Characters per chunk (further increased to reduce API calls)
    const chunks = splitTextIntoChunks(fileContent, CHUNK_SIZE)
    
    console.log(`Split file into ${chunks.length} chunks`)

    // Generate embeddings for all chunks in batches
    const allEmbeddings = []
    const BATCH_SIZE = 5 // Reduced batch size to avoid API rate limits
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchChunks = chunks.slice(i, i + BATCH_SIZE)
      
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(chunks.length/BATCH_SIZE)} with ${batchChunks.length} chunks`)
      
      // Add delay between batches to avoid rate limiting
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 3000)) // 3 second delay
      }
      
      const embeddingResponse = await cohereClient.embed({
        texts: batchChunks,
        model: 'embed-multilingual-v3.0',
        inputType: 'clustering'
      })
      
      if (!embeddingResponse.embeddings || embeddingResponse.embeddings.length === 0) {
        throw new Error(`Failed to generate embeddings for batch ${i}`)
      }
      
      allEmbeddings.push(...embeddingResponse.embeddings)
    }

    console.log(`Generated ${allEmbeddings.length} embeddings with ${allEmbeddings[0].length} dimensions each`)

    // Prepare documents for batch insert
    const documentsToInsert = chunks.map((chunk, index) => ({
      user_id: userId,
      content: chunk,
      embedding: allEmbeddings[index],
      metadata: {
        source_file_path: filePath,
        upload_timestamp: new Date().toISOString(),
        file_size: fileBlob.size,
        chunk_index: index,
        total_chunks: chunks.length,
        chunk_size: chunk.length,
        vector_source: 'cohere-embed-multilingual-v3.0-1024',
        classification_model: 'cohere-command',
        processing_timestamp: new Date().toISOString()
      }
    }))

    // Insert all documents in batch
    const { error: insertError } = await supabaseClient
      .from('documents')
      .insert(documentsToInsert)

    if (insertError) {
      console.error('Database batch insert error:', insertError)
      throw new Error(`Failed to insert documents: ${insertError.message}`)
    }

    console.log(`Successfully processed and vectorized file: ${filePath} into ${chunks.length} chunks`)

    return new Response(
      JSON.stringify({ 
        status: "success",
        message: "Successfully processed and vectorized file",
        data: {
          file_path: filePath,
          user_id: userId,
          file_size: fileBlob.size,
          chunks_created: chunks.length,
          embedding_dimensions: allEmbeddings[0].length,
          processing_batches: Math.ceil(chunks.length / BATCH_SIZE)
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        status: "error",
        error_type: "processing_error",
        message: error.message || 'Unknown error occurred',
        data: {
          error_details: error.stack
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-chat-log-to-vector' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"record":{"name":"users/test-user-id/chat.txt","bucket_id":"chat-logs"}}'

*/