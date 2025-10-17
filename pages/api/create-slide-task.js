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
        prompt: `Create a professional presentation with slides based on this report:\n\n${reportContent}`,
        taskMode: 'adaptive',
        agentProfile: 'quality',
        hideInTaskList: false,
        createShareableLink: true
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Create task failed: ${createResponse.status}`);
    }

    const createData = await createResponse.json();
    console.log('✅ Task created:', createData.task_id);
    
    // 立即返回 task_id 和 share_url
    res.status(200).json({
      taskId: createData.task_id,
      shareUrl: createData.share_url
    });
    
  } catch (error) {
    console.error('💥 ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
}
