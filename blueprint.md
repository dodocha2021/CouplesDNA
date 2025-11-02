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

## 六、RAG 系统与 Prompt Studio

### 6.1 RAG 检索架构

#### 双表检索策略
1. **知识库检索** (`knowledge_vectors`)：
   - 使用 `upload_id` 列（直接外键关联）而非 metadata 中的 file_id
   - 每个文件独立调用 RPC，提高查询效率
   - 支持多文件并发检索和结果合并

2. **用户数据检索** (`chat_log_vectors`)：
   - 严格的 user_id 隔离
   - 支持按文件筛选的可选功能

#### 向量搜索函数优化
```sql
-- 推荐：使用 upload_id 列进行文件过滤
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding TEXT,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5,
  p_file_id TEXT DEFAULT NULL
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kv.id,
    kv.content,
    kv.metadata,
    1 - (kv.embedding <=> query_embedding::vector) AS similarity
  FROM knowledge_vectors kv
  WHERE
    (p_file_id IS NULL OR kv.upload_id::text = p_file_id) AND
    (1 - (kv.embedding <=> query_embedding::vector) >= match_threshold)
  ORDER BY kv.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;
```

### 6.2 Prompt Studio (v2.0 - 统一架构)

#### 核心功能
- **统一的 Prompt & Behavior 配置**：两种模式共享相同的 System Prompt 和 User Prompt Template
- **双模式运行**：
  - **Prompt Testing**：仅使用知识库 (`{context}`)
  - **Report Generation**：同时使用知识库和用户数据 (`{context}` + `{userdata}`)

#### User Prompt Template 变量
```
{context}   - 知识库检索结果
{userdata}  - 用户数据检索结果（仅 Report Mode）
{question}  - 用户问题
```

#### 前端实现 (`pages/admin/prompt-studio.js`)
- 共享配置：System Prompt、User Prompt Template、Strict Mode
- 知识库选择：文件树形结构，支持分类和相似度阈值调整
- 用户数据选择：用户列表 + 文件过滤（仅 Report Mode）
- Debug 日志显示：左侧 AI 响应，右侧 Terminal 风格调试信息

#### 后端实现 (`pages/api/run-rag-query.js`)
- **handlePromptMode**：
  - 为每个文件单独调用 `match_knowledge`
  - 合并、去重、排序结果
  - 自动移除 `{userdata}` 占位符

- **handleReportMode**：
  - 并行检索知识库和用户数据
  - 分别组装 `[K1]`, `[K2]`... 和 `[U1]`, `[U2]`... 格式
  - 替换所有模板变量

#### Debug 日志功能
- 后端收集所有 console.log 输出
- 返回 `debugLogs` 字段给前端
- 前端双列显示：
  - 左侧：Markdown 格式的 AI 回答
  - 右侧：Terminal 风格的调试日志（黑色背景，绿色文字，可滚动）

### 6.3 数据表优化建议

#### knowledge_vectors 表结构
```sql
CREATE TABLE knowledge_vectors (
  id BIGSERIAL PRIMARY KEY,
  upload_id UUID REFERENCES knowledge_uploads(id) ON DELETE CASCADE,  -- 直接外键
  content TEXT NOT NULL,
  embedding VECTOR(768),  -- 或 384，取决于模型
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_knowledge_vectors_upload_id ON knowledge_vectors(upload_id);
CREATE INDEX idx_knowledge_vectors_embedding ON knowledge_vectors 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 6.4 文件处理流程

#### Chunk 大小优化
- 原始设计：500 字符 + 50 字符 overlap
- 建议调整：1000-1200 字符（根据测试优化）
- 避免过小的 chunks 导致上下文碎片化

#### 元数据存储
```json
{
  "file_id": "uuid",
  "chunk_index": 0,
  "source": "file_upload",
  "category": "Communication"
}
```

## 七、UI 组件规范

### 7.1 下拉菜单背景色标准
**规则**：所有下拉式菜单组件必须使用白色背景 (`bg-white`)

#### 受影响的组件
- `SelectContent` (components/ui/select.tsx)
- `DropdownMenuContent`
- `PopoverContent`
- `ContextMenuContent`
- `TooltipContent`

#### 修改方法
在组件的 `className` 中，将 `bg-popover` 替换为 `bg-white`：
```tsx
// 修改前
className="... bg-popover ..."

