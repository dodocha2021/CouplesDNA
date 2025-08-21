import { createClient } from '@supabase/supabase-js';
import { formidable } from 'formidable';
import fs from 'fs';
import { getUserFromRequest } from '../../lib/supabase';

// API 配置，让 Next.js 知道这个接口会处理文件流
export const config = {
  api: {
    bodyParser: false,
  },
};

// 创建两个Supabase客户端：一个用于认证，一个用于存储上传
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 暂时使用anon key，因为service role key有问题
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. 验证用户身份
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
        // 2. 文件验证
        const allowedTypes = ['text/plain', 'text/csv', 'application/json'];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({ error: 'Invalid file type. Only .txt, .csv, and .json files are allowed.' });
        }
        
        if (file.size > maxSize) {
          return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
        }

        // 3. 读取文件内容
        const fileContent = fs.readFileSync(file.filepath);

        // 4. 创建用户隔离的文件路径
        const timestamp = Date.now();
        const safeFileName = (file.originalFilename || file.name).replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFileName = `${timestamp}_${safeFileName}`;
        const filePath = `users/${user.id}/${uniqueFileName}`;

        // 5. 上传到Supabase Storage
        const { data, error: uploadError } = await supabaseAdmin.storage
          .from('chat-logs')
          .upload(filePath, fileContent, {
            contentType: file.mimetype,
            upsert: false, // 不覆盖，确保文件名唯一
          });

        if (uploadError) {
          throw uploadError;
        }

        // 6. 记录上传信息到数据库（为文件提供元数据索引）
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
          // 不中断流程，只记录警告
        }

        // 7. 返回成功响应
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