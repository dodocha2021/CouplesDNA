import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: Generate embedding for a text
async function generateEmbedding(text: string): Promise<number[]> {
  const hfToken = Deno.env.get("HUGGINGFACE_API_TOKEN");
  if (!hfToken) {
    throw new Error("HUGGINGFACE_API_TOKEN not configured");
  }

  const response = await fetch(
    "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    }
  );

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  return await response.json();
}

// Helper: Call OpenRouter AI
async function callAI(
  model: string,
  userPrompt: string,
  systemPrompt: string,
  options: { temperature?: number; max_tokens?: number } = {}
): Promise<{ content: string; usage: any; model: string }> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
    model: data.model,
  };
}

// Helper: Retrieve user data chunks
async function retrieveUserData(
  questionEmbedding: number[],
  supabase: any,
  selectedFileIds: string[],
  topK: number
): Promise<any[]> {
  const vectorString = `[${questionEmbedding.join(',')}]`;

  const promises = selectedFileIds.map(fileId =>
    supabase.rpc('match_user_data', {
      query_embedding: vectorString,
      match_threshold: 0.3,
      match_count: topK,
      p_file_id: fileId
    })
  );

  const results = await Promise.all(promises);

  let allResults: any[] = [];
  results.forEach((result: any) => {
    if (result.data) allResults.push(...result.data);
  });

  const uniqueResults = Array.from(new Map(allResults.map(item => [item.id, item])).values());
  return uniqueResults.sort((a: any, b: any) => b.similarity - a.similarity).slice(0, topK);
}

// Helper: Create Manus slide task
async function createManusTask(prompt: string): Promise<{ taskId: string; shareUrl: string }> {
  const apiKey = Deno.env.get("MANUS_API_KEY");
  if (!apiKey) {
    throw new Error("MANUS_API_KEY not configured");
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
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Manus API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    taskId: data.taskId,
    shareUrl: data.shareUrl
  };
}

