import { createClient } from '@supabase/supabase-js'

// 使用 service_role_key 创建管理员权限的客户端
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // 这是管理员密钥，只在服务端使用
)

export default async function handler(req, res) {
  // 只允许 DELETE 请求
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 从请求中获取用户ID
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // 验证当前用户是否有权限删除此账户
    // 这里可以添加额外的权限检查逻辑
    // 例如：只有用户本人或管理员才能删除账户

    // 使用管理员权限删除用户
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error('Delete user error:', error.message)
      return res.status(500).json({ 
        error: 'Failed to delete user',
        details: error.message 
      })
    }

    // 删除成功，相关的 profiles 记录会通过 CASCADE DELETE 自动删除
    return res.status(200).json({ 
      message: 'User deleted successfully' 
    })

  } catch (error) {
    console.error('Delete user API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}