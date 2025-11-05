// 这个文件保留是为了向后兼容
// 新代码请使用 /pages/api/ai.js
import { callAI } from '@/lib/ai/client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { systemPrompt, userPrompt, model } = req.body;

    if (!userPrompt || !model) {
      return res.status(400).json({ error: 'userPrompt and model are required' });
    }

    const result = await callAI(model, userPrompt, systemPrompt);
    res.status(200).json({ response: result.content });

  } catch (error) {
    console.error('Failed to run prompt:', error);
    res.status(500).json({ error: `Failed to run prompt: ${error.message}` });
  }
}
