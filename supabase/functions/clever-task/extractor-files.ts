import * as mammoth from "https://esm.sh/mammoth@1.6.0";
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.worker.mjs";

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

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
      return await extractPdfText(buffer);
    
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}
