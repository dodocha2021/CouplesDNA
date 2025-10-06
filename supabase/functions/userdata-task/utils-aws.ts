export async function awsSignatureV4(
  method: string,
  url: URL,
  headers: Record<string, string>,
  payload: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  service: string
): Promise<Record<string, string>> {
  const encoder = new TextEncoder();
  const date = new Date();
  const dateStamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');

  const payloadHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
  const payloadHash = Array.from(new Uint8Array(payloadHashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const canonicalUri = url.pathname;
  const canonicalQuerystring = Array.from(url.searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  const allHeaders = {
    ...headers,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate
  };

  const canonicalHeaders = Object.entries(allHeaders)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key.toLowerCase()}:${value.trim()}\n`)
    .join('');

  const signedHeaders = Object.keys(allHeaders)
    .map((k) => k.toLowerCase())
    .sort()
    .join(';');

  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const canonicalRequestHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest));
  const canonicalRequestHash = Array.from(new Uint8Array(canonicalRequestHashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

  async function hmac(key: Uint8Array, data: string): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
    return new Uint8Array(signature);
  }

  const kDate = await hmac(encoder.encode(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = await hmac(kSigning, stringToSign);

  const signatureHex = Array.from(signature).map((b) => b.toString(16).padStart(2, '0')).join('');

  return {
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    'Authorization': `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`
  };
}