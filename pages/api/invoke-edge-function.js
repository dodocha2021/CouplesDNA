import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '../../lib/supabase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { functionName, payload } = req.body;

    if (!functionName || !payload) {
      return res.status(400).json({ error: 'Missing functionName or payload' });
    }

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    });

    if (error) {
      console.error('Edge Function error:', error);
      return res.status(500).json({ 
        error: 'Edge Function call failed',
        details: error.message 
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}