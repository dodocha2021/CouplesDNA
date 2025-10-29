import { createClient } from '@supabase/supabase-js'

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

    // 使用传入的 token 创建客户端
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

    const {
      prompt_type,
      name,
      model_selection,
      knowledge_base_id,
      knowledge_base_name,
      selected_knowledge_ids,
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
      generate_slides,
      manus_task_id,
      manus_share_url,
      manus_prompt,
      manus_task_status,
      manus_task_created_at,
      manus_task_completed_at,
      source_config_id
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
    } else if (prompt_type === 'slide') {
    if (!model_selection || !knowledge_base_id || top_k_results === undefined ||
        strict_mode === undefined || !system_prompt || !user_prompt_template ||
        !manus_prompt || !manus_task_id) {
      return res.status(400).json({ error: '请先生成 slides 后再保存' })
    }

    // Check for duplicate manus_task_id
    const { data: existing, error: checkError } = await supabaseClient
      .from('prompt_configs')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .eq('manus_task_id', manus_task_id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking duplicate:', checkError)
      return res.status(500).json({ error: 'Failed to check duplicate' })
    }

    if (existing) {
      return res.status(400).json({
        error: 'This slide configuration has already been saved. Please generate new slides to save a new version.',
        code: 'DUPLICATE_TASK_ID',
        existing_config: {
          id: existing.id,
          name: existing.name,
          created_at: existing.created_at
        }
      })
    }
  } else {
      return res.status(400).json({ error: 'Invalid prompt_type' })
    }

    // 使用带 token 的客户端进行插入
    const { data, error } = await supabaseClient
      .from('prompt_configs')
      .insert({
        user_id: user.id,
        prompt_type,
        name,
        model_selection,
        knowledge_base_id,
        knowledge_base_name,
        selected_knowledge_ids: selected_knowledge_ids || [],
        top_k_results,
        strict_mode,
        system_prompt,
        user_prompt_template,
        debug_logs,
        test_question: prompt_type === 'general' ? test_question : null,
        generated_response: prompt_type === 'general' ? generated_response : null,
        user_data_id: ['report', 'slide'].includes(prompt_type) ? (user_data_id || null) : null,
        user_data_name: ['report', 'slide'].includes(prompt_type) ? (user_data_name || null) : null,
        report_topic: ['report', 'slide'].includes(prompt_type) ? (report_topic || null) : null,
        generated_report: ['report', 'slide'].includes(prompt_type) ? (generated_report || null) : null,
        generate_slides: prompt_type === 'slide' ? (generate_slides || null) : null,
        manus_task_id: prompt_type === 'slide' ? (manus_task_id || null) : null,
        manus_share_url: prompt_type === 'slide' ? (manus_share_url || null) : null,
        manus_prompt: prompt_type === 'slide' ? (manus_prompt || null) : null,
        manus_task_status: prompt_type === 'slide' ? (manus_task_status || null) : null,
        manus_task_created_at: prompt_type === 'slide' ? (manus_task_created_at || null) : null,
        manus_task_completed_at: prompt_type === 'slide' ? (manus_task_completed_at || null) : null,
        source_config_id: prompt_type === 'slide' ? (source_config_id || null) : null,
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
