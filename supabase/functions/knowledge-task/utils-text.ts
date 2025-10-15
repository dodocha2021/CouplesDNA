
// 删除旧的 splitChunks 函数，替换为：

export async function splitChunks(text: string): Promise<string[]> {
  // 动态导入 RecursiveCharacterTextSplitter
  // 在 Deno 环境中使用 npm: 前缀
  const { RecursiveCharacterTextSplitter } = await import('npm:langchain@0.1.25/text_splitter');
  
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200,           // 每个块的最大字符数
    chunkOverlap: 200,         // 块之间的重叠字符数
    separators: ['\n\n', '\n', '. ', '? ', '! ', ' ', ''],  // 优先级顺序的分隔符
  });
  
  // createDocuments 返回 Document 对象数组
  const docs = await splitter.createDocuments([text]);
  
  // 提取每个 Document 的 pageContent
  return docs.map(doc => doc.pageContent);
}

// cleanText 函数保持不变
export function cleanText(text: string): string {
  let cleaned = text.replace(/\u0000/g, '');
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  cleaned = cleaned.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '');
  cleaned = cleaned.replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
  cleaned = cleaned.replace(/[\uFFFD\uFFFE\uFFFF]/g, '');
  return cleaned.trim();
}
