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

    const questionsCount = totalQuestions || 2; // 默认40个问题

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
    if (questionsCount >= 1) questionsObject["question 1"] = `according conversation, Analyze the available relationship data to understand behavioral patterns and consistency between actions and emotions for both partners. Look for evidence of how each person's contributions align with their emotional investment, and examine different behavioral approaches (high effort/high emotion vs other combinations). Focus on: 1) How contribution levels correlate with emotional investment for each partner, 2) Different behavioral pattern categories and their implications, 3) Consistency and change trends in behavioral patterns, 4) How partner behavioral patterns coordinate or conflict, 5) Possibilities and resistance factors for behavioral adjustment. Present your analysis with evidence about behavioral consistency and insights about potential for positive change in relationship dynamics.`;
    if (questionsCount >= 2) questionsObject["question 2"] = `according conversation, Analyze the available relationship data to calculate the probability of long-term relationship success based on current patterns and dynamics. Look for compatibility indicators, relationship health signs, and success factors evident in their interactions and behaviors. Assess various relationship aspects by their importance to long-term viability. Focus on: 1) Current success rate estimation based on observable patterns, 2) How different relationship aspects contribute to overall success potential, 3) Key success factors identified from their dynamics, 4) Comprehensive compatibility assessment from available evidence, 5) Statistical viability analysis supported by behavioral data. Present percentage probabilities where calculable with supporting evidence and reasoning for your assessment of their relationship's long-term potential.`;
    
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