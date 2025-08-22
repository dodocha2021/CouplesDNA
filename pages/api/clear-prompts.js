import { supabase, getUserFromRequest } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user identity
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('🔄 Clearing all prompts from Supabase database...');
    
    // Delete all prompt records for the current user
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

    // Reset the total number of questions for the current user to the default value
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
      // Do not return an error, as resetting settings failure is not a fatal error
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