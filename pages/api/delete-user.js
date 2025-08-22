import { createClient } from '@supabase/supabase-js'

// Use service_role_key to create a client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // This is the admin key, only used on the server side
)

export default async function handler(req, res) {
  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get user ID from the request
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Verify if the current user has permission to delete this account
    // Additional permission check logic can be added here
    // For example: only the user themselves or an administrator can delete the account

    // Delete user with admin privileges
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error('Delete user error:', error.message)
      return res.status(500).json({ 
        error: 'Failed to delete user',
        details: error.message 
      })
    }

    // Deletion successful, related profile records will be automatically deleted via CASCADE DELETE
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