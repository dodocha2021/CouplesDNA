import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompts } = req.body;

    if (!prompts || typeof prompts !== 'object') {
      return res.status(400).json({ error: 'Prompts data is required' });
    }

    // 读取当前的generate-Finalreport.js文件
    const filePath = path.join(process.cwd(), 'pages', 'api', 'generate-Finalreport.js');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'generate-Finalreport.js file not found' });
    }

    let fileContent = fs.readFileSync(filePath, 'utf8');

    // 更新每个问题的内容
    Object.keys(prompts).forEach(questionNumber => {
      const questionKey = `"question ${questionNumber}"`;
      const promptContent = prompts[questionNumber];
      
      // 查找并替换问题内容
      const questionRegex = new RegExp(`${questionKey}:\\s*"[^"]*"`, 'g');
      const replacement = `${questionKey}: "${promptContent.replace(/"/g, '\\"')}"`;
      
      if (questionRegex.test(fileContent)) {
        fileContent = fileContent.replace(questionRegex, replacement);
      } else {
        // 如果问题不存在，在适当位置添加
        const insertPosition = fileContent.lastIndexOf('"question 40": ""');
        if (insertPosition !== -1) {
          const beforeInsert = fileContent.substring(0, insertPosition);
          const afterInsert = fileContent.substring(insertPosition);
          fileContent = beforeInsert + `        ${questionKey}: "${promptContent.replace(/"/g, '\\"')}",\n` + afterInsert;
        }
      }
    });

    // 写回文件
    fs.writeFileSync(filePath, fileContent, 'utf8');

    console.log('✅ Prompts saved to generate-Finalreport.js');
    console.log('📋 Updated questions:', Object.keys(prompts));

    res.status(200).json({ 
      success: true, 
      message: 'Prompts saved successfully',
      updatedQuestions: Object.keys(prompts)
    });

  } catch (error) {
    console.error('❌ Error saving prompts:', error);
    res.status(500).json({ 
      error: 'Failed to save prompts', 
      message: error.message 
    });
  }
} 