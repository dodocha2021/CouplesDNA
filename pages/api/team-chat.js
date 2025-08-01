import axios from 'axios';

// 不同专家的webhook配置
const WEBHOOK_CONFIG = {
  'ai': 'https://couplesdna.app.n8n.cloud/webhook/a46db80c-5a86-4d9a-b6ba-547fa403a9f7', // CouplesDNA-AI
  '3': 'https://couplesdna.app.n8n.cloud/webhook/3e4140ab-e4ab-4820-969e-7cd0889b97c6', // John Gottman
  '1': 'https://couplesdna.app.n8n.cloud/webhook/f9e7abea-4e8b-4d8f-ac91-2e1fb901b519', // Matthew Hussey
  '4': 'https://couplesdna.app.n8n.cloud/webhook/a07a92ff-b738-4a6d-9fa3-5cee5c61d50a'  // Esther Perel
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, expertId, message } = req.body;

    // 根据expertId选择对应的webhook
    const webhookUrl = WEBHOOK_CONFIG[expertId];
    
    if (!webhookUrl) {
      console.error(`❌ Team Chat API: No webhook found for expertId: ${expertId}`);
      return res.status(400).json({ error: 'Invalid expert ID' });
    }

    console.log(`🔄 Team Chat API: Sending request to n8n webhook for expert ${expertId}...`);
    console.log(`🔗 Webhook URL: ${webhookUrl}`);
    
    // CouplesDNA-AI 直接等待响应
    if (expertId === 'ai') {
      try {
        console.log('🤖 CouplesDNA-AI: Waiting for direct response...');
        const response = await axios.post(webhookUrl, [
          {
            sessionId: sessionId,
            action: 'sendMessage',
            chatInput: message,
            expertId: expertId
          }
        ], { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 300000 // 5分钟超时
        });
        
        console.log('✅ CouplesDNA-AI: Direct response received:', response.data);
        
        // 返回webhook的响应数据
        res.status(200).json({ 
          success: true, 
          message: 'CouplesDNA-AI response received',
          sessionId: sessionId,
          expertId: expertId,
          webhookUrl: webhookUrl,
          aiResponse: response.data // 包含AI的回复
        });
      } catch (error) {
        console.error('❌ CouplesDNA-AI: Error calling webhook:', error);
        res.status(500).json({ 
          error: 'Failed to get CouplesDNA-AI response', 
          message: error.message 
        });
      }
    } else {
      // 其他专家：立即返回成功响应，不等待 n8n 处理完成
      res.status(200).json({ 
        success: true, 
        message: 'Message sent successfully',
        sessionId: sessionId,
        expertId: expertId,
        webhookUrl: webhookUrl
      });
      
      // 异步发送到 n8n，不阻塞响应
      axios.post(webhookUrl, [
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
        console.log(`✅ Team Chat API: n8n response received for expert ${expertId}:`, response.data);
      }).catch(error => {
        console.error(`❌ Team Chat API: Error calling n8n webhook for expert ${expertId}:`, error);
        console.error('❌ Team Chat API: Error details:', {
          expertId: expertId,
          webhookUrl: webhookUrl,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Team Chat API: Error:', error);
    res.status(500).json({ 
      error: 'Failed to send message', 
      message: error.message 
    });
  }
} 