// 修改后
className="... bg-white ..."
```

## 八、开发工具（更新）

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

## 十、Prompt 配置管理系统

### 10.1 prompt_configs 表

用于保存和管理不同类型的 Prompt 配置（General QA、Report、Slide）

#### 表结构
```sql
CREATE TABLE prompt_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  prompt_type TEXT, -- 'general', 'report', 'slide'
  name TEXT,

  -- RAG 配置
  model_selection TEXT,
  knowledge_base_id UUID,
  knowledge_base_name TEXT,
  selected_knowledge_ids UUID[],
  top_k_results INTEGER,
  strict_mode BOOLEAN,

  -- Prompt 内容
  system_prompt TEXT,
  user_prompt_template TEXT,

  -- General 类型特有
  test_question TEXT,
  generated_response TEXT,

  -- Report 和 Slide 类型共享
  user_data_id UUID,
  user_data_name TEXT,
  report_topic TEXT,
  generated_report TEXT,

  -- Slide 类型特有（Manus 集成）
  generate_slides TEXT, -- JSON 格式的 slides 数据
  manus_task_id TEXT,
  manus_share_url TEXT,
  manus_prompt TEXT,
  manus_task_status TEXT, -- 'pending', 'completed', 'failed'
  manus_task_created_at TIMESTAMPTZ,
  manus_task_completed_at TIMESTAMPTZ,
  manus_raw_output JSONB, -- 完整的 webhook 响应
  source_config_id UUID, -- 继承自哪个配置

  -- 元数据
  debug_logs TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 10.2 配置保存 API

#### `/api/admin/prompt-config/save` (POST)

**重要修复（2025-10-22）**：UUID 字段空值处理
- **问题**：当 UUID 字段（如 `user_data_id`, `source_config_id`）接收到空字符串 `""` 时，PostgreSQL 会报错：`invalid input syntax for type uuid: ""`
- **解决方案**：在所有可选的 UUID 和文本字段上使用 `|| null` 运算符，将空字符串转换为 `null`

```javascript
// 示例：修复后的字段处理
user_data_id: ['report', 'slide'].includes(prompt_type) ? (user_data_id || null) : null,
source_config_id: prompt_type === 'slide' ? (source_config_id || null) : null,
manus_task_id: prompt_type === 'slide' ? (manus_task_id || null) : null,
// ... 所有可选字段都应用此模式
```

**验证规则**：
- General: 必须运行测试后才能保存（需要 `test_question` 和 `generated_response`）
- Report: 必须生成报告后才能保存（需要 `report_topic` 和 `generated_report`）
- Slide: 必须生成 slides 后才能保存（需要 `manus_task_id` 和 `manus_prompt`）

### 10.3 Manus Webhook 集成

#### `/api/webhooks/manus` (POST)

**功能**：接收 Manus AI 的任务完成回调

**处理流程**：
1. 验证 `event_type === 'task_stopped'`
2. 根据 `task_id` 查找对应的 `prompt_configs` 记录
3. 下载 `attachments[0].url` 中的 slides JSON
4. 更新数据库：
   - `generate_slides`: JSON 字符串
   - `manus_task_status`: 'completed' 或 'failed'
   - `manus_task_completed_at`: 完成时间
   - `manus_raw_output`: 完整的 webhook body

**Webhook URL**：
```
https://couples-dna-git-claudecode-dodocha2021-fc3fff19.vercel.app/api/webhooks/manus
```

**重要**：确保 Vercel 部署保护（Protection）已关闭，否则 Manus 无法访问 webhook

### 10.4 前端 Hook

#### `hooks/usePromptConfig.js`

**功能**：统一管理三种类型的 Prompt 配置状态和保存逻辑

**使用方式**：
```javascript
const {
  // 公共字段
  modelSelection, knowledgeBaseId, topK, strictMode,
  systemPrompt, userPromptTemplate, debugLogs,

  // General 字段
  testQuestion, generatedResponse,

  // Report 字段
  userDataId, reportTopic, generatedReport,

  // Slide 字段
  manusTaskId, manusShareUrl, manusTaskStatus, manusPrompt,

  // 操作
  handleSaveConfig,
  handleResetToDefault,
  saveLoading
} = usePromptConfig({ loadedConfig, setLoadedConfig, onSaveSuccess, promptType })
```

**配置继承**：
- Slide 类型可以继承 Report 或 General 配置的所有字段
- 通过 `source_config_id` 关联原始配置

### 10.5 常见问题

#### UUID 验证错误
**症状**：点击保存时报错 `invalid input syntax for type uuid: ""`

**原因**：前端传递空字符串给 UUID 类型字段

**解决**：在 API 中使用 `|| null` 处理（已修复）

#### Webhook 无法访问
**症状**：Manus 报告 webhook 失败，Vercel 返回 401 或 404

