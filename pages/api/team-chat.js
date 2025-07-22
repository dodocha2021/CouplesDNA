import axios from 'axios';

const N8N_WEBHOOK = 'https://couplesdna.app.n8n.cloud/webhook/ff627dd8-7f67-4631-b2df-4332067fa07a';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, expertId, message } = req.body;

    console.log('🔄 Team Chat API: Sending request to n8n webhook...');
    
    const response = await axios.post(N8N_WEBHOOK, [
      {
        sessionId: sessionId,
        action: 'sendMessage',
        chatInput: message,
        expertId: expertId
      }
    ], { 
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000 // 2分钟超时
    });

    console.log('✅ Team Chat API: n8n response received:', response.data);
    
    // 检查响应是否包含实际的消息内容
    const responseData = response.data;
    let aiResponse = null;
    
    // 尝试从不同位置提取 AI 响应
    if (responseData.data && responseData.data.reply) {
      aiResponse = responseData.data.reply;
    } else if (responseData.data && responseData.data.message) {
      aiResponse = responseData.data.message;
    } else if (responseData.data && responseData.data.output) {
      aiResponse = responseData.data.output;
    } else if (responseData.reply) {
      aiResponse = responseData.reply;
    } else if (responseData.message) {
      aiResponse = responseData.message;
    } else if (responseData.output) {
      aiResponse = responseData.output;
    }
    
    // 移除 "DIRECT: " 前缀
    if (aiResponse && aiResponse.startsWith('DIRECT: ')) {
      aiResponse = aiResponse.substring(8);
    }
    
    res.status(200).json({ 
      success: true, 
      data: responseData,
      aiResponse: aiResponse
    });
    
  } catch (error) {
    console.error('❌ Team Chat API: Error calling n8n webhook:', error);
    console.error('❌ Team Chat API: Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: N8N_WEBHOOK
    });
    
    res.status(500).json({ 
      error: 'Failed to send message', 
      message: error.message 
    });
  }
} 