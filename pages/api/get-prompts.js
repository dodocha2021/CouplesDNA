import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 从数据库获取总问题数设置
    const { data: settingsData, error: settingsError } = await supabase
      .from('prompts_settings')
      .select('setting_value')
      .eq('setting_key', 'total_questions')
      .single();

    if (settingsError) {
      console.error('❌ Error fetching settings:', settingsError);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }

    const totalQuestions = settingsData?.setting_value || 40;

    // 从数据库获取所有prompts
    const { data: promptsData, error: promptsError } = await supabase
      .from('prompts_config')
      .select('question_number, prompt_content')
      .order('question_number', { ascending: true });

    if (promptsError) {
      console.error('❌ Error fetching prompts:', promptsError);
      return res.status(500).json({ error: 'Failed to fetch prompts' });
    }

    // 构建prompts对象
    const prompts = {};
    
    // 先初始化所有问题为空字符串
    for (let i = 1; i <= totalQuestions; i++) {
      prompts[i] = '';
    }
    
    // 填充数据库中的内容
    if (promptsData) {
      promptsData.forEach(item => {
        prompts[item.question_number] = item.prompt_content || '';
      });
    }

    console.log('✅ Retrieved prompts from Supabase database');
    console.log('📊 Total questions:', totalQuestions);
    console.log('📋 Found prompts for questions:', Object.keys(prompts).filter(key => prompts[key] !== ''));

    res.status(200).json({ 
      success: true, 
      prompts: prompts,
      totalQuestions: totalQuestions
    });

  } catch (error) {
    console.error('❌ Error reading prompts:', error);
    res.status(500).json({ 
      error: 'Failed to read prompts', 
      message: error.message 
    });
  }
}