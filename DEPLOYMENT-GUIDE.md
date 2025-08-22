# 文件自动处理成向量系统 - 部署指南

## 🎯 部署概览
系统已基本完成开发，需要完成以下手动部署步骤：

## 📋 完成状态
✅ **已完成的部分：**
- Edge Function 代码编写完成
- 上传页面增强完成  
- 数据库触发器脚本准备完成
- 本地配置文件设置完成

⚠️ **需要手动完成的部分：**
- 在 Supabase 仪表盘中设置环境变量
- 部署 Edge Function
- 执行数据库触发器脚本

---

## 🔧 第一步：设置 Supabase 环境变量

1. 打开 [Supabase 仪表盘](https://supabase.com/dashboard)
2. 进入你的项目：**wlbhdlkwqfavoxjvjutz**
3. 导航到 **Project Settings** → **Edge Functions**
4. 在 **Environment Variables** 部分添加以下变量：

```
COHERE_API_KEY = caJwxUY3FyQ9eHuYpkJatqXtu4OWNwTCx1Y31fV9
```

**⚠️ 注意：** SUPABASE_URL 和 SUPABASE_ANON_KEY 不需要手动设置，它们是 Supabase 自动提供的环境变量！

---

## 🚀 第二步：部署 Edge Function

1. 在 Supabase 仪表盘中，导航到 **Edge Functions**
2. 点击 **Create a new function**
3. 函数名称：`process-chat-log-to-vector`
4. 将 `supabase/functions/process-chat-log-to-vector/index.ts` 的内容复制粘贴到编辑器中
5. 取消勾选 **Verify JWT** (重要：这样触发器才能调用函数)
6. 点击 **Deploy function**

---

## 🗄️ 第三步：执行数据库触发器脚本

1. 在 Supabase 仪表盘中，导航到 **SQL Editor**
2. 打开项目中的 `create-vector-processing-trigger-final.sql` 文件
3. 将整个文件内容复制到 SQL 编辑器中
4. 点击 **Run** 执行脚本
5. 确认执行成功，应该看到 "All components created successfully!" 消息

---

## ✅ 第四步：验证系统工作

### 4.1 测试触发器
在 SQL 编辑器中运行：
```sql
;
```

### 4.2 测试文件上传
1. 访问 `http://localhost:3000/upload`
2. 上传一个测试聊天记录文件（建议 < 1MB）
3. 观察处理状态显示
4. 检查 Edge Functions 日志是否有处理记录

### 4.3 验证数据库记录
在 SQL 编辑器中检查：
```sql
SELECT * FROM documents ORDER BY id DESC LIMIT 5;
```

---

## 🔍 故障排除

### 常见问题 1：Edge Function 调用失败
- 检查环境变量是否正确设置
- 确认函数已成功部署
- 查看 Edge Functions 日志页面

### 常见问题 2：触发器不工作
- 确认触发器脚本执行成功
- 检查文件是否上传到 `chat-logs` bucket
- 验证 `storage.objects` 表有新记录

### 常见问题 3：Cohere API 错误
- 验证 API 密钥是否正确
- 检查 API 配额是否充足
- 查看 Edge Function 错误日志

---

## 📊 监控和日志

### Edge Function 日志
- 在 Supabase 仪表盘 → Edge Functions → process-chat-log-to-vector → Logs

### 关键日志信息
- `"Processing file: [path] for user: [user_id]"`
- `"Classification result: CHAT/OTHER"`
- `"Generated embedding with [n] dimensions"`
- `"Successfully processed and vectorized file"`

---

## 🎉 部署完成检查清单

- [ ] 环境变量设置完成
- [ ] Edge Function 部署成功
- [ ] 数据库触发器执行成功
- [ ] 测试文件上传流程
- [ ] 验证 documents 表有新记录
- [ ] 检查日志无错误信息

---

## 📝 后续维护

1. **定期检查 Cohere API 使用量**，避免超出配额
2. **监控 documents 表大小**，考虑定期清理旧数据
3. **观察 Edge Function 执行时间**，如果超时可能需要优化
4. **备份重要配置**，包括环境变量和触发器脚本

---

**🔗 相关文件：**
- Edge Function 代码：`supabase/functions/process-chat-log-to-vector/index.ts`
- 触发器脚本：`create-vector-processing-trigger.sql`  
- 配置文件：`supabase/config.toml`
- 上传页面：`pages/upload.js`