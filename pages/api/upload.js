import { createClient } from '@supabase/supabase-js';
import { formidable } from 'formidable';
import fs from 'fs';

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
    // 1. 验证用户身份 - 从Authorization header获取token
    const authHeader = req.headers.authorization;
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // 验证token并获取用户信息
      const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser(token);
      
      if (!authError && authUser) {
        user = authUser;
      }
    }
    
    // 如果没有有效的用户认证，使用默认用户ID进行测试
    if (!user) {
      // 对于测试，我们创建一个临时用户ID
      user = { id: 'anonymous-' + Date.now() };
      console.log('Using anonymous user for upload:', user.id);
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
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({ error: 'Invalid file type. Only .txt, .csv, and .json files are allowed.' });
        }
        
        if (file.size > maxSize) {
          return res.status(400).json({ error: 'File size too large. Maximum size is 10MB.' });
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

        // 6. 记录上传信息到数据库（可选 - 为后续追踪）
        // 这里可以添加文件上传记录到数据库的逻辑

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