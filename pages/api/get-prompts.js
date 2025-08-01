import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 读取当前的generate-Finalreport.js文件
    const filePath = path.join(process.cwd(), 'pages', 'api', 'generate-Finalreport.js');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'generate-Finalreport.js file not found' });
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // 提取所有question的内容
    const prompts = {};
    
    // 使用正则表达式匹配所有question
    for (let i = 1; i <= 40; i++) {
      const questionKey = `"question ${i}"`;
      const regex = new RegExp(`${questionKey}:\\s*"([^"]*)"`, 'g');
      const match = regex.exec(fileContent);
      
      if (match) {
        prompts[i] = match[1];
      } else {
        prompts[i] = '';
      }
    }

    console.log('✅ Retrieved prompts from generate-Finalreport.js');
    console.log('📋 Found prompts for questions:', Object.keys(prompts).filter(key => prompts[key] !== ''));

    res.status(200).json({ 
      success: true, 
      prompts: prompts
    });

  } catch (error) {
    console.error('❌ Error reading prompts:', error);
    res.status(500).json({ 
      error: 'Failed to read prompts', 
      message: error.message 
    });
  }
} 