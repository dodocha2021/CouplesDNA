import { callAI } from '@/lib/ai/client';
import { getUserFromRequest } from '@/lib/supabase';
import { getPromptConfig } from '@/lib/ai/prompts';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { mode, ...params } = req.body;
    
    let response;
    
    // 模式1: 直接调用
    if (mode === 'direct' || !mode) {
      const { model, userPrompt, systemPrompt, options } = params;
      
      if (!model || !userPrompt) {
        return res.status(400).json({ error: 'model and userPrompt are required' });
      }
      
      response = await callAI(model, userPrompt, systemPrompt, options);
    }
    
    // 模式2: 使用数据库中的prompt配置
    else if (mode === 'user-prompt') {
      const user = await getUserFromRequest(req);
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { promptId, userData, overrides } = params;
      
      if (!promptId || !userData) {
        return res.status(400).json({ error: 'promptId and userData are required' });
      }
      
      // 从数据库获取prompt配置
      const promptConfig = await getPromptConfig(user.id, promptId);
      
      const model = overrides?.model || promptConfig.model;
      const systemPrompt = overrides?.systemPrompt || promptConfig.system_prompt;
      
      // 替换模板中的占位符
      let userPrompt = promptConfig.user_prompt_template;
      if (typeof userData === 'object') {
        Object.keys(userData).forEach(key => {
          userPrompt = userPrompt.replace(new RegExp(`{${key}}`, 'g'), userData[key]);
        });
      } else {
        userPrompt = userPrompt.replace(/{userInput}/g, userData);
      }
      
      const options = {
        temperature: overrides?.temperature || promptConfig.temperature,
        max_tokens: overrides?.max_tokens || promptConfig.max_tokens,
        top_p: overrides?.top_p || promptConfig.top_p
      };
      
      response = await callAI(model, userPrompt, systemPrompt, options);
    }
    
    else {
      return res.status(400).json({ error: 'Invalid mode. Use "direct" or "user-prompt".' });
    }
    
    res.status(200).json({ 
      success: true,
      response: response.content,
      usage: response.usage,
      model: response.model
    });

  } catch (error) {
    console.error('AI call failed:', error);
    res.status(500).json({ error: error.message });
  }
}
