```markdown
# CouplesDNA 系统架构蓝图

## 核心理念

构建一个真正能帮助用户成长的、有深度、有温度的 AI 产品，通过"双表架构"实现私有情景和公共理论的智能结合。

## 一、数据库架构

### 1.1 用户认证表

#### profiles 表
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  age_range TEXT,
  relationship_stage TEXT,
  default_focus TEXT,
  conversation_feeling TEXT,
  role TEXT DEFAULT 'user', -- 'user', 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 策略
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);
```

设置管理员：
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';
```

### 1.2 文件上传表（统一结构）

**重要：`user_uploads` 和 `knowledge_uploads` 使用完全相同的表结构**

#### 创建 upload_status 枚举类型
```sql
CREATE TYPE upload_status AS ENUM ('pending', 'processing', 'completed', 'failed');
```

#### user_uploads 表（用户上传的聊天记录）
```sql
CREATE TABLE user_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  storage_path TEXT NOT NULL UNIQUE,
  status upload_status DEFAULT 'pending',
  storage_provider TEXT DEFAULT 'cloudflare_r2',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_user_uploads_user_id ON user_uploads(user_id);
CREATE INDEX idx_user_uploads_status ON user_uploads(status);
CREATE INDEX idx_user_uploads_storage_path ON user_uploads(storage_path);
CREATE INDEX idx_user_uploads_created_at ON user_uploads(created_at DESC);

-- RLS
ALTER TABLE user_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own uploads"
ON user_uploads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploads"
ON user_uploads FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

#### knowledge_uploads 表（管理员上传的知识库）
```sql
CREATE TABLE knowledge_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  storage_path TEXT NOT NULL UNIQUE,
  status upload_status DEFAULT 'pending',
  storage_provider TEXT DEFAULT 'cloudflare_r2',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_knowledge_uploads_user_id ON knowledge_uploads(user_id);
CREATE INDEX idx_knowledge_uploads_status ON knowledge_uploads(status);
CREATE INDEX idx_knowledge_uploads_storage_path ON knowledge_uploads(storage_path);
CREATE INDEX idx_knowledge_uploads_created_at ON knowledge_uploads(created_at DESC);

-- RLS（仅管理员）
ALTER TABLE knowledge_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all knowledge uploads"
ON knowledge_uploads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert knowledge uploads"
ON knowledge_uploads FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update knowledge uploads"
ON knowledge_uploads FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete knowledge uploads"
ON knowledge_uploads FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_knowledge_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_knowledge_uploads_timestamp
BEFORE UPDATE ON knowledge_uploads
FOR EACH ROW
EXECUTE FUNCTION update_knowledge_uploads_updated_at();
```

### 1.3 向量数据表（双表分离架构）

#### chat_log_vectors 表（用户私有数据）
```sql
CREATE TABLE chat_log_vectors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(384), -- MiniLM-L6-v2 生成 384 维向量
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_chat_log_vectors_user_id ON chat_log_vectors(user_id);
CREATE INDEX idx_chat_log_vectors_embedding ON chat_log_vectors 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS
ALTER TABLE chat_log_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vectors"
ON chat_log_vectors FOR SELECT
USING (auth.uid() = user_id);
```

#### knowledge_vectors 表（公共知识库）
```sql
CREATE TABLE knowledge_vectors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  embedding VECTOR(384),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_knowledge_vectors_embedding ON knowledge_vectors 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS（所有认证用户可读）
ALTER TABLE knowledge_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view knowledge vectors"
ON knowledge_vectors FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert knowledge vectors"
ON knowledge_vectors FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
```

## 二、文件存储架构

### 2.1 混合云存储方案

- **Cloudflare R2**：存储实际文件（无出口带宽费用）
- **Supabase 数据库**：存储文件元数据和索引

### 2.2 安全上传流程

1. 用户在前端选择文件
2. 前端向后端 API `/api/generate-upload-url` 发送请求
3. 后端验证用户权限并生成预签名 URL（5 分钟有效期）
4. 后端在数据库中注册 pending 记录
5. 前端使用预签名 URL 直接上传到 R2
6. 上传完成后，数据库触发器自动调用 Edge Function
7. Edge Function 处理文件：下载 → 提取文本 → 分块 → 向量化 → 存储
8. 更新状态为 completed

### 2.3 存储路径规范

