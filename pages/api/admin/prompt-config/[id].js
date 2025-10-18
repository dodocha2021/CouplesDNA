import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query

    // Get user from authorization header
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // 使用 token 创建客户端
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

    // Get specific config
    const { data, error } = await supabaseClient
      .from('prompt_configs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(404).json({ error: 'Configuration not found' })
    }

    // Check if knowledge base file still exists
    if (data.knowledge_base_id) {
      const { data: kbFile } = await supabaseClient
        .from('knowledge_uploads')
        .select('id, file_name')
        .eq('id', data.knowledge_base_id)
        .single()

      if (!kbFile) {
        data.knowledge_base_deleted = true
      }
    }

    // Check if user data file still exists (for report type)
    if (data.user_data_id) {
      const { data: udFile } = await supabaseClient
        .from('user_uploads')
        .select('id, file_name')
        .eq('id', data.user_data_id)
        .single()

      if (!udFile) {
        data.user_data_deleted = true
      }
    }

    return res.status(200).json({ success: true, data })

  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
