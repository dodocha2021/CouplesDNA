
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '../../lib/supabase';
import { randomUUID } from 'crypto';

// Supabase Admin Client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// R2 Client Configuration
const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // 1. Authenticate user from the request headers
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. Get file metadata from the request body
    const { fileName, fileType, fileSize } = req.body; // <-- MODIFIED: fileSize is now received

    if (!fileName || !fileType || fileSize === undefined) {
      return res.status(400).json({ error: 'Missing required file metadata: fileName, fileType, and fileSize.' });
    }

    // 3. Generate a unique storage path (key) for the file in R2
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-_]/g, '');
    const storagePath = `users/${user.id}/${Date.now()}-${randomUUID()}-${safeFileName}`;

    // 4. Generate the Presigned URL
    const signedUrl = await getSignedUrl(
      R2,
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: storagePath,
        ContentType: fileType,
        ContentLength: fileSize // Recommended to include for R2
      }),
      { expiresIn: 300 } // URL expires in 5 minutes
    );

    // 5. Register the pending upload in our user_uploads table
    const { error: dbError } = await supabaseAdmin
      .from('user_uploads')
      .insert({
        user_id: user.id,
        file_name: fileName,
        file_size: fileSize, // <-- MODIFIED: fileSize is now included in the insert
        storage_path: storagePath,
        status: 'pending',
        storage_provider: 'cloudflare_r2'
      });

    if (dbError) {
      console.error('Database registration error:', dbError);
      throw new Error('Failed to register the upload in the database.');
    }

    // 6. Return the presigned URL to the frontend
    res.status(200).json({
      uploadUrl: signedUrl,
      storagePath: storagePath,
    });

  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL.', details: error.message });
  }
}