- 用户上传：`users/{user_id}/{timestamp}-{uuid}-{filename}`
- 管理员上传：`admin/{timestamp}-{uuid}-{filename}`
- 手动输入：`admin/manual/{timestamp}-{uuid}-{sanitized-title}.txt` (虚拟路径,R2 中不存在)

## 三、自动化处理流程

### 3.1 数据库触发器

#### 启用必要扩展
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

#### user_uploads 触发器
```sql
CREATE OR REPLACE FUNCTION public.handle_user_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE LOG 'Triggering clever-task for: %', NEW.file_name;
  
  PERFORM net.http_post(
    url := 'https://bdabfjjhumnrioysmsjo.supabase.co/functions/v1/clever-task',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := jsonb_build_object('record', row_to_json(NEW))
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_process_user_upload
AFTER INSERT ON user_uploads
FOR EACH ROW
WHEN (NEW.status = 'pending'::upload_status)
EXECUTE FUNCTION public.handle_user_upload();
```

#### knowledge_uploads 触发器
```sql
CREATE OR REPLACE FUNCTION public.handle_knowledge_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE LOG 'Triggering knowledge-task for: %', NEW.file_name;
  
  PERFORM net.http_post(
    url := 'https://bdabfjjhumnrioysmsjo.supabase.co/functions/v1/knowledge-task',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := jsonb_build_object('record', row_to_json(NEW))
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_process_knowledge_upload
AFTER INSERT ON knowledge_uploads
FOR EACH ROW
WHEN (NEW.status = 'pending'::upload_status)
EXECUTE FUNCTION public.handle_knowledge_upload();
```

### 3.2 Edge Functions

#### clever-task（处理用户上传）
- 路径：`supabase/functions/clever-task/`
- 功能：处理 user_uploads，存入 chat_log_vectors
- URL: `https://bdabfjjhumnrioysmsjo.supabase.co/functions/v1/clever-task`

#### knowledge-task（处理管理员上传）
- 路径：`supabase/functions/knowledge-task/`
- 功能：处理 knowledge_uploads，存入 knowledge_vectors
- URL: `https://bdabfjjhumnrioysmsjo.supabase.co/functions/v1/knowledge-task`

#### 处理来源识别
- `metadata.source === 'manual_entry'`: 从 `metadata.manual_content` 读取文本
- `metadata.source === 'file_upload'`: 从 R2 下载文件并提取文本

#### 处理流程
1. 从 R2 下载文件
2. 提取文本（支持 .txt, .md, .docx, .pdf）
3. 文本清理和分块（每块约 256 字符）
4. 生成向量嵌入（HuggingFace MiniLM-L6-v2）
5. 插入向量数据库
6. 更新 upload 表状态为 completed

## 四、前端页面架构

### 4.1 用户页面

#### /dashboard
- 用户主面板
- 显示个人数据和历史

#### /upload（待开发）
- 用户上传聊天记录
- 显示上传历史和处理状态

### 4.2 管理员页面

#### /admin/knowledge
- 管理员专用知识库管理页面
- 功能：
  - 上传知识库文件（.txt, .md, .docx, .pdf）
  - 查看所有上传记录和状态
  - 实时状态更新（pending → processing → completed）
  - 删除知识库条目
  - 分类管理（General, Communication, Psychology, Relationships, Product FAQ）

#### 权限保护
- 使用 `getServerSideProps` 传递 session
- 检查 profiles.role = 'admin'
- 非管理员显示 Access Denied

## 五、认证架构

### 5.1 Session 管理

#### _app.js 配置
```javascript
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';

function App({ Component, pageProps }) {
  const [supabaseClient] = useState(() => createPagesBrowserClient());

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Component {...pageProps} />
    </SessionContextProvider>
  );
}
```

### 5.2 统一的 Supabase 客户端

**重要：避免创建多个客户端实例**

#### lib/supabase.js
```javascript
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

let supabaseInstance = null;

export const getSupabase = () => {
  if (!supabaseInstance && typeof window !== 'undefined') {
    supabaseInstance = createPagesBrowserClient();
  }
  return supabaseInstance;
};

export const supabase = getSupabase();

export const getUserRole = async () => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'guest'
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  return profile?.role || 'user'
}
```

### 5.3 页面级认证

需要认证的页面必须添加 `getServerSideProps`：

