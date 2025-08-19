import axios from 'axios';
import { supabase } from '../../lib/supabase';

const N8N_WEBHOOK = 'https://couplesdna.app.n8n.cloud/webhook-test/81134b04-e2f5-4661-ae0b-6d6ef6d83123';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, totalQuestions } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const questionsCount = totalQuestions || 5; // 默认40个问题

    console.log('🔄 Final Report API: Sending request to n8n webhook...');
    console.log('📋 Session ID:', sessionId);
    console.log('📊 Total Questions:', questionsCount);
    
    // 动态构建问题对象
    const questionsObject = {
      "sessionId": sessionId,
      "totalQuestions": questionsCount // 传递总问题数给n8n
    };
    
    // 从数据库获取prompts
    console.log('🔄 Loading prompts from database...');
    const { data: promptsData, error: promptsError } = await supabase
      .from('prompts_config')
      .select('question_number, prompt_content')
      .lte('question_number', questionsCount)
      .order('question_number', { ascending: true });

    if (promptsError) {
      console.error('❌ Error loading prompts from database:', promptsError);
      return res.status(500).json({ 
        error: 'Failed to load prompts from database',
        message: promptsError.message,
        sessionId: sessionId,
        status: 'error'
      });
    }

    if (!promptsData || promptsData.length === 0) {
      console.error('❌ No prompts found in database');
      return res.status(400).json({ 
        error: 'No prompts found',
        message: 'Please configure prompts in the database first',
        sessionId: sessionId,
        status: 'error'
      });
    }

    // 验证prompts数量和连续性
    if (promptsData.length !== questionsCount) {
      console.error(`❌ Expected ${questionsCount} prompts, found ${promptsData.length}`);
      return res.status(400).json({ 
        error: 'Incomplete prompts',
        message: `Expected ${questionsCount} prompts, but found ${promptsData.length} in database`,
        sessionId: sessionId,
        status: 'error'
      });
    }

    // 检查连续性 (1,2,3...)
    for (let i = 0; i < promptsData.length; i++) {
      const expectedNumber = i + 1;
      if (promptsData[i].question_number !== expectedNumber) {
        console.error(`❌ Missing or non-sequential question number: expected ${expectedNumber}, found ${promptsData[i].question_number}`);
        return res.status(400).json({ 
          error: 'Non-sequential prompts',
          message: `Questions must be sequential (1,2,3...). Missing question ${expectedNumber}`,
          sessionId: sessionId,
          status: 'error'
        });
      }

      // 检查内容是否为空
      if (!promptsData[i].prompt_content || promptsData[i].prompt_content.trim() === '') {
        console.error(`❌ Empty prompt content for question ${expectedNumber}`);
        return res.status(400).json({ 
          error: 'Empty prompt content',
          message: `Question ${expectedNumber} has empty content`,
          sessionId: sessionId,
          status: 'error'
        });
      }
    }

    // 动态添加从数据库获取的问题
    promptsData.forEach(prompt => {
      questionsObject[`question ${prompt.question_number}`] = prompt.prompt_content.trim();
    });

    console.log('✅ Successfully loaded', promptsData.length, 'prompts from database');
    
    // 发送请求到 n8n 并等待响应
    try {
      const response = await axios.post(N8N_WEBHOOK, [
        questionsObject
      ], { 
        headers: { 'Content-Type': 'application/json' },
        timeout: 90000 // 90秒超时（Cloudflare限制是100秒）
      });

      console.log('✅ Final Report API: n8n response received:', response.data);
      
      // 返回成功响应
      res.status(200).json({ 
        success: true, 
        message: 'Final report generated successfully',
        sessionId: sessionId,
        status: 'completed',
        data: response.data
      });
      
    } catch (error) {
      console.error('❌ Final Report API: Error calling n8n webhook:', error);
      console.error('❌ Final Report API: Error details:', {
        sessionId: sessionId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: N8N_WEBHOOK
      });
      
      // 检查是否是404错误（webhook不存在）
      if (error.response?.status === 404) {
        res.status(500).json({ 
          success: false,
          error: 'Webhook not found', 
          message: 'The webhook URL is not valid or not registered. Please check the webhook configuration in n8n.',
          sessionId: sessionId,
          status: 'error',
          details: error.response?.data
        });
      } else {
        // 返回错误响应
        res.status(500).json({ 
          success: false,
          error: 'Failed to generate report', 
          message: error.response?.data?.message || error.message,
          sessionId: sessionId,
          status: 'error'
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Final Report API: Error in handler:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error', 
      message: error.message,
      status: 'error'
    });
  }
} 