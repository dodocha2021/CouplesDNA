import { supabase, getUserFromRequest } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 验证用户身份
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('🔄 Clearing all prompts from Supabase database...');
    
    // 删除所有当前用户的prompts记录
    const { error: deleteError } = await supabase
      .from('prompts_config')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ Error deleting prompts:', deleteError);
      return res.status(500).json({ 
        error: 'Failed to clear prompts',
        message: deleteError.message 
      });
    }

    // 重置当前用户的总问题数为默认值
    const { error: settingsError } = await supabase
      .from('prompts_settings')
      .update({
        setting_value: 40,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('setting_key', 'total_questions');

    if (settingsError) {
      console.error('❌ Error resetting settings:', settingsError);
      // 不返回错误，因为重置设置失败不是致命错误
    }

    console.log('✅ All prompts cleared from Supabase database');

    res.status(200).json({ 
      success: true, 
      message: 'Successfully cleared all prompts from database'
    });

  } catch (error) {
    console.error('❌ Error clearing prompts:', error);
    res.status(500).json({ 
      error: 'Failed to clear prompts', 
      message: error.message 
    });
  }
}