```javascript
export async function getServerSideProps(context) {
  const { createPagesServerClient } = require('@supabase/auth-helpers-nextjs');
  
  const supabase = createPagesServerClient(context);
  
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  return {
    props: {
      initialSession: session,
    },
  };
}
```

## 六、智能查询编排

### 6.1 多步检索流程

用户提问 → AI 智能编排：

1. **第一步**：从 `chat_log_vectors` 检索用户私有情景
   - 使用 user_id 严格隔离
   - 获取相关的历史对话片段

2. **第二步**：从 `knowledge_vectors` 检索公共理论知识
   - 全局搜索
   - 获取相关的沟通理论、心理学知识

3. **第三步**：综合分析生成回答
   - 结合私有情景和公共理论
   - 提供个性化的建议

### 6.2 向量相似度搜索

```sql
-- 搜索用户私有向量
SELECT content, metadata
FROM chat_log_vectors
WHERE user_id = $1
ORDER BY embedding <=> $2
LIMIT 5;

-- 搜索公共知识向量
SELECT content, metadata
FROM knowledge_vectors
ORDER BY embedding <=> $1
LIMIT 5;
```

## 七、开发工具（开发中）

### 7.1 Prompt Studio (v1.0 - 实现)
- **核心功能已上线**:
  - **双模式测试**: 支持独立的 "Prompt Testing" 和 "Report Generation" 模式。
  - **模型选择器**: 集成 Anthropic, OpenAI, Google 的多种模型。
  - **行为控制**: 为两种模式提供独立的 "Strict Mode" 开关和回退应答配置。
  - **动态上下文选择**: 允许从知识库中按分类和文件选择检索范围。
- **近期修复**:
  - 修复了知识库文件树渲染时的 JS 语法错误。

### 7.2 用户 Dashboard（规划中）
- 查看上传历史
- 管理聊天记录
- 查看处理状态

## 八、部署检查清单

### 8.1 数据库
- [ ] 创建所有表和索引
- [ ] 启用 RLS 策略
- [ ] 设置管理员角色
- [ ] 创建触发器
- [ ] 启用 pg_net 和 vector 扩展

### 8.2 存储
- [ ] 配置 Cloudflare R2
- [ ] 设置环境变量（R2 credentials）
- [ ] 测试预签名 URL 生成

### 8.3 Edge Functions
- [ ] 部署 clever-task
- [ ] 部署 knowledge-task
- [ ] 配置 HuggingFace API token
- [ ] 测试文件处理流程

### 8.4 前端
- [ ] 配置 Supabase 环境变量
- [ ] 统一 supabase 客户端实例
- [ ] 为所有受保护页面添加 getServerSideProps
- [ ] 测试用户和管理员权限

### 8.5 测试流程
1. 创建测试用户
2. 设置为管理员
3. 上传测试文件到 knowledge base
4. 验证触发器自动执行
5. 检查 Edge Function 日志
6. 确认向量数据正确插入
7. 测试向量相似度搜索

## 九、故障排查

### 9.1 常见问题

#### Session 问题
- 确保 `_app.js` 正确配置 SessionContextProvider
- 所有需要认证的页面必须有 getServerSideProps
- 避免创建多个 supabase 客户端实例

#### 触发器不工作
- 检查 pg_net 扩展是否启用
- 验证 Edge Function URL 是否正确
- 查看数据库日志：Database → Logs
- 手动测试触发器函数

#### Edge Function 无日志
- 检查 Edge Function 是否部署成功
- 验证 Authorization header 是否正确
- 查看 Edge Function 详细日志

#### 向量搜索不准确
- 检查 embedding 维度是否正确（384）
- 验证索引是否创建成功
- 调整 lists 参数优化性能

### 9.2 手动触发处理

如果自动触发失败，可以手动处理 pending 记录：

```sql
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT * FROM knowledge_uploads WHERE status = 'pending'::upload_status
  LOOP
    PERFORM net.http_post(
      url := 'https://bdabfjjhumnrioysmsjo.supabase.co/functions/v1/knowledge-task',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body := jsonb_build_object('record', row_to_json(rec))
    );
    RAISE NOTICE 'Triggered: %', rec.file_name;
  END LOOP;
END $$;
```

## 十、未来扩展

- 支持更多文件格式
- 批量上传
- 文件预览
- 向量搜索优化
- 多语言支持
- 实时协作功能
```