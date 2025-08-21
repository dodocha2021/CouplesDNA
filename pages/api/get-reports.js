
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser(req.headers.authorization.split(' ')[1])

      if (userError || !user) {
        return res.status(401).json({ success: false, error: 'User not authenticated' })
      }

      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // 映射数据字段以匹配前端期望的结构
      const mappedData = data.map(item => ({
        id: item.id,
        title: item.session_name || item.session_id || `Report ${item.id}`,
        status: item.status || 'completed',
        created_at: item.created_at,
        communication_style: item.communication_style || null,
        sentiment_score: item.sentiment_score || null,
        session_id: item.session_id,
        // 保留原始数据以备后用
        ...item
      }))

      res.status(200).json({ success: true, data: mappedData })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
