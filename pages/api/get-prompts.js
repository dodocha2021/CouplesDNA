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
    
    // 从文件中读取默认的问题总数
    const prompts = {};
    let totalQuestions = 40; // 默认值
    
    // 提取默认问题数
    const defaultQuestionsMatch = fileContent.match(/const questionsCount = totalQuestions \|\| (\d+);/);
    if (defaultQuestionsMatch) {
      totalQuestions = parseInt(defaultQuestionsMatch[1]);
    }
    
    // 查找所有问题设置（支持双引号和模板字符串）
    const questionSetupPattern = /if \(questionsCount >= (\d+)\) questionsObject\["question (\d+)"\] = [`"]([\s\S]*?)[`"];/g;
    let match;
    
    while ((match = questionSetupPattern.exec(fileContent)) !== null) {
      const questionNumber = parseInt(match[2]);
      const questionContent = match[3];
      prompts[questionNumber] = questionContent;
    }
    
    // 确保所有问题都有值（即使是空字符串）
    for (let i = 1; i <= totalQuestions; i++) {
      if (!(i in prompts)) {
        prompts[i] = '';
      }
    }

    console.log('✅ Retrieved prompts from generate-Finalreport.js');
    console.log('📊 Total questions:', totalQuestions);
    console.log('📋 Found prompts for questions:', Object.keys(prompts).filter(key => prompts[key] !== ''));

    res.status(200).json({ 
      success: true, 
      prompts: prompts,
      totalQuestions: totalQuestions
    });

  } catch (error) {
    console.error('❌ Error reading prompts:', error);
    res.status(500).json({ 
      error: 'Failed to read prompts', 
      message: error.message 
    });
  }
} 