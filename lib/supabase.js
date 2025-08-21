import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 辅助函数：获取用户角色
export const getUserRole = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'guest'
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  return profile?.role || 'user'
}

// 辅助函数：获取用户信息
export const getUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    
  return profile
} 

// 辅助函数：从API请求中获取用户信息
export const getUserFromRequest = async (req, res) => {
  try {
    // 首先尝试从Authorization header获取访问令牌（客户端认证）
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7)
      
      // 使用访问令牌创建客户端
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
    
    // 回退到服务端认证（Cookie认证）
    try {
      const { createPagesServerClient } = require('@supabase/auth-helpers-nextjs')
      const supabaseServer = createPagesServerClient({ req, res })
      
      const { data: { user }, error } = await supabaseServer.auth.getUser()
      
      if (error || !user) {
        return null
      }
      
      return user
    } catch (helperError) {
      console.log('auth-helpers-nextjs error:', helperError.message)
      return null
    }
    
  } catch (error) {
    console.error('Error getting user from request:', error)
    return null
  }
}