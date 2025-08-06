import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 读取当前的generate-Finalreport.js文件
    const filePath = path.join(process.cwd(), 'pages', 'api', 'generate-Finalreport.js');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'generate-Finalreport.js file not found' });
    }

    let fileContent = fs.readFileSync(filePath, 'utf8');

    // 清空所有question的内容（包括question 1-40）
    for (let i = 1; i <= 40; i++) {
      const questionKey = `"question ${i}"`;
      const questionRegex = new RegExp(`${questionKey}:\\s*"[^"]*"`, 'g');
      const replacement = `${questionKey}: ""`;
      
      if (questionRegex.test(fileContent)) {
        fileContent = fileContent.replace(questionRegex, replacement);
      }
    }

    // 写回文件
    fs.writeFileSync(filePath, fileContent, 'utf8');

    console.log('✅ All prompts cleared from generate-Finalreport.js');
    console.log('📋 Cleared questions: 1-40');

    res.status(200).json({ 
      success: true, 
      message: 'All prompts cleared successfully',
      clearedQuestions: Array.from({length: 40}, (_, i) => i + 1) // questions 1-40
    });

  } catch (error) {
    console.error('❌ Error clearing prompts:', error);
    res.status(500).json({ 
      error: 'Failed to clear prompts', 
      message: error.message 
    });
  }
} 