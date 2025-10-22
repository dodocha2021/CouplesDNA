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

    // TODO: Define report API parameters
    // const { model, report_topic, user_data } = req.body

    // Get system default report prompt config
    const { data: config, error: configError } = await supabase
      .from('prompt_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('prompt_type', 'report')
      .eq('is_system_default', true)
      .eq('is_active', true)
      .single()

    if (configError || !config) {
      return res.status(404).json({ error: 'No default configuration found' })
    }

    // TODO: Implement report generation logic
    return res.status(501).json({ error: 'Report API not implemented yet' })

  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error' 
    })
  }
}
