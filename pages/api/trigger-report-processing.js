// This endpoint triggers the Supabase Edge Function to process pending reports
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔄 Triggering Edge Function to process user reports...')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing')
    }

    // Call the Edge Function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/process-user-reports`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Edge Function call failed')
    }

    console.log('✅ Edge Function response:', result)

    return res.status(200).json({
      success: true,
      result
    })

  } catch (error) {
    console.error('❌ Failed to trigger Edge Function:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
