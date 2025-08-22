import axios from 'axios';

// Unified CouplesDNA-AI webhook
const WEBHOOK_URL = 'https://couplesdna.app.n8n.cloud/webhook/a46db80c-5a86-4d9a-b6ba-547fa403a9f7';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, message } = req.body;

    console.log(`🔄 Team Chat API: Sending request to CouplesDNA-AI webhook...`);
    console.log(`🔗 Webhook URL: ${WEBHOOK_URL}`);
    
    try {
      console.log('🤖 CouplesDNA-AI: Waiting for direct response...');
      const response = await axios.post(WEBHOOK_URL, [
        {
          sessionId: sessionId,
          action: 'sendMessage',
          chatInput: message
        }
      ], { 
        headers: { 'Content-Type': 'application/json' },
        timeout: 300000 // 5-minute timeout
      });
      
      console.log('✅ CouplesDNA-AI: Direct response received:', response.data);
      
      // Return webhook response data
      res.status(200).json({ 
        success: true, 
        message: 'CouplesDNA-AI response received',
        sessionId: sessionId,
        webhookUrl: WEBHOOK_URL,
        aiResponse: response.data // Contains AI response
      });
    } catch (error) {
      console.error('❌ CouplesDNA-AI: Error calling webhook:', error);
      res.status(500).json({ 
        error: 'Failed to get CouplesDNA-AI response', 
        message: error.message 
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