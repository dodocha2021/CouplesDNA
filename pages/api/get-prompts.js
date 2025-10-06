import { supabase, getUserFromRequest } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user identity
    const user = await getUserFromRequest(req, res);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // --- Temporarily disabled database query ---
    // The user indicated the tables do not exist yet.
    // Returning a default object to allow the UI to render without errors.
    
    const defaultPrompts = {
        1: "How to maintain a long-term healthy relationship"
    };
    const defaultTotalQuestions = 1;

    console.log('✅ Bypassing database. Returning default prompts.');

    res.status(200).json({ 
      success: true, 
      prompts: defaultPrompts,
      totalQuestions: defaultTotalQuestions
    });

  } catch (error) {
    console.error('❌ Error in get-prompts (bypassed):', error);
    res.status(500).json({ 
      error: 'Failed to process request', 
      message: error.message 
    });
  }
}
