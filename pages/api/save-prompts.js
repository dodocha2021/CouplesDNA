import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompts, totalQuestions } = req.body;

    if (!prompts || typeof prompts !== 'object') {
      return res.status(400).json({ error: 'Prompts data is required' });
    }

    const totalQuestionsCount = totalQuestions || Object.keys(prompts).length || 40;

    // 读取当前的generate-Finalreport.js文件
    const filePath = path.join(process.cwd(), 'pages', 'api', 'generate-Finalreport.js');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'generate-Finalreport.js file not found' });
    }

    let fileContent = fs.readFileSync(filePath, 'utf8');
    
    // 更新默认的问题总数
    const defaultQuestionsRegex = /const questionsCount = totalQuestions \|\| \d+;/;
    const newDefaultQuestions = `const questionsCount = totalQuestions || ${totalQuestionsCount};`;
    if (defaultQuestionsRegex.test(fileContent)) {
      fileContent = fileContent.replace(defaultQuestionsRegex, newDefaultQuestions);
    }

    // 更新默认的前两个问题设置
    if (prompts[1]) {
      const question1Regex = /if \(questionsCount >= 1\) questionsObject\["question 1"\] = "[^"]*";/;
      const newQuestion1 = `if (questionsCount >= 1) questionsObject["question 1"] = "${prompts[1].replace(/"/g, '\\"')}";`;
      if (question1Regex.test(fileContent)) {
        fileContent = fileContent.replace(question1Regex, newQuestion1);
      }
    }
    
    if (prompts[2]) {
      const question2Regex = /if \(questionsCount >= 2\) questionsObject\["question 2"\] = "[^"]*";/;
      const newQuestion2 = `if (questionsCount >= 2) questionsObject["question 2"] = "${prompts[2].replace(/"/g, '\\"')}";`;
      if (question2Regex.test(fileContent)) {
        fileContent = fileContent.replace(question2Regex, newQuestion2);
      }
    }
    
    // 处理其他问题 - 在现有的question 2设置后添加额外的问题设置
    const additionalSettings = [];
    for (let i = 3; i <= totalQuestionsCount; i++) {
      if (prompts[i] && prompts[i].trim() !== '') {
        additionalSettings.push(`    if (questionsCount >= ${i}) questionsObject["question ${i}"] = "${prompts[i].replace(/"/g, '\\"')}";`);
      }
    }
    
    // 移除现有的额外问题设置（question 3及以上）
    fileContent = fileContent.replace(/\n    if \(questionsCount >= [3-9]\d*\) questionsObject\["question [3-9]\d*"\] = "[^"]*";/g, '');
    
    if (additionalSettings.length > 0) {
      // 在question 2设置后插入新的问题设置
      const insertPoint = /if \(questionsCount >= 2\) questionsObject\["question 2"\] = "[^"]*";/;
      const match = fileContent.match(insertPoint);
      if (match) {
        const replacement = match[0] + '\n' + additionalSettings.join('\n');
        fileContent = fileContent.replace(insertPoint, replacement);
      }
    }

    // 写回文件
    fs.writeFileSync(filePath, fileContent, 'utf8');

    console.log('✅ Prompts saved to generate-Finalreport.js');
    console.log('📊 Default total questions updated to:', totalQuestionsCount);
    console.log('📋 Updated question contents:', Object.keys(prompts).filter(key => prompts[key] && prompts[key].trim() !== ''));

    res.status(200).json({ 
      success: true, 
      message: 'Prompts saved successfully',
      totalQuestions: totalQuestionsCount,
      updatedQuestions: Object.keys(prompts).filter(key => prompts[key] && prompts[key].trim() !== '')
    });

  } catch (error) {
    console.error('❌ Error saving prompts:', error);
    res.status(500).json({ 
      error: 'Failed to save prompts', 
      message: error.message 
    });
  }
}