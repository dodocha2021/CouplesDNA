import axios from 'axios';

const N8N_WEBHOOK = 'https://couplesdna.app.n8n.cloud/webhook/ff627dd8-7f67-4631-b2df-4332067fa07a';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, expertId, message } = req.body;

    console.log('🔄 Team Chat API: Sending request to n8n webhook...');
    
    // 立即返回成功响应，不等待 n8n 处理完成
    res.status(200).json({ 
      success: true, 
      message: 'Message sent successfully',
      sessionId: sessionId,
      expertId: expertId
    });
    
    // 异步发送到 n8n，不阻塞响应
    axios.post(N8N_WEBHOOK, [
      {
        sessionId: sessionId,
        action: 'sendMessage',
        chatInput: message,
        expertId: expertId
      }
    ], { 
      headers: { 'Content-Type': 'application/json' },
      timeout: 300000 // 5分钟超时
    }).then(response => {
      console.log('✅ Team Chat API: n8n response received:', response.data);
    }).catch(error => {
      console.error('❌ Team Chat API: Error calling n8n webhook:', error);
      console.error('❌ Team Chat API: Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: N8N_WEBHOOK
      });
    });
    
  } catch (error) {
    console.error('❌ Team Chat API: Error:', error);
    res.status(500).json({ 
      error: 'Failed to send message', 
      message: error.message 
    });
  }
} 