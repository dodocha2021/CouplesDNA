# n8n 工作流用户隔离改造指南

## 概述
根据用户隔离计划，需要对 n8n 工作流进行改造，确保所有操作都基于用户ID进行数据隔离。

## 改造要点

### 步骤7: Webhook节点配置
**目标**: 确保工作流能从API接收并解析用户ID

**配置要求**:
1. 在Webhook触发节点中，确认能接收到包含以下字段的JSON数据:
   ```json
   {
     "sessionId": "xxx",
     "totalQuestions": 5,
     "user_id": "用户UUID",
     "question 1": "问题1内容",
     "question 2": "问题2内容",
     ...
   }
   ```

2. 验证Webhook节点能正确解析 `user_id` 字段
3. 在后续节点中使用 `{{$json.user_id}}` 来引用用户ID

### 步骤8: 数据库节点修改
**目标**: 所有数据库查询都必须包含用户ID过滤

**需要修改的数据库操作**:
1. **查询操作**: 所有SELECT语句必须添加 `WHERE user_id = {{$json.user_id}}`
2. **插入操作**: 所有INSERT语句必须包含 `user_id` 字段
3. **更新操作**: 所有UPDATE语句必须添加 `WHERE user_id = {{$json.user_id}}`
4. **删除操作**: 所有DELETE语句必须添加 `WHERE user_id = {{$json.user_id}}`

**示例SQL修改**:
```sql
-- 修改前
SELECT * FROM workflow_progress WHERE session_id = '{{$json.sessionId}}'

-- 修改后  
SELECT * FROM workflow_progress 
WHERE session_id = '{{$json.sessionId}}' AND user_id = '{{$json.user_id}}'

-- 修改前
INSERT INTO n8n_chat_histories (session_id, content, created_at)
VALUES ('{{$json.sessionId}}', '{{$json.content}}', NOW())

-- 修改后
INSERT INTO n8n_chat_histories (session_id, content, created_at, user_id)
VALUES ('{{$json.sessionId}}', '{{$json.content}}', NOW(), '{{$json.user_id}}')
```

### 步骤9: 文件存储节点修改
**目标**: 文件存储路径必须包含用户ID隔离

**文件路径格式**:
```
原路径: final-reports/report-{{$now.toMillis()}}.pdf
新路径: final-reports/{{$json.user_id}}/report-{{$now.toMillis()}}.pdf
```

**配置要求**:
1. 所有文件上传节点的路径都必须包含用户ID
2. 确保目录结构为: `存储桶/用户ID/文件名`
3. 文件下载和读取操作也必须遵循相同的路径结构

## 测试检查点

### 第10步: 测试n8n工作流完整性
在完成上述修改后，需要测试以下功能:

1. **Webhook接收测试**:
   - 发送包含user_id的测试数据
   - 确认工作流能正确解析所有字段

2. **数据库隔离测试**:
   - 创建多个测试用户的数据
   - 验证工作流只操作当前用户的数据
   - 确认不会意外访问其他用户的数据

3. **文件存储隔离测试**:
   - 测试文件上传到正确的用户目录
   - 验证文件路径包含用户ID
   - 确认文件访问权限正确

## 重要提醒
- 所有节点都必须使用 `{{$json.user_id}}` 变量
- 确保没有遗漏任何数据库操作的用户ID过滤
- 文件路径必须包含用户ID作为目录层级
- 测试时使用不同的用户ID验证隔离效果

## 后续步骤
完成n8n改造并测试通过后，将继续前端组件的改造工作。