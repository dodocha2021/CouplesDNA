import { createClient } from '@supabase/supabase-js'

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

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { user_data_id, setting_name } = req.body

    if (!user_data_id || !setting_name) {
      return res.status(400).json({ error: 'Missing required fields: user_data_id, setting_name' })
    }

    // Verify user_data_id belongs to user
    const { data: userData, error: userDataError } = await supabaseClient
      .from('user_uploads')
      .select('id, file_name')
      .eq('id', user_data_id)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .single()

    if (userDataError || !userData) {
      return res.status(404).json({ error: 'User upload not found or not completed' })
    }

    // Get the prompt_config with this setting_name
    const { data: configData, error: configError } = await supabaseClient
      .from('prompt_configs')
      .select('*')
      .eq('setting_name', setting_name)
      .eq('is_system_default', true)
      .single()

    if (configError || !configData) {
      return res.status(404).json({ error: 'System configuration not found for this topic' })
    }

    // Create user_reports record
    const reportData = {
      user_id: user.id,
      user_data_id,
      setting_name,

      // Copy configuration from prompt_configs
      model_selection: configData.model_selection,
      selected_knowledge_ids: configData.selected_knowledge_ids || [],
      top_k_results: configData.top_k_results || 5,
      strict_mode: configData.strict_mode !== false, // default true
      system_prompt: configData.system_prompt,
      user_prompt_template: configData.user_prompt_template,
      manus_prompt: configData.manus_prompt,
      category_thresholds: configData.category_thresholds || {},
      source_config_id: configData.id,

      // Status fields - start as pending
      status: 'pending',
      report_status: 'pending',
      slide_status: 'pending'
    }

    const { data: newReport, error: insertError } = await supabaseClient
      .from('user_reports')
      .insert([reportData])
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return res.status(500).json({ error: 'Failed to create report' })
    }

    console.log('✅ User report created:', newReport.id)

    return res.status(200).json({
      success: true,
      data: newReport,
      message: 'Report generation started. You will be notified when it is complete.'
    })

  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