// Main: Process a single report
async function processReport(report: any, supabase: any) {
  const logs: string[] = [];
  const log = (message: string) => {
    console.log(message);
    logs.push(message);
  };

  try {
    log(`\n========== Processing Report ${report.id} ==========`);
    log(`Setting: ${report.setting_name}`);
    log(`User Data ID: ${report.user_data_id}`);

    // Step 1: Update status to processing
    log('[1/5] Updating status to processing...');
    await supabase
      .from('user_reports')
      .update({
        status: 'processing',
        report_status: 'generating',
        updated_at: new Date().toISOString()
      })
      .eq('id', report.id);

    // Step 2: Get user data file
    log('[2/5] Fetching user data file...');
    const { data: userData, error: userDataError } = await supabase
      .from('user_uploads')
      .select('id, file_name')
      .eq('id', report.user_data_id)
      .single();

    if (userDataError || !userData) {
      throw new Error('User data file not found');
    }

    log(`  > User file: ${userData.file_name}`);

    // Step 3: Generate report using RAG
    log('[3/5] Generating report with AI...');

    // IMPORTANT: Use report_topic as the actual question
    // report_topic contains the full question (e.g., "What Mia can do to...")
    // setting_name is just a display label (e.g., "Relationship")
    const question = report.report_topic || report.setting_name;

    log(`  > Question: ${question}`);

    // Generate embedding
    const questionEmbedding = await generateEmbedding(question);
    const vectorString = `[${questionEmbedding.join(',')}]`;

    // Build scope from selected_knowledge_ids and category_thresholds
    const scope = report.selected_knowledge_ids.map((fileId: string) => {
      // Get category for this file
      const threshold = 0.30; // default, will be updated if we can get category
      return { file_id: fileId, threshold };
    });

    log(`  > Knowledge scope: ${scope.length} files`);

    // Retrieve knowledge chunks
    const knowledgePromises = scope.map(({ file_id, threshold }: any) =>
      supabase.rpc('match_knowledge', {
        query_embedding: vectorString,
        match_threshold: parseFloat(threshold),
        match_count: report.top_k_results || 5,
        p_file_id: file_id
      })
    );

    const knowledgeSearchResults = await Promise.all(knowledgePromises);

    let knowledgeResults: any[] = [];
    knowledgeSearchResults.forEach((result: any) => {
      if (result.data) knowledgeResults.push(...result.data);
    });

    const uniqueKnowledge = Array.from(
      new Map(knowledgeResults.map(item => [item.id, item])).values()
    );
    knowledgeResults = uniqueKnowledge
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, report.top_k_results || 5);

    log(`  > Found ${knowledgeResults.length} knowledge chunks`);

    // Retrieve user data chunks
    const userDataResults = await retrieveUserData(
      questionEmbedding,
      supabase,
      [report.user_data_id],
      report.top_k_results || 5
    );

    log(`  > Found ${userDataResults.length} user data chunks`);

    // Build context
    const knowledgeContext = knowledgeResults.length > 0
      ? knowledgeResults.map((r: any, i: number) => `[K${i+1}] ${r.content}`).join('\n\n---\n\n')
      : "No knowledge found.";

    const userDataContext = userDataResults.length > 0
      ? userDataResults.map((r: any, i: number) => `[U${i+1}] ${r.content}`).join('\n\n---\n\n')
      : "No user data found.";

    // Build final prompt
    const finalUserPrompt = report.user_prompt_template
      .replace('{context}', knowledgeContext)
      .replace('{userdata}', userDataContext)
      .replace('{question}', question);

    log('  > Calling AI model...');

    // Call AI
    const aiResult = await callAI(
      report.model_selection,
      finalUserPrompt,
      report.system_prompt,
      { temperature: 0.7, max_tokens: 4000 }
    );

    log(`  > AI response received: ${aiResult.content.length} characters`);

    // Update with generated report
    await supabase
      .from('user_reports')
      .update({
        generated_report: aiResult.content,
        report_status: 'completed',
        debug_logs: logs.join('\n'),
        updated_at: new Date().toISOString()
      })
      .eq('id', report.id);

    log('[4/5] Report generated successfully');

    // Step 4: Generate slides with Manus
    log('[5/5] Generating slides with Manus...');

    await supabase
      .from('user_reports')
      .update({
        slide_status: 'generating',
        updated_at: new Date().toISOString()
      })
      .eq('id', report.id);

    // Build Manus prompt
    const manusPrompt = (report.manus_prompt || 'Create a professional presentation with slides based on this report in english: ') + aiResult.content;

    log(`  > Manus prompt length: ${manusPrompt.length} characters`);

    const manusResult = await createManusTask(manusPrompt);

    log(`  > Manus task created: ${manusResult.taskId}`);
    log(`  > Share URL: ${manusResult.shareUrl}`);

    // Update with Manus task info
    await supabase
      .from('user_reports')
      .update({
        manus_task_id: manusResult.taskId,
        manus_share_url: manusResult.shareUrl,
        manus_task_status: 'pending',
        manus_task_created_at: new Date().toISOString(),
        debug_logs: logs.join('\n'),
        updated_at: new Date().toISOString()
      })
      .eq('id', report.id);

    log('✅ Report processing completed successfully');
    log('⏳ Waiting for Manus webhook to complete slide generation');
    log('================================================\n');

    return { success: true, reportId: report.id };

  } catch (error: any) {
    log(`❌ Error processing report: ${error.message}`);

    // Update with error status
    await supabase
      .from('user_reports')
      .update({
        status: 'failed',
        report_error: error.message,
        debug_logs: logs.join('\n'),
        updated_at: new Date().toISOString()
      })
      .eq('id', report.id);

    return { success: false, reportId: report.id, error: error.message };
  }
}

// Main server handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔄 Process User Reports Edge Function invoked');

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Query for pending reports
    const { data: pendingReports, error: queryError } = await supabase
      .from('user_reports')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1); // Process one at a time

    if (queryError) {
      throw queryError;
    }

    if (!pendingReports || pendingReports.length === 0) {
      console.log('✅ No pending reports to process');
      return new Response(
        JSON.stringify({ message: 'No pending reports', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📋 Found ${pendingReports.length} pending report(s)`);

    // Process the report
    const report = pendingReports[0];
    const result = await processReport(report, supabase);

    return new Response(
      JSON.stringify({
        message: 'Report processed',
        processed: 1,
        result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('❌ Edge Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
