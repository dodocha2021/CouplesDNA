import axios from 'axios';

const N8N_WEBHOOK = 'https://couplesdna.app.n8n.cloud/webhook-test/81134b04-e2f5-4661-ae0b-6d6ef6d83123';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    console.log('🔄 Final Report API: Sending request to n8n webhook...');
    console.log('📋 Session ID:', sessionId);
    
    // 发送请求到 n8n 并等待响应
    try {
      const response = await axios.post(N8N_WEBHOOK, [
        {
          "sessionId": sessionId,
          "question 1": "Analyze the user dataset to identify how this couple first met, their initial emotional connection development, and early attraction factors. Extract timeline data, first interaction details, emotional bonding process, and initial impressions. Present this as a comprehensive origin story with specific dates, key emotional moments, and the progression of their early connection. Include quantitative data about early communication frequency and emotional intensity development.",
          "question 2": "Analyze the available relationship data to understand early interactions and supportive behaviors between the partners. Look for any information about early dates, thoughtful gestures, caring actions, or romantic behaviors - this could be mentioned in conversations, described in stories, or documented in messages. Examine patterns of who provides support and how it's received. If specific 'Supportive Gestures' scores exist, use them; otherwise, analyze qualitative descriptions to assess contribution levels. Focus on: 1) Key early dating experiences and their emotional impact, 2) Examples of supportive actions and their frequency, 3) How caring behaviors are expressed and received, 4) Early investment patterns and reciprocity. Present your analysis with available evidence, reasonable assessments of contribution levels, and clear distinction between documented facts and inferred patterns.",
          "question 3": "Analyze the available relationship data to calculate the probability of long-term relationship success based on current patterns and dynamics. Look for compatibility indicators, relationship health signs, and success factors evident in their interactions and behaviors. Assess various relationship aspects by their importance to long-term viability. Focus on: 1) Current success rate estimation based on observable patterns, 2) How different relationship aspects contribute to overall success potential, 3) Key success factors identified from their dynamics, 4) Comprehensive compatibility assessment from available evidence, 5) Statistical viability analysis supported by behavioral data. Present percentage probabilities where calculable with supporting evidence and reasoning for your assessment of their relationship's long-term potential.",
          "question 4": "Synthesize key learning points from the entire analysis and create a sustainable development framework. Extract and refine key learning points, establish universal principles for future applications, provide long-term growth perspectives for continuous development, create template tools for self-assessment, and develop strategic frameworks for sustainable improvement. Present a comprehensive summary with actionable takeaways and continuous improvement strategies.",
          "question 5": "",
          "question 6": "",
          "question 7": "",
          "question 8": "",
          "question 9": "",
          "question 10": "",
          "question 11": "",
          "question 12": "",
          "question 13": "",
          "question 14": "",
          "question 15": "",
          "question 16": "",
          "question 17": "",
          "question 18": "",
          "question 19": "",
          "question 20": "",
          "question 21": "",
          "question 22": "",
          "question 23": "",
          "question 24": "",
          "question 25": "",
          "question 26": "",
          "question 27": "",
          "question 28": "",
          "question 29": "",
          "question 30": "",
          "question 31": "",
          "question 32": "",
          "question 33": "",
          "question 34": "",
          "question 35": "",
          "question 36": "",
          "question 37": "",
          "question 38": "",
          "question 39": "",
          "question 40": ""
        }
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