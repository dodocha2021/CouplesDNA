import { supabase, getUserFromRequest } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user identity
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { data, error } = await supabase
      .from('workflow_progress')
      .select('session_id, workflow_type, status, current_step, total_steps, started_at, completed_at')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({
      success: true,
      data: data || []
    });
    
  } catch (error) {
    console.error('Error fetching session history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error', 
      message: error.message 
    });
  }
}