import * as mammoth from "https://esm.sh/mammoth@1.6.0";

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  try {
    const apiKey = Deno.env.get('PDF_CO_API_KEY') || 'dodocha@gmail.com_pbGpcqsPRVDRgyhSK3QWJsPgCF7OplPAf0E1TP5IgiZcu8JsbbPJRmFDjxBlKH09';
    
    // 创建 FormData 并上传文件
    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'application/pdf' });
    formData.append('file', blob, 'document.pdf');
    
    const uploadResponse = await fetch('https://api.pdf.co/v1/file/upload', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`PDF.co upload failed: ${uploadResponse.status} - ${errorText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    
    if (!uploadResult.url) {
      throw new Error('No upload URL returned from PDF.co');
    }
    
    console.log('PDF uploaded, extracting text...');
    
    // 提取文本
    const extractResponse = await fetch('https://api.pdf.co/v1/pdf/convert/to/text', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: uploadResult.url,
        async: false
      })
    });
    
    if (!extractResponse.ok) {
      const errorText = await extractResponse.text();
      throw new Error(`PDF.co extraction failed: ${extractResponse.status} - ${errorText}`);
    }
    
    const extractResult = await extractResponse.json();
    
    if (extractResult.error) {
      throw new Error(`PDF.co error: ${extractResult.message || 'Unknown error'}`);
    }
    
    if (!extractResult.url) {
      throw new Error('No text URL in PDF.co response');
    }
    
    console.log(`Extracted ${extractResult.pagecount} pages, downloading text...`);
    
    // 获取提取的文本内容
    const textResponse = await fetch(extractResult.url);
    if (!textResponse.ok) {
      throw new Error(`Failed to download extracted text: ${textResponse.status}`);
    }
    
    const text = await textResponse.text();
    console.log(`Downloaded ${text.length} characters`);
    
    return text;
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
