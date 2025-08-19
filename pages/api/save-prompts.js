import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompts, totalQuestions } = req.body;

    if (!prompts || typeof prompts !== 'object') {
      return res.status(400).json({ error: 'Prompts data is required' });
    }

    const totalQuestionsCount = totalQuestions || Object.keys(prompts).length || 40;

    // 更新总问题数设置
    const { error: settingsError } = await supabase
      .from('prompts_settings')
      .upsert({
        setting_key: 'total_questions',
        setting_value: totalQuestionsCount,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      });

    if (settingsError) {
      console.error('❌ Error updating settings:', settingsError);
      return res.status(500).json({ error: 'Failed to update settings' });
    }

    // 准备prompts数据进行批量插入/更新
    const promptsToUpsert = [];
    const updatedQuestions = [];

    for (const [questionNumber, promptContent] of Object.entries(prompts)) {
      if (promptContent && promptContent.trim() !== '') {
        promptsToUpsert.push({
          question_number: parseInt(questionNumber),
          prompt_content: promptContent.trim(),
          updated_at: new Date().toISOString()
        });
        updatedQuestions.push(questionNumber);
      }
    }

    // 批量插入/更新prompts
    if (promptsToUpsert.length > 0) {
      const { error: promptsError } = await supabase
        .from('prompts_config')
        .upsert(promptsToUpsert, {
          onConflict: 'question_number'
        });

      if (promptsError) {
        console.error('❌ Error upserting prompts:', promptsError);
        return res.status(500).json({ error: 'Failed to save prompts' });
      }
    }

    // 删除空的prompts（如果用户清空了某个问题）
    const emptyQuestions = [];
    for (const [questionNumber, promptContent] of Object.entries(prompts)) {
      if (!promptContent || promptContent.trim() === '') {
        emptyQuestions.push(parseInt(questionNumber));
      }
    }

    if (emptyQuestions.length > 0) {
      const { error: deleteError } = await supabase
        .from('prompts_config')
        .delete()
        .in('question_number', emptyQuestions);

      if (deleteError) {
        console.error('❌ Error deleting empty prompts:', deleteError);
        // 不返回错误，因为删除空记录失败不是致命错误
      }
    }

    console.log('✅ Prompts saved to Supabase database');
    console.log('📊 Default total questions updated to:', totalQuestionsCount);
    console.log('📋 Updated question contents:', updatedQuestions);

    res.status(200).json({ 
      success: true, 
      message: 'Prompts saved successfully',
      totalQuestions: totalQuestionsCount,
      updatedQuestions: updatedQuestions
    });

  } catch (error) {
    console.error('❌ Error saving prompts:', error);
    res.status(500).json({ 
      error: 'Failed to save prompts', 
      message: error.message 
    });
  }
}