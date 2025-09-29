
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

// Initialize all clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { systemPrompt, userPrompt, model } = req.body;

    if (!userPrompt || !model) {
      return res.status(400).json({ error: 'A user prompt and a model are required.' });
    }

    let generatedResponse;

    // Check which model provider to use based on the model name
    if (model.includes('claude')) {
      console.log(`Running prompt with Anthropic model: ${model}`);
      try {
        const msg = await anthropic.messages.create({
            model: model,
            max_tokens: 4096,
            ...(systemPrompt && { system: systemPrompt }),
            messages: [{ role: 'user', content: userPrompt }],
        });
        generatedResponse = msg.content[0].text;
      } catch (error) {
          console.error('Error calling Anthropic model:', error);
          if (error.message.includes('credit balance is too low')) {
              return res.status(402).json({ error: 'Anthropic API call failed: Credit balance is too low. Please check your Anthropic account billing.' });
          }
          throw error;
      }
    } else if (model.includes('gemini')) {
      console.log(`Running prompt with Google model: ${model}`);
      const geminiModel = genAI.getGenerativeModel({ model: model });
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;
      const result = await geminiModel.generateContent(fullPrompt);
      const response = await result.response;
      generatedResponse = await response.text();
    } else if (model.includes('gpt')) {
        console.log(`Running prompt with OpenAI model: ${model}`);
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: userPrompt });

        const completion = await openai.chat.completions.create({
            messages: messages,
            model: model,
        });
        generatedResponse = completion.choices[0].message.content;
    } else {
      return res.status(400).json({ error: `Unsupported model: ${model}. Please select a model containing 'claude', 'gemini', or 'gpt'.` });
    }

    res.status(200).json({ response: generatedResponse });

  } catch (error) {
    console.error(`Failed to run prompt:`, error);
    res.status(500).json({ error: `Failed to run prompt: ${error.message}` });
  }
}
