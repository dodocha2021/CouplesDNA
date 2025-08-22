import { supabase, getUserFromRequest } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  try {
    // Authenticate user identity
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { data, error } = await supabase
      .from('workflow_progress')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          success: false,
          error: 'Session not found' 
        });
      }
      throw error;
    }
    
    res.status(200).json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Error fetching workflow progress:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error', 
      message: error.message 
    });
  }
}