import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * 从数据库获取指定用户的prompt配置
 * @param {string} userId - 用户ID
 * @param {string} promptId - Prompt ID
 */
export async function getPromptConfig(userId, promptId) {
  const { data, error } = await supabase
    .from('prompts_config')
    .select('*')
    .eq('user_id', userId)
    .eq('id', promptId)
    .single();

  if (error) {
    throw new Error(`Failed to get prompt config: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Prompt config not found: ${promptId}`);
  }

  return data;
}

/**
 * 获取用户的所有prompt配置
 * @param {string} userId - 用户ID
 */
export async function getAllPromptConfigs(userId) {
  const { data, error } = await supabase
    .from('prompts_config')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get prompt configs: ${error.message}`);
  }

  return data || [];
}

/**
 * 保存prompt配置到数据库
 * @param {string} userId - 用户ID
 * @param {object} promptData - Prompt数据
 */
export async function savePromptConfig(userId, promptData) {
  const { data, error } = await supabase
    .from('prompts_config')
    .insert({
      user_id: userId,
      name: promptData.name,
      system_prompt: promptData.systemPrompt,
      user_prompt_template: promptData.userPromptTemplate,
      model: promptData.model,
      temperature: promptData.temperature,
      max_tokens: promptData.maxTokens,
      top_p: promptData.topP,
      is_default: promptData.isDefault || false,
      tags: promptData.tags || []
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save prompt config: ${error.message}`);
  }

  return data;
}
