import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import services
import { generateEmbedding } from "./service-embeddings.ts";
import { callAI } from "./service-ai.ts";
import { createManusTask } from "./service-manus.ts";
import { retrieveKnowledge, retrieveUserData, buildRAGContext, RAGScope } from "./service-rag.ts";
import { getUserProfileContext } from "./service-profile.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Support both single file (legacy) and multiple files (new)
    let selectedFileIds: string[] = [];
    if (report.user_data_ids && Array.isArray(report.user_data_ids) && report.user_data_ids.length > 0) {
      selectedFileIds = report.user_data_ids;
      log(`User Data IDs: ${selectedFileIds.join(', ')}`);
    } else if (report.user_data_id) {
      selectedFileIds = [report.user_data_id];
      log(`User Data ID (legacy): ${report.user_data_id}`);
    } else {
      throw new Error('No user data files specified');
    }

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

    // Step 2: Get user data files metadata
    log('[2/5] Fetching user data file(s)...');
    const { data: userDataFiles, error: userDataError } = await supabase
      .from('user_uploads')
      .select('id, file_name')
      .in('id', selectedFileIds);

    if (userDataError || !userDataFiles || userDataFiles.length === 0) {
      throw new Error('User data file(s) not found');
    }

    userDataFiles.forEach((file: any) => {
      log(`  > User file: ${file.file_name}`);
    });

    // Step 3: Generate report using RAG
    log('[3/5] Generating report with AI...');

    const question = report.report_topic || report.setting_name;
    log(`  > Question: ${question}`);

    // Generate embedding
    const questionEmbedding = await generateEmbedding(question);
    const vectorString = `[${questionEmbedding.join(',')}]`;

    // Fetch knowledge files metadata for categories
    const { data: knowledgeFiles, error: knowledgeError } = await supabase
      .from('knowledge_uploads')
      .select('id, file_name, metadata')
      .in('id', report.selected_knowledge_ids);

    if (knowledgeError) {
      log(`⚠️ Warning: Could not fetch knowledge file metadata: ${knowledgeError.message}`);
    }

    // Parse category_thresholds
    let categoryThresholds: any = {};
    if (report.category_thresholds) {
      if (typeof report.category_thresholds === 'string') {
        try {
          categoryThresholds = JSON.parse(report.category_thresholds);
        } catch (e) {
          log(`⚠️ Warning: Could not parse category_thresholds: ${e}`);
        }
      } else {
        categoryThresholds = report.category_thresholds;
      }
    }

    // Build scope with correct thresholds per file
    const scope: RAGScope[] = report.selected_knowledge_ids.map((fileId: string) => {
      const file = knowledgeFiles?.find((f: any) => f.id === fileId);
      const category = file?.metadata?.category || 'General';
      const threshold = categoryThresholds[category] || 0.30;

      log(`  > File: ${file?.file_name || fileId}, Category: ${category}, Threshold: ${threshold}`);

      return { file_id: fileId, threshold };
    });

    log(`  > Knowledge scope: ${scope.length} files`);

    // Retrieve knowledge chunks
    const knowledgeResults = await retrieveKnowledge(
      questionEmbedding,
      supabase,
      scope,
      report.top_k_results || 5,
      log
    );

    log(`  > Found ${knowledgeResults.length} knowledge chunks`);

    // Retrieve user data chunks
    const userDataResults = await retrieveUserData(
      questionEmbedding,
      supabase,
      report.user_id,
      selectedFileIds,
      report.top_k_results || 5
    );

    log(`  > Found ${userDataResults.length} user data chunks`);

    // Build context
    const { knowledgeContext, userDataContext } = buildRAGContext(
      knowledgeResults,
      userDataResults
    );

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

    // Get user profile context
    const userProfileText = await getUserProfileContext(supabase, report.user_id, log);

    // Build Manus prompt with user profile context
    const manusPromptBase = report.manus_prompt || 'Create a professional presentation with slides based on this report in english: ';
    const manusPrompt = manusPromptBase + '\n\n' + userProfileText + aiResult.content;

    log(`  > Manus prompt length: ${manusPrompt.length} characters`);

    const manusResult = await createManusTask(manusPrompt);

    log(`  > Manus task created: ${manusResult.taskId}`);
    log(`  > Share URL: ${manusResult.shareUrl}`);

    // Update with Manus task info
    log('💾 Saving Manus task info to database...');
    const { error: manusUpdateError } = await supabase
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

    if (manusUpdateError) {
      throw new Error(`Failed to save Manus task info: ${manusUpdateError.message}`);
    }
    log('✅ Manus task info saved to database');

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
      .limit(1);

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
