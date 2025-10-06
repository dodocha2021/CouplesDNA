-- 1. 创建或替换触发器函数
CREATE OR REPLACE FUNCTION public.handle_user_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE LOG 'Triggering userdata-task for: %', NEW.file_name;
  
  PERFORM net.http_post(
    url := 'https://bdabfjjhumnrioysmsjo.supabase.co/functions/v1/userdata-task',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkYWJmampodW1ucmlveXNtc2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NjcyODMsImV4cCI6MjA3NDI0MzI4M30.1ejiIAj-kIe-obnC2qeGpPiw-vq8HN-SjHU_B8mbzN8"}'::jsonb,
    body := jsonb_build_object('record', row_to_json(NEW))
  );
  
  RETURN NEW;
END;
$$;

-- 2. 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_process_user_upload ON user_uploads;

-- 3. 创建新触发器
CREATE TRIGGER trigger_process_user_upload
AFTER INSERT ON user_uploads
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION public.handle_user_upload();

-- 4. 验证触发器已创建
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_process_user_upload';