import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('========================================')
  console.log('🔔 USER REPORTS WEBHOOK RECEIVED:', new Date().toISOString())
  console.log('========================================')

  try {
    const { event_type, task_detail } = req.body

    console.log('📋 Event Type:', event_type)
    console.log('📋 Task ID:', task_detail?.task_id)
    console.log('📋 Stop Reason:', task_detail?.stop_reason)

    // Only process task_stopped events
    if (event_type !== 'task_stopped') {
      console.log('⏭️  Skipping event type:', event_type)
      return res.status(200).json({ received: true, skipped: true })
    }

    const { task_id, stop_reason, attachments, message } = task_detail

    console.log('🔍 Step 1: Looking up user report for task:', task_id)

    // Find the corresponding user_reports record
    const { data: report, error: findError } = await supabase
      .from('user_reports')
      .select('*')
      .eq('manus_task_id', task_id)
      .single()

    if (findError || !report) {
      console.error('❌ User report not found for task:', task_id)
      console.error('❌ Error:', findError)
      return res.status(404).json({ error: 'User report not found' })
    }

    console.log('✅ Report found! ID:', report.id, 'Setting:', report.setting_name)

    // Handle task failure
    if (stop_reason !== 'finish' || !attachments || attachments.length === 0) {
      console.log('⚠️  Step 2: Task failed or no attachments')
      console.log('⚠️  Stop reason:', stop_reason)
      console.log('⚠️  Message:', message)

      const { error: updateError } = await supabase
        .from('user_reports')
        .update({
          status: 'failed',
          slide_status: 'failed',
          slide_error: message || 'Task failed or no slides generated',
          manus_task_status: 'failed',
          manus_task_error: message || 'Task failed or no slides generated',
          manus_task_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', report.id)

      if (updateError) {
        console.error('❌ Failed to update status:', updateError)
      } else {
        console.log('✅ Status updated to failed')
      }

      return res.status(200).json({ received: true, status: 'failed' })
    }

    // Download slides JSON
    console.log('📥 Step 2: Downloading slides from:', attachments[0].file_name)
    const slidesUrl = attachments[0].url

    const slidesResponse = await fetch(slidesUrl)
    if (!slidesResponse.ok) {
      throw new Error(`Failed to download slides: ${slidesResponse.status}`)
    }

    const slidesData = await slidesResponse.json()
    console.log('✅ Slides downloaded, size:', JSON.stringify(slidesData).length, 'bytes')

    // Save to database
    console.log('💾 Step 3: Saving to database...')

    const { error: updateError } = await supabase
      .from('user_reports')
      .update({
        status: 'completed',
        slide_status: 'completed',
        generate_slides: slidesData ? JSON.stringify(slidesData) : null,
        manus_raw_output: req.body,
        manus_task_status: 'completed',
        manus_task_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', report.id)

    if (updateError) {
      console.error('❌ Database update failed:', updateError)
      return res.status(500).json({ error: 'Update failed' })
    }

    console.log('✅ SUCCESS! Slides saved for task:', task_id)
    console.log('✅ Report ID:', report.id)

    // Step 4: Send email notification
    console.log('📧 Step 4: Sending email notification...')

    try {
      // Get user email
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(report.user_id)

      if (userError || !userData?.user?.email) {
        console.error('⚠️  Failed to get user email:', userError)
      } else {
        const userEmail = userData.user.email
        console.log('📧 Sending to:', userEmail)

        // Send email via Resend API
        const resendApiKey = process.env.RESEND_API_KEY
        if (resendApiKey) {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'CouplesDNA <noreply@couplesdna.com>',
              to: [userEmail],
              subject: `Your report "${report.setting_name}" is ready!`,
              html: `
                <h2>Your report is ready!</h2>
                <p>Your relationship analysis report <strong>${report.setting_name}</strong> has been completed.</p>
                <p>You can view it now in your <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://couplesdna.vercel.app'}/dashboard?tab=my-reports">My Reports</a> page.</p>
                <p>Thank you for using CouplesDNA!</p>
              `
            })
          })

          if (emailResponse.ok) {
            console.log('✅ Email sent successfully')
          } else {
            const emailError = await emailResponse.text()
            console.error('⚠️  Email send failed:', emailError)
          }
        } else {
          console.log('⚠️  RESEND_API_KEY not configured, skipping email')
        }
      }
    } catch (emailError) {
      console.error('⚠️  Email error (non-critical):', emailError)
    }

    console.log('========================================')

    return res.status(200).json({
      received: true,
      status: 'completed',
      report_id: report.id,
      slides_size: JSON.stringify(slidesData).length
    })

  } catch (error) {
    console.error('========================================')
    console.error('💥 WEBHOOK ERROR:', error.message)
    console.error('💥 Stack:', error.stack)
    console.error('========================================')
    return res.status(500).json({ error: error.message })
  }
}
