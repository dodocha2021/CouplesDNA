
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '../../lib/supabase';
import { randomUUID } from 'crypto';

// --- Environment Variable Check and Conditional Handler Export ---

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_R2_ACCESS_KEY_ID',
  'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
  'CLOUDFLARE_R2_BUCKET_NAME'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

let handler;

if (missingEnvVars.length > 0) {
  const errorMessage = `Server configuration error. The following environment variables are not set: ${missingEnvVars.join(', ')}`;
  console.error(`FATAL: ${errorMessage}`);

  // If env vars are missing, export a simple handler that returns an error.
  handler = (req, res) => {
    res.status(500).json({
      error: 'Server configuration error.',
      details: errorMessage
    });
  };

} else {
  // --- All environment variables are present, proceed with normal setup ---

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

  // Define the full, operational handler
  handler = async (req, res) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { fileName, fileType, fileSize, uploadContext } = req.body;

      if (!fileName || !fileType || fileSize === undefined) {
        return res.status(400).json({ error: 'Missing required file metadata: fileName, fileType, and fileSize.' });
      }

      const safeFileName = fileName
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '');
      let storagePath = '';

      if (uploadContext === 'admin_knowledge') {
        const { data: profile, error: roleError } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (roleError || !profile || profile.role !== 'admin') {
          return res.status(403).json({ error: 'Forbidden: You do not have permission to upload to this location.' });
        }

        storagePath = `admin/${Date.now()}-${randomUUID()}-${safeFileName}`;
      } else {
        storagePath = `users/${user.id}/${Date.now()}-${randomUUID()}-${safeFileName}`;
      }

      const signedUrl = await getSignedUrl(
        R2,
        new PutObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
          Key: storagePath,
          ContentType: fileType,
          ContentLength: fileSize
        }),
        { expiresIn: 300 } // 5 minutes
      );

      const tableName = uploadContext === 'admin_knowledge' ? 'knowledge_uploads' : 'user_uploads';
      const { error: dbError } = await supabaseAdmin
        .from(tableName)
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_size: fileSize,
          storage_path: storagePath,
          status: 'pending',
          storage_provider: 'cloudflare_r2',
          ...(uploadContext === 'admin_knowledge' && { metadata: { source: 'file_upload' } })
        });

      if (dbError) {
        console.error('Database registration error:', dbError);
        throw new Error('Failed to register the upload in the database.');
      }

      res.status(200).json({
        uploadUrl: signedUrl,
        storagePath: storagePath,
      });

    } catch (error) {
      console.error('Error generating presigned URL:', error);
      res.status(500).json({ error: 'Failed to generate upload URL.', details: error.message });
    }
  };
}

// Export the handler that was determined by the environment variable check
export default handler;
