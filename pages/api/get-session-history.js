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
    
    // --- Temporarily disabled database query ---
    // The user indicated the tables do not exist yet.
    // Returning an empty array to allow the UI to render without errors.
    /*
    let query = supabase
      .from('n8n_workflow_sessions')
      .select('session_id, workflow_type, status, current_step, total_steps, started_at, completed_at');

    if (user.role !== 'admin') {
      query = query.eq('user_id', user.id);
    }
    
    const { data, error } = await query.order('started_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    */
    
    const data = []; // Return empty data

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
