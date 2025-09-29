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

  // 添加重试逻辑
  let lastError;
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { ...headers, ...authHeaders }
      });

      if (response.ok) {
        console.log(`[R2] Download successful on attempt ${i + 1}`);
        return await response.arrayBuffer();
      }
      
      lastError = await response.text();
      console.log(`[R2] Attempt ${i + 1} failed: ${response.status}`);
      
      if (response.status === 404 && i < 2) {
        // 等待文件上传完成
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (e) {
      lastError = e.message;
      console.log(`[R2] Attempt ${i + 1} error: ${e.message}`);
    }
  }

  throw new Error(`R2 download failed after 3 attempts: ${lastError}`);
}
