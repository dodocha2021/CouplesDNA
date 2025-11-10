import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from '@/lib/embedding'
import { callAI } from '@/lib/ai/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { message, history = [] } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' })
    }

    console.log(`[Live Chat] User ${user.id} sent message:`, message)
    console.log(`[Live Chat] History length:`, history.length)

    // 2. Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[Live Chat] Profile fetch error:', profileError)
      // Continue without profile if not found
    }

    console.log('[Live Chat] User profile:', profile ? 'Found' : 'Not found')

    // 3. Get system default general prompt config
    const { data: config, error: configError } = await supabase
      .from('prompt_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('prompt_type', 'general')
      .eq('is_system_default', true)
      .eq('is_active', true)
      .single()

    if (configError || !config) {
      console.error('[Live Chat] Config fetch error:', configError)
      return res.status(404).json({
        error: 'No default general configuration found. Please set up your prompt configuration first.'
      })
    }

    console.log('[Live Chat] Config found:', config.name)
    console.log('[Live Chat] Selected knowledge IDs:', config.selected_knowledge_ids)

    // 4. Validate knowledge base selection
    if (!config.selected_knowledge_ids || config.selected_knowledge_ids.length === 0) {
      return res.status(400).json({
        error: 'No knowledge base selected in configuration.'
      })
    }

    // 5. Generate embedding for the message
    console.log('[Live Chat] Generating embedding...')
    const embedding = await generateEmbedding(message)
    const vectorString = `[${embedding.join(',')}]`

    // 6. Build scope for vector search
    // Get knowledge files to determine category thresholds
    const { data: knowledgeFiles } = await supabase
      .from('knowledge_uploads')
      .select('id, file_name, metadata')
      .in('id', config.selected_knowledge_ids)
      .eq('status', 'completed')
      .eq('is_active', true)

    if (!knowledgeFiles || knowledgeFiles.length === 0) {
      return res.status(400).json({
        error: 'No valid knowledge base files found.'
      })
    }

    // Parse category thresholds from config
    let categoryThresholds = {}
    if (config.category_thresholds) {
      try {
        categoryThresholds = typeof config.category_thresholds === 'string'
          ? JSON.parse(config.category_thresholds)
          : config.category_thresholds
      } catch (e) {
        console.warn('[Live Chat] Failed to parse category_thresholds:', e)
      }
    }

    const scope = knowledgeFiles.map(file => ({
      file_id: file.id,
      threshold: categoryThresholds[file.metadata?.category] || 0.30
    }))

    console.log('[Live Chat] Search scope:', scope.length, 'files')

    // 7. Perform vector search across all selected knowledge files
    console.log('[Live Chat] Performing vector search...')
    const searchPromises = scope.map(({ file_id, threshold }) =>
      supabaseAdmin.rpc('match_knowledge', {
        query_embedding: vectorString,
        match_threshold: parseFloat(threshold),
        match_count: config.top_k_results || 10,
        p_file_ids: [file_id]
      })
    )

    const searchResults = await Promise.all(searchPromises)

    // Combine and deduplicate results
    let combinedResults = []
    searchResults.forEach((result, index) => {
      if (result.data) {
        combinedResults.push(...result.data)
        console.log(`[Live Chat] File ${scope[index].file_id.substring(0, 8)}... returned ${result.data.length} chunks`)
      } else if (result.error) {
        console.error(`[Live Chat] Search error for file ${scope[index].file_id}:`, result.error)
      }
    })

    // Deduplicate by unique key
    const uniqueResults = Array.from(new Map(combinedResults.map(item => {
      const uniqueKey = `${item.metadata?.file_id || 'unknown'}_${item.metadata?.chunk_index ?? 'unknown'}`
      return [uniqueKey, item]
    })).values())

    // Sort by similarity and limit to topK
    const topResults = uniqueResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, config.top_k_results || 10)

    console.log(`[Live Chat] Found ${topResults.length} relevant chunks`)

    // 8. Build knowledge context
    const knowledgeContext = topResults.length > 0
      ? topResults.map((r, i) => `[K${i+1}] ${r.content}`).join('\n\n---\n\n')
      : "No relevant knowledge found."

    // 9. Build profile context
    let profileContext = ''
    if (profile) {
      profileContext = `User Profile:\n`
      profileContext += `Name: ${profile.full_name || 'N/A'}\n`
      profileContext += `Email: ${profile.email || 'N/A'}\n`

      // Add future fields when available
      if (profile.age) profileContext += `Age: ${profile.age}\n`
      if (profile.gender) profileContext += `Gender: ${profile.gender}\n`
      if (profile.relationship_status) profileContext += `Relationship Status: ${profile.relationship_status}\n`
    } else {
      profileContext = 'User profile not available.'
    }

    // 10. Build final user prompt by replacing placeholders
    let finalUserPrompt = config.user_prompt_template
      .replace('{context}', knowledgeContext)
      .replace('{userdata}', profileContext)
      .replace('{profile}', profileContext)  // Support both placeholders
      .replace('{question}', message)
      .replace('{message}', message)  // Support both placeholders

    // 11. Build messages array with full conversation history
    const messages = [
      { role: 'system', content: config.system_prompt }
    ]

    // Add conversation history (if exists)
    if (history && history.length > 0) {
      history.forEach(msg => {
        messages.push({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.content
        })
      })
    }

    // Add current message with RAG context
    messages.push({
      role: 'user',
      content: finalUserPrompt
    })

    console.log('[Live Chat] Calling AI with', messages.length, 'messages')

    // 12. Call AI
    const startTime = Date.now()
    const aiResponse = await callAI({
      model: config.model_selection,
      messages: messages,
      temperature: 0.7,
      max_tokens: 4096
    })
    const endTime = Date.now()

    console.log('[Live Chat] AI response received in', ((endTime - startTime) / 1000).toFixed(2), 'seconds')

    // 13. Return response
    return res.status(200).json({
      success: true,
      response: aiResponse.content,
      metadata: {
        model: config.model_selection,
        tokens: aiResponse.usage?.total_tokens || 'N/A',
        time: `${((endTime - startTime) / 1000).toFixed(2)}s`,
        chunks_found: topResults.length,
        knowledge_files: knowledgeFiles.length
      }
    })

  } catch (error) {
    console.error('[Live Chat] Server error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    })
  }
}
