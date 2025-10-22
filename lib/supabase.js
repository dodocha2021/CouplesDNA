import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

// 创建单例客户端
let supabaseInstance = null;

export const getSupabase = () => {
  if (!supabaseInstance && typeof window !== 'undefined') {
    supabaseInstance = createPagesBrowserClient();
  }
  return supabaseInstance;
};

// 导出默认客户端（用于向后兼容）
export const supabase = getSupabase();

// Helper function: Get user role
export const getUserRole = async () => {
  const supabase = getSupabase();
  if (!supabase) return 'guest';
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'guest'
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  return profile?.role || 'user'
}

// Helper function: Get user information
export const getUserProfile = async () => {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    
  return profile
}

// Helper function: Get user information from API request
export const getUserFromRequest = async (req, res) => {
  try {
    // First try to get the access token from the Authorization header (client authentication)
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7)
      
      // Create a client using the access token
      const { createClient } = require('@supabase/supabase-js')
      const supabaseWithToken = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        }
      )
      
      const { data: { user }, error } = await supabaseWithToken.auth.getUser()
      if (!error && user) {
        return user
      }
    }
    return null; // Explicitly return null if no user is found
  } catch (error) {
    console.error('Error in getUserFromRequest:', error);
    return null;
  }
}
