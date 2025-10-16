import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from 'openai';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function callAI(prompt, model, systemPrompt = null) {
  let generatedResponse;

  if (model.includes('claude')) {
    const messages = [{ role: 'user', content: prompt }];
    const msg = await anthropic.messages.create({
        model: model,
        max_tokens: 4096,
        ...(systemPrompt && { system: systemPrompt }),
        messages: messages,
    });
    generatedResponse = msg.content[0].text;

  } else if (model.includes('gemini')) {
    // 修复模型名称格式
    let geminiModelName = model;
    if (model === 'gemini-1.5-pro') {
      geminiModelName = 'gemini-1.5-pro-latest';  // 或 'gemini-pro'
    } else if (model === 'gemini-1.5-flash') {
      geminiModelName = 'gemini-1.5-flash-latest';  // 或 'gemini-flash'
    }
    
    const geminiModel = genAI.getGenerativeModel({ model: geminiModelName });
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
    const result = await geminiModel.generateContent(fullPrompt);
    generatedResponse = (await result.response).text();

  } else if (model.includes('gpt')) {
    const messages = [{ role: "user", content: prompt }];
    if (systemPrompt) {
        messages.unshift({ role: "system", content: systemPrompt });
    }
    const completion = await openai.chat.completions.create({ messages, model });
    generatedResponse = completion.choices[0].message.content;

  } else {
    throw new Error(`Unsupported model: ${model}`);
  }

  return generatedResponse;
}
