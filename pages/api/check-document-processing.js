import { supabase, getUserFromRequest } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filePath } = req.query;

  if (!filePath) {
    return res.status(400).json({ error: 'filePath is required' });
  }

  try {
    // Authenticate user identity
    const user = await getUserFromRequest(req, res);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if documents were created for this file path
    const { data, error } = await supabase
      .from('documents')
      .select('id')
      .eq('metadata->>source_file_path', filePath)
      .eq('user_id', user.id)
      .limit(1);

    if (error) {
      throw error;
    }
    
    res.status(200).json({
      success: true,
      processed: data && data.length > 0,
      count: data ? data.length : 0
    });
    
  } catch (error) {
    console.error('Error checking document processing:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error', 
      message: error.message 
    });
  }
}