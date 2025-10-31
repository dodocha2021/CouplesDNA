import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from '@/lib/embedding'
import { callAI } from '@/lib/ai'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Helper: Retrieve user data chunks
async function retrieveUserData(questionEmbedding, selectedFileIds, topK) {
  const vectorString = `[${questionEmbedding.join(',')}]`

  const promises = selectedFileIds.map(fileId =>
    supabaseAdmin.rpc('match_user_data', {
      query_embedding: vectorString,
      match_threshold: 0.3,
      match_count: topK,
      p_file_id: fileId
    })
  )

  const results = await Promise.all(promises)

  let allResults = []
  results.forEach(result => {
    if (result.data) allResults.push(...result.data)
  })

  const uniqueResults = Array.from(new Map(allResults.map(item => [item.id, item])).values())
  return uniqueResults.sort((a, b) => b.similarity - a.similarity).slice(0, topK)
}

// Helper: Create Manus task
async function createManusTask(prompt) {
  const apiKey = process.env.NEXT_PUBLIC_MANUS_API_KEY
  if (!apiKey) {
    throw new Error('MANUS_API_KEY not configured')
  }

  const response = await fetch('https://api.manus.ai/v1/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API_KEY': apiKey
    },
    body: JSON.stringify({
      prompt: prompt,
      taskMode: 'adaptive',
      agentProfile: 'quality',
      hideInTaskList: false,
      createShareableLink: true
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Manus API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return {
    taskId: data.taskId,
    shareUrl: data.shareUrl
  }
}

// Main: Process a single report
async function processReport(report) {
  const logs = []
  const log = (message) => {
    console.log(message)
    logs.push(message)
  }

  try {
    log(`\n========== Processing Report ${report.id} ==========`)
    log(`Setting: ${report.setting_name}`)
    log(`User Data ID: ${report.user_data_id}`)

    // Step 1: Update status to processing
    log('[1/5] Updating status to processing...')
    await supabaseAdmin
      .from('user_reports')
      .update({
        status: 'processing',
        report_status: 'generating',
        updated_at: new Date().toISOString()
      })
      .eq('id', report.id)

    // Step 2: Get user data file
    log('[2/5] Fetching user data file...')
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('user_uploads')
      .select('id, file_name')
      .eq('id', report.user_data_id)
      .single()

    if (userDataError || !userData) {
      throw new Error('User data file not found')
    }

    log(`  > User file: ${userData.file_name}`)

    // Step 3: Generate report using RAG
    log('[3/5] Generating report with AI...')

    const question = report.user_prompt_template
      .replace('{question}', report.setting_name)
      .split('\n')[0] || report.setting_name

    log(`  > Question: ${question}`)

    // Generate embedding
    const questionEmbedding = await generateEmbedding(question)
    const vectorString = `[${questionEmbedding.join(',')}]`

    // Build scope
    const scope = report.selected_knowledge_ids.map(fileId => ({
      file_id: fileId,
      threshold: 0.30
    }))

    log(`  > Knowledge scope: ${scope.length} files`)

    // Retrieve knowledge chunks
    const knowledgePromises = scope.map(({ file_id, threshold }) =>
      supabaseAdmin.rpc('match_knowledge', {
        query_embedding: vectorString,
        match_threshold: parseFloat(threshold),
        match_count: report.top_k_results || 5,
        p_file_id: file_id
      })
    )

    const knowledgeSearchResults = await Promise.all(knowledgePromises)

    let knowledgeResults = []
    knowledgeSearchResults.forEach(result => {
      if (result.data) knowledgeResults.push(...result.data)
    })

    const uniqueKnowledge = Array.from(
      new Map(knowledgeResults.map(item => [item.id, item])).values()
    )
    knowledgeResults = uniqueKnowledge
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, report.top_k_results || 5)

    log(`  > Found ${knowledgeResults.length} knowledge chunks`)

    // Retrieve user data chunks
    const userDataResults = await retrieveUserData(
      questionEmbedding,
      [report.user_data_id],
      report.top_k_results || 5
    )

    log(`  > Found ${userDataResults.length} user data chunks`)

    // Build context
    const knowledgeContext = knowledgeResults.length > 0
      ? knowledgeResults.map((r, i) => `[K${i+1}] ${r.content}`).join('\n\n---\n\n')
      : "No knowledge found."

    const userDataContext = userDataResults.length > 0
      ? userDataResults.map((r, i) => `[U${i+1}] ${r.content}`).join('\n\n---\n\n')
      : "No user data found."

    // Build final prompt
    const finalUserPrompt = report.user_prompt_template
      .replace('{context}', knowledgeContext)
      .replace('{userdata}', userDataContext)
      .replace('{question}', question)

    log('  > Calling AI model...')

    // Call AI
    const aiResult = await callAI(
      report.model_selection,
      finalUserPrompt,
      report.system_prompt,
      { temperature: 0.7, max_tokens: 4000 }
    )

    log(`  > AI response received: ${aiResult.content.length} characters`)

    // Update with generated report
    await supabaseAdmin
      .from('user_reports')
      .update({
        generated_report: aiResult.content,
        report_status: 'completed',
        debug_logs: logs.join('\n'),
        updated_at: new Date().toISOString()
      })
      .eq('id', report.id)

    log('[4/5] Report generated successfully')

    // Step 4: Generate slides with Manus
    log('[5/5] Generating slides with Manus...')

    await supabaseAdmin
      .from('user_reports')
      .update({
        slide_status: 'generating',
        updated_at: new Date().toISOString()
      })
      .eq('id', report.id)

    // Build Manus prompt
    const manusPrompt = (report.manus_prompt || 'Create a professional presentation with slides based on this report in english: ') + aiResult.content

    log(`  > Manus prompt length: ${manusPrompt.length} characters`)

    const manusResult = await createManusTask(manusPrompt)

    log(`  > Manus task created: ${manusResult.taskId}`)
    log(`  > Share URL: ${manusResult.shareUrl}`)

    // Update with Manus task info
    await supabaseAdmin
      .from('user_reports')
      .update({
        manus_task_id: manusResult.taskId,
        manus_share_url: manusResult.shareUrl,
        manus_task_status: 'pending',
        manus_task_created_at: new Date().toISOString(),
        debug_logs: logs.join('\n'),
        updated_at: new Date().toISOString()
      })
      .eq('id', report.id)

    log('✅ Report processing completed successfully')
    log('⏳ Waiting for Manus webhook to complete slide generation')
    log('================================================\n')

    return { success: true, reportId: report.id }

  } catch (error) {
    log(`❌ Error processing report: ${error.message}`)

    // Update with error status
    await supabaseAdmin
      .from('user_reports')
      .update({
        status: 'failed',
        report_error: error.message,
        debug_logs: logs.join('\n'),
        updated_at: new Date().toISOString()
      })
      .eq('id', report.id)

    return { success: false, reportId: report.id, error: error.message }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔄 Process User Reports API invoked')

    // Query for pending reports
    const { data: pendingReports, error: queryError } = await supabaseAdmin
      .from('user_reports')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1) // Process one at a time

    if (queryError) {
      throw queryError
    }

    if (!pendingReports || pendingReports.length === 0) {
      console.log('✅ No pending reports to process')
      return res.status(200).json({ message: 'No pending reports', processed: 0 })
    }

    console.log(`📋 Found ${pendingReports.length} pending report(s)`)

    // Process the report
    const report = pendingReports[0]
    const result = await processReport(report)

    return res.status(200).json({
      message: 'Report processed',
      processed: 1,
      result
    })

  } catch (error) {
    console.error('❌ API error:', error)
    return res.status(500).json({ error: error.message })
  }
}
