export function splitChunks(text: string, size = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start += size - overlap;
  }
  
  return chunks;
}

export function cleanText(text: string): string {
  let cleaned = text.replace(/\u0000/g, '');
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  cleaned = cleaned.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '');
  cleaned = cleaned.replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
  cleaned = cleaned.replace(/[\uFFFD\uFFFE\uFFFF]/g, '');
  return cleaned.trim();
}