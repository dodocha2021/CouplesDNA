import { awsSignatureV4 } from "./utils-aws.ts";

export async function downloadFile(storagePath: string): Promise<ArrayBuffer> {
  console.log(`[R2] Attempting to download: ${storagePath}`);
  
  const accessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID") ?? "";
  const secretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY") ?? "";

  const url = new URL(
    `https://1d72766a07685441865d28b4142f5394.r2.cloudflarestorage.com/couplesdnaupload/${storagePath}`
  );
  
  console.log(`[R2] Full URL: ${url.toString()}`);

  const headers = { 'host': url.host };
  const authHeaders = await awsSignatureV4(
    'GET', url, headers, '', 
    accessKeyId, secretAccessKey, 'auto', 's3'
  );

  // 增强的重试逻辑 - 8次重试,总计约53秒
  const maxAttempts = 8;
  const delays = [2000, 3000, 4000, 5000, 6000, 8000, 10000, 15000];
  let lastError: string = "";
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`[R2] Attempt ${i + 1}/${maxAttempts}`);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { ...headers, ...authHeaders }
      });

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        console.log(`[R2] ✅ Download successful on attempt ${i + 1}, size: ${buffer.byteLength} bytes`);
        return buffer;
      }
      
      const statusCode = response.status;
      lastError = await response.text();
      console.log(`[R2] ❌ Attempt ${i + 1} failed with status ${statusCode}`);
      
      if (i < maxAttempts - 1) {
        const delay = delays[i] || 15000;
        
        if (statusCode === 404) {
          console.log(`[R2] 🔄 File not found (404), waiting ${delay}ms before retry...`);
          console.log(`[R2] 💡 This usually means the file is still being uploaded to R2`);
        } else {
          console.log(`[R2] 🔄 Waiting ${delay}ms before retry...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (e) {
      lastError = e.message || String(e);
      console.log(`[R2] ❌ Attempt ${i + 1} threw error: ${lastError}`);
      
      if (i < maxAttempts - 1) {
        const delay = delays[i] || 15000;
        console.log(`[R2] 🔄 Waiting ${delay}ms before retry after error...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  const totalTime = delays.reduce((a, b) => a + b, 0) / 1000;
  const errorMessage = `R2 download failed after ${maxAttempts} attempts over ~${totalTime} seconds. Last error: ${lastError}`;
  console.error(`[R2] 💥 ${errorMessage}`);
  throw new Error(errorMessage);
}
