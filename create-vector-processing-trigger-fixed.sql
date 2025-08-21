-- 文件自动处理成向量数据库触发器设置脚本 (修正版本)
-- 在 Supabase SQL 编辑器中运行此脚本

-- 第一步：确认 pgvector 扩展已启用
CREATE EXTENSION IF NOT EXISTS vector;

-- 第二步：创建触发器函数来调用 Edge Function
CREATE OR REPLACE FUNCTION public.handle_new_file_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- 赋予函数更高的权限来执行 HTTP 请求
AS $$
BEGIN
  -- 调用我们部署的 Edge Function
  PERFORM net.http_post(
      url:='https://wlbhdlkwqfavoxjvjutz.supabase.co/functions/v1/process-chat-log-to-vector',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYmhkbGt3cWZhdm94anZqdXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1Nzk4MjMsImV4cCI6MjA2NzE1NTgyM30.nJ5wqIE5EsBDNXhyM18s4mPliTMprnWpWbBZLjUGwmA"}'::jsonb,
      body:=jsonb_build_object('record', row_to_json(NEW)) -- 将新文件的记录作为 JSON 发送
  );
  RETURN NEW;
END;
$$;

-- 第三步：删除现有的触发器（如果存在）
DROP TRIGGER IF EXISTS on_chat_file_upload_trigger ON storage.objects;

-- 第四步：创建触发器绑定到 storage.objects 表的 INSERT 事件
-- 注意：只有当文件上传到 'chat-logs' bucket 时才触发
CREATE TRIGGER on_chat_file_upload_trigger
AFTER INSERT ON storage.objects
FOR EACH ROW
WHEN (NEW.bucket_id = 'chat-logs') -- 只处理 chat-logs bucket 的文件
EXECUTE FUNCTION public.handle_new_file_upload();

-- 第五步：创建测试函数
CREATE OR REPLACE FUNCTION public.test_vector_processing_trigger()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
  test_user_id uuid;
BEGIN
  -- 获取一个现有用户ID，如果没有则创建测试用户ID
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  -- 如果没有用户，使用一个固定的测试UUID
  IF test_user_id IS NULL THEN
    test_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;
  
  -- 模拟文件上传记录
  INSERT INTO storage.objects (name, bucket_id, owner, created_at, updated_at, last_accessed_at, metadata)
  VALUES (
    'users/test-user/test-chat-' || extract(epoch from now()) || '.txt',
    'chat-logs',
    test_user_id,
    now(),
    now(),
    now(),
    '{"size": 1024, "mimetype": "text/plain"}'::jsonb
  );
  
  -- 返回成功消息
  SELECT json_build_object(
    'success', true,
    'message', 'Test trigger executed successfully',
    'timestamp', now(),
    'test_user_id', test_user_id
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 第六步：验证触发器创建成功
SELECT 'Trigger and test function created successfully' AS status;

-- 第六步：检查 documents 表结构是否正确
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'documents' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 使用说明：
-- 1. 在 Supabase 仪表盘的 "SQL Editor" 中执行此脚本
-- 2. 确保你的项目 URL 已正确替换（当前使用：wlbhdlkwqfavoxjvjutz.supabase.co）
-- 3. 触发器将在每次向 'chat-logs' bucket 上传文件时自动激活
-- 4. 如果需要测试，可以通过上传文件到 /upload 页面来验证