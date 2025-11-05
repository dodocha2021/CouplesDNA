export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reportContent } = req.body;

  try {
    console.log('📤 Creating Manus task...');
    
    const createResponse = await fetch('https://api.manus.ai/v1/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API_KEY': process.env.NEXT_PUBLIC_MANUS_API_KEY
      },
      body: JSON.stringify({
        prompt: reportContent,
        taskMode: 'adaptive',
        agentProfile: 'quality',
        hideInTaskList: false,
        createShareableLink: true
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('❌ Create task failed:', createResponse.status);
      console.error('❌ Error details:', errorText);
      throw new Error(`Create task failed: ${createResponse.status} - ${errorText}`);
    }

    const createData = await createResponse.json();
    console.log('✅ Task created - Full response:', JSON.stringify(createData, null, 2));

    // 返回完整数据
    res.status(200).json(createData);
    
  } catch (error) {
    console.error('💥 ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
}
