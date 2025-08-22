import { createClient } from '@supabase/supabase-js';
import { formidable } from 'formidable';
import fs from 'fs';
import { getUserFromRequest } from '../../lib/supabase';

// API configuration, let Next.js know this interface will handle file streams
export const config = {
  api: {
    bodyParser: false,
  },
};

// Create two Supabase clients: one for authentication, one for storage uploads
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Temporarily use anon key, because service role key has issues
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Authenticate user identity
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const form = formidable();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('File parse error:', err);
        return res.status(500).json({ error: 'Error parsing the file' });
      }

      let file = files.file;
      if (Array.isArray(file)) file = file[0];

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      try {
        // 2. File validation
        const allowedTypes = [
          'text/plain', 
          'text/csv', 
          'application/json',
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/markdown',
          'application/xml',
          'text/xml',
          'text/html'
        ];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({ error: 'Invalid file type. Only .txt, .csv, .json, .pdf, .docx, .md, .xml, and .html files are allowed.' });
        }
        
        if (file.size > maxSize) {
          return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
        }

        // 3. Read file content
        const fileContent = fs.readFileSync(file.filepath);

        // 4. Create user-isolated file path
        const timestamp = Date.now();
        const safeFileName = (file.originalFilename || file.name).replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFileName = `${timestamp}_${safeFileName}`;
        const filePath = `users/${user.id}/${uniqueFileName}`;

        // 5. Upload to Supabase Storage
        const { data, error: uploadError } = await supabaseAdmin.storage
          .from('chat-logs')
          .upload(filePath, fileContent, {
            contentType: file.mimetype,
            upsert: false, // Do not overwrite, ensure unique file name
          });

        if (uploadError) {
          throw uploadError;
        }

        // 6. Record upload information to the database (provide metadata index for the file)
        const { error: dbError } = await supabaseAdmin
          .from('chat-logs')
          .insert({
            user_id: user.id,
            file_name: safeFileName,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.mimetype,
            uploaded_at: new Date().toISOString()
          });

        if (dbError) {
          console.warn('Failed to record file metadata:', dbError);
          // Do not interrupt the process, only record warnings
        }

        // 7. Return success response
        return res.status(200).json({
          fileName: file.originalFilename || file.name,
          message: 'File uploaded successfully with user isolation',
          filePath: filePath,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          userId: user.id
        });

      } catch (e) {
        console.error('Supabase upload error:', e);
        return res.status(500).json({ 
          error: 'File upload failed', 
          detail: e.message 
        });
      }
    });

  } catch (authError) {
    console.error('Authentication error:', authError);
    return res.status(401).json({ error: 'Authentication failed' });
  }
} 