import { createClient } from '@supabase/supabase-js'
import { callAI } from '@/lib/ai/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get user from authorization header
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { model, test_question } = req.body

    if (!test_question) {
      return res.status(400).json({ error: 'test_question is required' })
    }

    // Get system default general prompt config
    const { data: config, error: configError } = await supabase
      .from('prompt_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('prompt_type', 'general')
      .eq('is_system_default', true)
      .eq('is_active', true)
      .single()

    if (configError || !config) {
      return res.status(404).json({ error: 'No default configuration found' })
    }

    // Check if knowledge base file exists
    if (config.knowledge_base_id) {
      const { data: kbFile } = await supabase
        .from('knowledge_uploads')
        .select('id')
        .eq('id', config.knowledge_base_id)
        .single()

      if (!kbFile) {
        return res.status(400).json({ error: 'Knowledge base file not found' })
      }
    }

    // Use provided model or default from config
    const selectedModel = model || config.model_selection

    // Replace test_question in user_prompt_template
    const userPrompt = config.user_prompt_template.replace('{test_question}', test_question)

    const startTime = Date.now()

    // Call AI
    const aiResponse = await callAI({
      model: selectedModel,
      messages: [
        { role: 'system', content: config.system_prompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4096
    })

    const endTime = Date.now()
    const executionTime = ((endTime - startTime) / 1000).toFixed(2)

    return res.status(200).json({
      success: true,
      response: aiResponse.content,
      debug: {
        tokens: aiResponse.usage?.total_tokens || 'N/A',
        time: `${executionTime}s`,
        model: selectedModel
      }
    })

  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error' 
    })
  }
}