**解决**：
1. 检查 Vercel 部署保护是否已关闭
2. 确认 webhook URL 路径正确：`/api/webhooks/manus`（不是 `/api/manus/webhook`）
3. 测试命令：`curl -X POST <webhook-url> -H "Content-Type: application/json" -d '{"event_type":"test"}'`

## 十一、未来扩展

- 支持更多文件格式
- 批量上传
- 文件预览
- 向量搜索优化
- 多语言支持
- 实时协作功能
```
## 十二、关键问题修复记录 (2025-11-02)

### 12.1 My Reports 功能完整实现

#### 问题背景
- My Reports 模块无法生成报告
- Embedding API 400 错误
- Knowledge chunks 搜索返回 0 结果

#### 修复步骤

**1. HuggingFace Embedding API 调用问题**
- **问题**: Edge Function 使用原始 fetch API，格式与 SDK 不兼容
- **原因**: 不同 API 调用方式对参数格式要求不同
- **解决**: 改用 `@huggingface/inference` SDK，与 Prompt Studio 保持一致
```typescript
// 修改前（失败）
const response = await fetch(url, {
  body: JSON.stringify({ inputs: text })
});

// 修改后（成功）
import { HfInference } from "https://esm.sh/@huggingface/inference@2";
const hf = new HfInference(token);
const response = await hf.featureExtraction({
  model: 'BAAI/bge-base-en-v1.5',
  inputs: cleanedText
});
```

**2. RPC 函数参数不匹配**
- **问题**: `match_knowledge` RPC 在数据库中更新了，但代码未同步
- **症状**: Prompt Testing 和 Report Generation 都搜索不到 knowledge
- **根源**: 
  - RPC 函数签名: `p_file_ids text[]` (复数，数组)
  - 调用代码传参: `p_file_id: file_id` (单数，字符串)
- **解决**: 统一改为 `p_file_ids: [file_id]`
- **修改文件**:
  - `/pages/api/run-rag-query.js` (两处：Prompt Mode 和 Report Mode)
  - `/lib/retrieval.js`

**3. Category Thresholds 未保存**
- **问题**: Prompt Studio 设置的 threshold 没有保存到数据库
- **原因**: 前端 `categoryThresholds` state 未传递给保存函数
- **解决**:
  - 添加 `category_thresholds JSONB` 字段到 `prompt_configs` 和 `user_reports` 表
  - `ReportGenerationTab.js`: `handleSaveConfig({ category_thresholds: categoryThresholds })`
  - `usePromptConfig.js`: 保存时包含 `category_thresholds`
  - Edge Function: 读取并应用 `report.category_thresholds`

**4. Threshold Slider 无法达到 0**
- **问题**: Slider `step=0.05`，无法设置为 0
- **解决**: 
  - 改 `step=0.01` 提供更细粒度
  - 添加"0"按钮直接重置为 0
  - 修复逻辑: `!== undefined` 判断而不是 `||` 运算符

**5. 去重逻辑错误导致 25→1 chunks**
- **问题**: 5 个文件各返回 5 chunks（共 25 个），去重后只剩 1 个
- **根源**: RPC 返回数据无 `id` 字段，只有 `content`, `metadata`, `similarity`
- **去重代码使用** `item.id` 作为 key → 全是 `undefined` → Map 中互相覆盖
- **解决**: 使用 `${metadata.file_id}_${metadata.chunk_index}` 作为唯一键
```javascript
// 修改前（错误）
const uniqueKey = item.id;  // undefined

