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
  console.log('🔔 WEBHOOK RECEIVED:', new Date().toISOString())
  console.log('========================================')

  try {
    const { event_type, task_detail } = req.body
    
    console.log('📋 Event Type:', event_type)
    console.log('📋 Task ID:', task_detail?.task_id)
    console.log('📋 Stop Reason:', task_detail?.stop_reason)

    // 只处理任务完成事件
    if (event_type !== 'task_stopped') {
      console.log('⏭️  Skipping event type:', event_type)
      return res.status(200).json({ received: true, skipped: true })
    }

    const { task_id, stop_reason, attachments, message } = task_detail

    console.log('🔍 Step 1: Looking up config for task:', task_id)

    // 查找对应的配置记录
    const { data: config, error: findError } = await supabase
      .from('prompt_configs')
      .select('*')
      .eq('manus_task_id', task_id)
      .single()

    if (findError || !config) {
      console.error('❌ Config not found for task:', task_id)
      console.error('❌ Error:', findError)
      return res.status(404).json({ error: 'Config not found' })
    }

    console.log('✅ Config found! ID:', config.id, 'Name:', config.name)

    // 处理任务失败
    if (stop_reason !== 'finish' || !attachments || attachments.length === 0) {
      console.log('⚠️  Step 2: Task failed or no attachments')
      console.log('⚠️  Stop reason:', stop_reason)
      console.log('⚠️  Message:', message)

      const { error: updateError } = await supabase
        .from('prompt_configs')
        .update({
          manus_task_status: 'failed',
          manus_task_error: message || 'Task failed or no slides generated',
          manus_task_completed_at: new Date().toISOString()
        })
        .eq('id', config.id)

      if (updateError) {
        console.error('❌ Failed to update status:', updateError)
      } else {
        console.log('✅ Status updated to failed')
      }

      return res.status(200).json({ received: true, status: 'failed' })
    }

    // 下载 slides JSON
    console.log('📥 Step 2: Downloading slides from:', attachments[0].file_name)
    const slidesUrl = attachments[0].url
    
    const slidesResponse = await fetch(slidesUrl)
    if (!slidesResponse.ok) {
      throw new Error(`Failed to download slides: ${slidesResponse.status}`)
    }
    
    const slidesData = await slidesResponse.json()
    console.log('✅ Slides downloaded, size:', JSON.stringify(slidesData).length, 'bytes')

    // 保存到数据库
    console.log('💾 Step 3: Saving to database...')
    
    const { error: updateError } = await supabase
      .from('prompt_configs')
      .update({
        generate_slides: JSON.stringify(slidesData),
        manus_task_status: 'completed',
        manus_task_completed_at: new Date().toISOString()
      })
      .eq('id', config.id)

    if (updateError) {
      console.error('❌ Database update failed:', updateError)
      return res.status(500).json({ error: 'Update failed' })
    }

    console.log('✅ SUCCESS! Slides saved for task:', task_id)
    console.log('✅ Config ID:', config.id)
    console.log('========================================')
    
    return res.status(200).json({ 
      received: true, 
      status: 'completed',
      config_id: config.id,
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