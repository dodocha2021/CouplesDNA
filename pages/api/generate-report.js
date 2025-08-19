import axios from 'axios';

const N8N_WEBHOOK = 'https://couplesdna.app.n8n.cloud/webhook/d7fdf002-8fac-4a56-bdff-4724cbf43fec';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    console.log('🔄 API Route: Sending request to n8n webhook...');
    
    // 立即返回成功，让前端开始轮询
    res.status(200).json({ 
      success: true, 
      message: 'Request sent to n8n, starting to check for results...' 
    });
    
    // 在后台异步发送请求到 n8n（不等待响应）
    axios.post(N8N_WEBHOOK, [
      {
        sessionId: sessionId,
        action: 'sendMessage',
        chatInput: "Please generate a report based on your knowledge and userdata, using knowledge as support and userdata as evidence."
      }
    ], { 
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000 // 2分钟超时
    }).then(response => {
      console.log('✅ API Route: n8n response received:', response.data);
    }).catch(error => {
      console.error('❌ API Route: Error calling n8n webhook:', error);
      console.error('❌ API Route: Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: N8N_WEBHOOK
      });
    });
    
  } catch (error) {
    console.error('❌ API Route: Error in handler:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
} 