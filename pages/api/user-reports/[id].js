import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'PATCH') {
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

    // Handle DELETE - Soft delete
    if (req.method === 'DELETE') {
      const { data, error } = await supabaseClient
        .from('user_reports')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Delete error:', error)
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Report not found' })
        }
        return res.status(500).json({ error: 'Failed to delete report' })
      }

      console.log('✅ User report soft deleted:', id)

      return res.status(200).json({
        success: true,
        message: 'Report deleted successfully'
      })
    }

    // Handle PATCH - Update thumb_up
    if (req.method === 'PATCH') {
      const { thumb_up } = req.body

      // thumb_up can be true, false, or null
      if (thumb_up !== true && thumb_up !== false && thumb_up !== null) {
        return res.status(400).json({ error: 'Invalid thumb_up value. Must be true, false, or null' })
      }

      const { data, error } = await supabaseClient
        .from('user_reports')
        .update({ thumb_up, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Update thumb error:', error)
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Report not found' })
        }
        return res.status(500).json({ error: 'Failed to update rating' })
      }

      console.log('✅ User report rating updated:', id, 'thumb_up:', thumb_up)

      return res.status(200).json({
        success: true,
        data,
        message: 'Rating updated successfully'
      })
    }

  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
