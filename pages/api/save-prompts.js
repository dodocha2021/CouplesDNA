import { supabase, getUserFromRequest } from '../../lib/supabase';

export default async function handler(req, res) {
  console.log('🚀 save-prompts API called');
  console.log('📡 Method:', req.method);
  console.log('📦 Body:', req.body);
  
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔐 Starting user authentication...');
    // 验证用户身份
    const user = await getUserFromRequest(req, res);
    
    if (!user) {
      console.log('❌ User authentication failed');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('✅ User authenticated:', user.id);
    
    const { prompts, totalQuestions } = req.body;
    console.log('📝 Received prompts:', prompts);
    console.log('📊 Received totalQuestions:', totalQuestions);

    if (!prompts || typeof prompts !== 'object') {
      return res.status(400).json({ error: 'Prompts data is required' });
    }

    const totalQuestionsCount = totalQuestions || Object.keys(prompts).length || 1;

    // 更新总问题数设置（只更新当前用户的）
    const { error: settingsError } = await supabase
      .from('prompts_settings')
      .upsert({
        user_id: user.id,
        setting_key: 'total_questions',
        setting_value: totalQuestionsCount,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,setting_key'
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
          user_id: user.id,
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
          onConflict: 'user_id,question_number'
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

    // 删除超出totalQuestions范围的所有问题（用户删除问题的情况）
    const { error: deleteExcessError } = await supabase
      .from('prompts_config')
      .delete()
      .eq('user_id', user.id)
      .gt('question_number', totalQuestionsCount);

    if (deleteExcessError) {
      console.error('❌ Error deleting excess prompts:', deleteExcessError);
    } else {
      console.log('✅ Deleted prompts beyond question', totalQuestionsCount);
    }

    // 删除空的prompts
    if (emptyQuestions.length > 0) {
      const { error: deleteError } = await supabase
        .from('prompts_config')
        .delete()
        .eq('user_id', user.id)
        .in('question_number', emptyQuestions);

      if (deleteError) {
        console.error('❌ Error deleting empty prompts:', deleteError);
        // 不返回错误，因为删除空记录失败不是致命错误
      } else {
        console.log('✅ Deleted empty prompts:', emptyQuestions);
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
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to save prompts', 
      message: error.message,
      details: error.stack
    });
  }
}