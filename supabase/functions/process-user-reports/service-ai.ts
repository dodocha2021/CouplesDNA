/**
 * Service: AI (OpenRouter)
 * Handles AI model API calls via OpenRouter
 */

export interface AIResponse {
  content: string;
  usage: any;
  model: string;
}

export interface AIOptions {
  temperature?: number;
  max_tokens?: number;
}

/**
 * Call OpenRouter AI to generate text
 * @param model - Model identifier (e.g., "anthropic/claude-3.5-sonnet")
 * @param userPrompt - User prompt/question
 * @param systemPrompt - System instruction prompt
 * @param options - Optional parameters (temperature, max_tokens)
 * @returns AI response with content, usage stats, and model info
 */
export async function callAI(
  model: string,
  userPrompt: string,
  systemPrompt: string,
  options: AIOptions = {}
): Promise<AIResponse> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  // Log request details
  console.log('🤖 OpenRouter API Request:');
  console.log(`  > Model: ${model}`);
  console.log(`  > System prompt length: ${systemPrompt.length} chars`);
  console.log(`  > User prompt length: ${userPrompt.length} chars`);
  console.log(`  > Temperature: ${options.temperature || 0.7}`);
  console.log(`  > Max tokens: ${options.max_tokens || 4000}`);

  const requestBody = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: options.temperature || 0.7,
    max_tokens: options.max_tokens || 4000,
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  console.log(`📡 OpenRouter API Response Status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ OpenRouter API Error: ${response.status}`);
    console.error(`❌ Error details: ${errorText}`);
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Log full response for debugging
  console.log('📦 OpenRouter API Full Response:');
  console.log(JSON.stringify(data, null, 2));

  // Validate response structure
  if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
    console.error('❌ Invalid response structure: no choices array');
    throw new Error('Invalid OpenRouter API response: missing choices array');
  }

  if (!data.choices[0].message || typeof data.choices[0].message.content !== 'string') {
    console.error('❌ Invalid response structure: no message content');
    throw new Error('Invalid OpenRouter API response: missing message content');
  }

  const content = data.choices[0].message.content;

  // Check if content is suspiciously short
  if (content.length < 100) {
    console.warn(`⚠️ WARNING: AI response is very short (${content.length} chars)`);
    console.warn(`⚠️ Content: "${content}"`);
  }

  // Log usage information
  if (data.usage) {
    console.log('📊 Token Usage:');
    console.log(`  > Prompt tokens: ${data.usage.prompt_tokens || 'N/A'}`);
    console.log(`  > Completion tokens: ${data.usage.completion_tokens || 'N/A'}`);
    console.log(`  > Total tokens: ${data.usage.total_tokens || 'N/A'}`);
  }

  console.log(`✅ AI response received: ${content.length} characters`);

  return {
    content: content,
    usage: data.usage,
    model: data.model,
  };
}
