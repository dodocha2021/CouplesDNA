import axios from 'axios';

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

    const questionsCount = totalQuestions || 1; // 默认40个问题

    console.log('🔄 Final Report API: Sending request to n8n webhook...');
    console.log('📋 Session ID:', sessionId);
    console.log('📊 Total Questions:', questionsCount);
    
    // 动态构建问题对象
    const questionsObject = {
      "sessionId": sessionId,
      "totalQuestions": questionsCount // 传递总问题数给n8n
    };
    
    // 动态添加问题
    for (let i = 1; i <= questionsCount; i++) {
      questionsObject[`question ${i}`] = "";
    }
    
    // 设置默认的前两个问题
    if (questionsCount >= 1) questionsObject["question 1"] = `From lalaland script, Analyze the available relationship data to calculate the probability of long-term relationship success based on current patterns and dynamics. Use structured components in your response, not just markdown.

Focus on:
1) Current success rate estimation based on observable patterns → Use a "rating-bar" block with label and score.
2) Contributions of different relationship aspects → Use a "table" block for percentage breakdown by factor.
3) Key success factors identified → Use a "list" or "accordion" block summarizing top factors.
4) Comprehensive compatibility assessment → Use "stat" cards or "rating-bar" blocks.
5) Statistical viability analysis → Use a "chart" block if applicable.

Provide percentage probabilities where calculable, support with data, and return as JSON with these blocks.`;
    if (questionsCount >= 2) questionsObject["question 2"] = `From Lalaland script,Provide practical techniques for balancing emotional investment based on emotional weight disparities in the data. Design gradual implementation of emotional synchronization exercises, establish regular emotional check-in systems, develop shared emotional expression methods, maintain emotional safety boundaries, and implement gradual improvement with safety considerations. Present progressive implementation plans with safety considerations.`;
    
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