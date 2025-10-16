// OpenRouter 配置
export const OPENROUTER_CONFIG = {
  apiKey: process.env.OPENROUTER_API_KEY,
  baseUrl: 'https://openrouter.ai/api/v1'
};

// 支持的模型列表
export const MODELS = {
  // Anthropic Claude
  'anthropic/claude-sonnet-4.5': {
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    description: '最新的Claude Sonnet模型',
    contextWindow: 200000,
    pricing: { prompt: 0.003, completion: 0.015 },
    defaultParams: {
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 1.0
    }
  },
  'anthropic/claude-sonnet-4': {
    name: 'Claude Sonnet 4',
    provider: 'Anthropic',
    description: 'Claude Sonnet 4',
    contextWindow: 200000,
    pricing: { prompt: 0.003, completion: 0.015 },
    defaultParams: {
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 1.0
    }
  },
  'anthropic/claude-3.7-sonnet': {
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    description: 'Claude 3.7 Sonnet',
    contextWindow: 200000,
    pricing: { prompt: 0.003, completion: 0.015 },
    defaultParams: {
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 1.0
    }
  },
  
  // OpenAI
  'openai/o3-deep-research': {
    name: 'O3 Deep Research',
    provider: 'OpenAI',
    description: 'OpenAI深度研究模型',
    contextWindow: 128000,
    pricing: { prompt: 0.01, completion: 0.03 },
    defaultParams: {
      temperature: 1.0,
      max_tokens: 8192,
      top_p: 1.0
    }
  },
  'openai/gpt-5-pro': {
    name: 'GPT-5 Pro',
    provider: 'OpenAI',
    description: 'GPT-5专业版',
    contextWindow: 128000,
    pricing: { prompt: 0.01, completion: 0.03 },
    defaultParams: {
      temperature: 1.0,
      max_tokens: 4096,
      top_p: 1.0
    }
  },
  'openai/gpt-5-chat': {
    name: 'GPT-5 Chat',
    provider: 'OpenAI',
    description: 'GPT-5聊天版',
    contextWindow: 128000,
    pricing: { prompt: 0.005, completion: 0.015 },
    defaultParams: {
      temperature: 1.0,
      max_tokens: 4096,
      top_p: 1.0
    }
  },
  'openai/gpt-5-mini': {
    name: 'GPT-5 Mini',
    provider: 'OpenAI',
    description: 'GPT-5迷你版',
    contextWindow: 128000,
    pricing: { prompt: 0.001, completion: 0.003 },
    defaultParams: {
      temperature: 1.0,
      max_tokens: 4096,
      top_p: 1.0
    }
  },
  'openai/o3-pro': {
    name: 'O3 Pro',
    provider: 'OpenAI',
    description: 'OpenAI O3专业版',
    contextWindow: 128000,
    pricing: { prompt: 0.01, completion: 0.03 },
    defaultParams: {
      temperature: 1.0,
      max_tokens: 4096,
      top_p: 1.0
    }
  },
  
  // DeepSeek
  'deepseek/deepseek-v3.2-exp': {
    name: 'DeepSeek V3.2 Exp',
    provider: 'DeepSeek',
    description: 'DeepSeek实验版本',
    contextWindow: 64000,
    pricing: { prompt: 0.0002, completion: 0.0006 },
    defaultParams: {
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 1.0
    }
  },
  
  // Google
  'google/gemini-2.5-flash-preview-09-2025': {
    name: 'Gemini 2.5 Flash Preview',
    provider: 'Google',
    description: 'Gemini 2.5 Flash预览版',
    contextWindow: 1000000,
    pricing: { prompt: 0.0001, completion: 0.0004 },
    defaultParams: {
      temperature: 0.7,
      max_tokens: 8192,
      top_p: 1.0
    }
  },
  
  // xAI
  'x-ai/grok-4-fast': {
    name: 'Grok 4 Fast',
    provider: 'xAI',
    description: 'Grok 4快速版',
    contextWindow: 128000,
    pricing: { prompt: 0.005, completion: 0.015 },
    defaultParams: {
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 1.0
    }
  }
};

// 获取模型的默认参数
export function getModelDefaults(modelId) {
  const model = MODELS[modelId];
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  return {
    model: modelId,
    ...model.defaultParams
  };
}

// 获取所有模型列表（按provider分组）
export function getModelsByProvider() {
  const grouped = {};
  Object.entries(MODELS).forEach(([id, config]) => {
    if (!grouped[config.provider]) {
      grouped[config.provider] = [];
    }
    grouped[config.provider].push({
      id,
      ...config
    });
  });
  return grouped;
}

// 获取所有模型列表（扁平）
export function getAllModels() {
  return Object.entries(MODELS).map(([id, config]) => ({
    id,
    ...config
  }));
}
