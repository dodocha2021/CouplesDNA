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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const {
      prompt_type,
      name,
      model_selection,
      knowledge_base_id,
      knowledge_base_name,
      top_k_results,
      strict_mode,
      system_prompt,
      user_prompt_template,
      debug_logs,
      test_question,
      generated_response,
      user_data_id,
      user_data_name,
      report_topic,
      generated_report,
      generate_slides
    } = req.body

    // Validation based on prompt type
    if (prompt_type === 'general') {
      if (!model_selection || !knowledge_base_id || top_k_results === undefined || 
          strict_mode === undefined || !system_prompt || !user_prompt_template || 
          !test_question || !generated_response || !debug_logs) {
        return res.status(400).json({ error: '请先运行测试生成结果后再保存' })
      }
    } else if (prompt_type === 'report') {
      if (!model_selection || !knowledge_base_id || top_k_results === undefined || 
          !user_data_id || strict_mode === undefined || !system_prompt || 
          !user_prompt_template || !report_topic || !generated_report || !debug_logs) {
        return res.status(400).json({ error: '请先生成报告后再保存' })
      }
    } else {
      return res.status(400).json({ error: 'Invalid prompt_type' })
    }

    // Insert new config
    const { data, error } = await supabase
      .from('prompt_configs')
      .insert({
        user_id: user.id,
        prompt_type,
        name,
        model_selection,
        knowledge_base_id,
        knowledge_base_name,
        top_k_results,
        strict_mode,
        system_prompt,
        user_prompt_template,
        debug_logs,
        test_question: prompt_type === 'general' ? test_question : null,
        generated_response: prompt_type === 'general' ? generated_response : null,
        user_data_id: prompt_type === 'report' ? user_data_id : null,
        user_data_name: prompt_type === 'report' ? user_data_name : null,
        report_topic: prompt_type === 'report' ? report_topic : null,
        generated_report: prompt_type === 'report' ? generated_report : null,
        generate_slides: prompt_type === 'report' ? generate_slides : null,
        is_active: true,
        is_system_default: false
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true, data })

  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}