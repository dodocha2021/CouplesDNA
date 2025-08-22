import { supabase, getUserFromRequest } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user identity
    const user = await getUserFromRequest(req, res);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get total question count settings from the database (only for the current user)
    const { data: settingsData, error: settingsError } = await supabase
      .from('prompts_settings')
      .select('setting_value')
      .eq('setting_key', 'total_questions')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError) {
      console.error('❌ Error fetching settings:', settingsError);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }

    const totalQuestions = settingsData?.setting_value || 1;

    // Get all prompts from the database (only for the current user)
    const { data: promptsData, error: promptsError } = await supabase
      .from('prompts_config')
      .select('question_number, prompt_content')
      .eq('user_id', user.id)
      .order('question_number', { ascending: true });

    if (promptsError) {
      console.error('❌ Error fetching prompts:', promptsError);
      return res.status(500).json({ error: 'Failed to fetch prompts' });
    }

    // Build prompts object
    const prompts = {};
    
    // Initialize all questions as empty strings first
    for (let i = 1; i <= totalQuestions; i++) {
      prompts[i] = '';
    }
    
    // Populate content from the database
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