// 修改后（正确）
const uniqueKey = `${item.metadata.file_id}_${item.metadata.chunk_index}`;
```

### 12.2 RPC 函数更新检查清单

**当更新 Supabase RPC 函数时，必须检查所有调用点：**

1. `/pages/api/run-rag-query.js`
   - `handlePromptMode()` - Prompt Testing
   - `handleReportMode()` - Report Generation
2. `/lib/retrieval.js`
   - `retrieveKnowledge()`
3. `supabase/functions/*/index.ts` - 所有 Edge Functions

**RPC 返回值结构：**
- `match_knowledge`: `{ content, metadata, similarity }` - **无 id**
- `match_user_data_by_files`: `{ content, metadata, similarity }` - **无 id**

**去重策略：**
- 必须使用 `metadata.file_id + metadata.chunk_index`
- 不能使用 `id` 或其他不存在的字段

### 12.3 Threshold 工作机制

**存储格式：**
```json
{
  "Relationship": 0.05,
  "Psychology": 0.30,
  "General": 0.30
}
```

**应用流程：**
1. 前端按 category 设置 threshold（slider）
2. 保存到 `prompt_configs.category_thresholds`
3. 创建 user_reports 时拷贝到 `user_reports.category_thresholds`
4. Edge Function 读取并查询 `knowledge_uploads.metadata.category`
5. 为每个文件应用对应 category 的 threshold

**注意事项：**
- Threshold = 0 表示无过滤（返回所有结果按相似度排序）
- 不同 category 可以有不同 threshold
- User data 搜索目前**无 threshold 参数**（总是返回最相似的 N 个）

### 12.4 Debug 日志最佳实践

**Report Mode 详细日志：**
```javascript
log(`  > File ${fileId}...: ${count} chunks${errorMsg}`);
log(`  > Total before dedup: ${knowledgeResults.length} chunks`);
log(`  > After dedup: ${uniqueKnowledge.length} chunks`);
log(`  > After topK limit: ${knowledgeResults.length} chunks`);
```

这些日志帮助诊断：
- 哪些文件返回了数据
- RPC 是否有错误
- 去重是否正常工作
- TopK 限制是否正确应用

## 13. Category Thresholds 完整修复历程

### 13.1 问题背景

Category Thresholds 功能允许用户为不同知识类别设置不同的相似度阈值，实现精准的知识检索。但在实现过程中遇到了多个保存和继承问题。

### 13.2 修复历程

#### 问题 1: 后端 API 未提取和保存 category_thresholds

**发现过程**：
- 前端构建了完整的 `category_thresholds` 对象并传递给 API
- 数据库查询显示 `category_thresholds` 始终为 `{}`
- 添加 console.log 发现前端数据正确，但数据库为空

**根本原因**：
```javascript
// pages/api/admin/prompt-config/save.js
const {
  prompt_type,
  model_selection,
  // ... 其他字段
  // ❌ 缺少 category_thresholds
} = req.body;

// INSERT 语句中也没有包含
.insert({
  user_id: user.id,
  model_selection,
  // ... 其他字段
  // ❌ 缺少 category_thresholds: category_thresholds || {}
})
```

**解决方案** (Commit: f17e3b8):
1. 添加 `category_thresholds` 到 `req.body` 解构
2. 添加 `category_thresholds: category_thresholds || {}` 到 INSERT 语句
3. 添加日志验证接收和插入的数据

**修改文件**：
- `pages/api/admin/prompt-config/save.js:43,127`

---

#### 问题 2: Slide Generation 未继承 Report 的 category_thresholds

**发现过程**：
- Report 保存时 `category_thresholds` 正确（例如 `{"Psychology": 0.15}`）
- 使用该 Report 生成 Slide 后，Slide 的 `category_thresholds` 为 `{}`
- Slide 记录有 `source_config_id` 指向 Report，但未拷贝 threshold 数据

**根本原因（第一轮修复）**：
```javascript
// components/admin/SlideGenerationTab.js:268
category_thresholds: loadedConfig?.category_thresholds || sourceConfig?.category_thresholds || {},
```

问题：`loadedConfig` 在第一次 autoSave 后被设置，其 `category_thresholds` 为 `{}`（空对象）。由于空对象 `{}` 是 truthy 值，`||` 运算符永远不会 fallback 到 `sourceConfig.category_thresholds`。

**数据流分析**：
```
1. 用户选择 Report Config (category_thresholds: {"Psychology": 0.15})
2. 生成 slides，调用 autoSaveSlideConfig()
3. autoSaveSlideConfig 创建新 slide config
4. 后端初始化 category_thresholds 为 {}
5. setLoadedConfig(result.data)  // loadedConfig.category_thresholds = {}
6. 用户点击 Save 按钮
7. loadedConfig?.category_thresholds 返回 {}（truthy）
8. sourceConfig?.category_thresholds 永远不会被使用 ❌
```

**解决方案** (Commit: e454f7d, 1a60436):

**第一步** - 添加继承逻辑:
```javascript
// SlideGenerationTab.js autoSaveSlideConfig
category_thresholds: loadedConfig?.category_thresholds || sourceConfig?.category_thresholds || {}

// SlideGenerationTab.js Save button
onClick={() => handleSaveConfig({
  category_thresholds: loadedConfig?.category_thresholds || {}
})}

// usePromptConfig.js slide type
category_thresholds: additionalData.category_thresholds || {}
```

**第二步** - 简化为直接拷贝（最终方案）:
```javascript
// SlideGenerationTab.js:268 - 只从 sourceConfig 拷贝
category_thresholds: sourceConfig?.category_thresholds || {}
```

**关键洞察**：
- JavaScript 中 `{}` 是 truthy 值
- `{} || value` 永远返回 `{}`，不会 fallback
- 对于从源配置继承的字段，应该直接从源配置读取，不要使用 fallback 逻辑

**修改文件**：
- `components/admin/SlideGenerationTab.js:268` - autoSaveSlideConfig 中的 category_thresholds
- `components/admin/SlideGenerationTab.js:538-540` - Save 按钮（最终未修改，使用 autoSave 的值）
- `hooks/usePromptConfig.js:170` - slide 类型 configData

---

### 13.3 完整数据流

**正确的数据流**（修复后）:

```
1. 用户在 Report Generation 创建报告
   ↓
2. 设置 category thresholds (拖动 slider)
   categoryThresholds state: {"Psychology": 0.15}
   ↓
3. 点击 Save，构建完整 thresholds 对象
   completeThresholds: {"Psychology": 0.15, "General": 0.30}
   ↓
4. 传递给 handleSaveConfig
   additionalData.category_thresholds: {"Psychology": 0.15, "General": 0.30}
   ↓
5. usePromptConfig 构建 configData
   configData.category_thresholds: {"Psychology": 0.15, "General": 0.30}
   ↓
6. API 接收并保存
   req.body.category_thresholds → database ✅
   ↓
7. 用户在 Slide Generation 选择该 Report
   ↓
8. 生成 slides，autoSaveSlideConfig 从 sourceConfig 拷贝
   category_thresholds: sourceConfig.category_thresholds
   ↓
9. 保存到数据库
   slide config.category_thresholds: {"Psychology": 0.15, "General": 0.30} ✅
```

### 13.4 关键代码位置

**前端保存逻辑**：
```javascript
// components/admin/ReportGenerationTab.js:639-667
<Button onClick={() => {
  const completeThresholds = {};
  selectedKnowledgeIds.forEach(fileId => {
    const item = knowledgeItems.find(k => k.id === fileId);
    const category = item?.metadata?.category || 'General';
    if (!completeThresholds[category]) {
      completeThresholds[category] = categoryThresholds[category] !== undefined
        ? categoryThresholds[category]
        : 0.30;
    }
  });
  handleSaveConfig({ category_thresholds: completeThresholds });
}}>
```

**后端 API**：
```javascript
// pages/api/admin/prompt-config/save.js:43,127
const { category_thresholds, ...otherFields } = req.body;

.insert({
  ...otherFields,
  category_thresholds: category_thresholds || {},
})
```

**Slide 继承**：
```javascript
// components/admin/SlideGenerationTab.js:268
category_thresholds: sourceConfig?.category_thresholds || {}
```

### 13.5 测试验证清单

**Report Generation 测试**：
1. ✅ 创建 report，不拖动 slider → 保存默认值 0.30
2. ✅ 拖动 Psychology slider 到 0.15 → 保存 {"Psychology": 0.15, "General": 0.30}
3. ✅ 重新加载该 report config → slider 位置正确恢复
4. ✅ 数据库 `prompt_configs.category_thresholds` 字段正确

**Slide Generation 测试**：
1. ✅ 选择带有 threshold 的 report config
2. ✅ 生成 slides
3. ✅ 检查数据库，slide config 有相同的 `category_thresholds`
4. ✅ slide 的 `source_config_id` 正确指向 report config

**Edge Function 测试**：
1. ✅ Edge Function 读取 `user_reports.category_thresholds`
2. ✅ 为每个文件应用对应 category 的 threshold
3. ✅ 知识检索结果正确过滤

### 13.6 经验教训

1. **空对象陷阱**: `{}` 在 JavaScript 中是 truthy，使用 `||` 时要小心
2. **数据继承**: 从源配置继承时，直接从源读取，不要用 loadedConfig fallback
3. **完整测试**: 前端 → API → 数据库 → 读取，每一步都要验证
4. **日志驱动**: 添加详细日志追踪数据流，快速定位问题
5. **默认值处理**: 用户未手动设置时，要主动构建包含默认值的完整对象

### 13.7 相关 Commits

- `dcf3462` - Fix: Save category_thresholds in Prompt Testing tab
- `5aff0b7` - Fix: Save complete category_thresholds including defaults
- `f17e3b8` - Fix: Backend API not saving category_thresholds to database
- `e454f7d` - Fix: Inherit category_thresholds from report to slide generation
- `1a60436` - Fix: Directly copy category_thresholds from sourceConfig to slide

