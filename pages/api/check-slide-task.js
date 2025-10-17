export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { taskId } = req.body;

  try {
    const getResponse = await fetch(`https://api.manus.ai/v1/tasks/${taskId}`, {
      headers: { 'API_KEY': process.env.NEXT_PUBLIC_MANUS_API_KEY }
    });
    
    if (!getResponse.ok) {
      throw new Error(`Get task failed: ${getResponse.status}`);
    }
    
    const taskData = await getResponse.json();
    
    if (taskData.status !== 'completed') {
      return res.status(200).json({ 
        status: taskData.status,
        log: `⏳ Task status: ${taskData.status}...`
      });
    }

    // 任务完成，提取文件
    const assistantOutputs = taskData.output.filter(o => o.role === 'assistant');
    let fileContent = null;
    
    for (const output of assistantOutputs) {
      fileContent = output.content.find(c => c.type === 'output_file');
      if (fileContent) break;
    }

    if (!fileContent) {
      throw new Error('No slides file generated');
    }

    // 下载 JSON
    const fileResponse = await fetch(fileContent.fileUrl);
    const slidesData = await fileResponse.json();

    res.status(200).json({ 
      status: 'completed',
      slides: slidesData,
      log: `✅ Slides generated successfully! (${slidesData.files?.length} slides)`
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message, log: `❌ Error: ${error.message}` });
  }
}