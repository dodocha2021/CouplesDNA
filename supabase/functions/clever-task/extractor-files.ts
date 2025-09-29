import * as mammoth from "https://esm.sh/mammoth@1.6.0";

export async function extractText(
  buffer: ArrayBuffer,
  fileName: string
): Promise<string> {
  const ext = fileName.toLowerCase().split('.').pop();
  
  console.log(`Extracting text from .${ext} file`);
  
  switch (ext) {
    case 'docx':
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      return result.value;
    
    case 'txt':
    case 'md':
    case 'csv':
    case 'json':
    case 'log':
      return new TextDecoder('utf-8').decode(buffer);
    
    case 'pdf':
      throw new Error('PDF files not supported yet. Please convert to .docx or .txt');
    
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}