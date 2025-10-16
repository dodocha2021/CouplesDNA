import { OPENROUTER_CONFIG, getModelDefaults } from './config';

/**
 * 调用 OpenRouter API
 * @param {string} model - 模型ID
 * @param {Array} messages - 消息数组 [{role: 'system', content: '...'}, {role: 'user', content: '...'}]
 * @param {object} options - 可选参数
 */
export async function callOpenRouter(model, messages, options = {}) {
  const defaults = getModelDefaults(model);
  
  const requestBody = {
    model: model,
    messages: messages,
    temperature: options.temperature ?? defaults.temperature,
    max_tokens: options.max_tokens ?? defaults.max_tokens,
    top_p: options.top_p ?? defaults.top_p,
    ...(options.stream && { stream: true })
  };

  const response = await fetch(`${OPENROUTER_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': options.referer || 'https://couplesdna.com',
      'X-Title': options.appName || 'CouplesDNA'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    model: data.model,
    usage: data.usage,
    finish_reason: data.choices[0].finish_reason
  };
}

/**
 * 简化调用 - 直接传入 system prompt 和 user prompt
 */
export async function callAI(model, userPrompt, systemPrompt = null, options = {}) {
  const messages = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  messages.push({ role: 'user', content: userPrompt });
  
  return callOpenRouter(model, messages, options);
}
