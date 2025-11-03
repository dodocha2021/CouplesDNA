# Phase 1 Deployment Guide

## 🚀 Deploy to Supabase

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - URL: https://app.supabase.com/project/wlbhdlkwqfavoxjvjutz/functions

2. **Find the `process-user-reports` function**
   - Click on it to open

3. **Click "Edit Function" or "Deploy New Version"**

4. **Delete the old code and paste the new code**
   - Copy the entire content from `supabase/functions/process-user-reports/index.ts`
   - Or copy from the code block below

5. **Click "Deploy" or "Save"**

6. **Wait for deployment to complete** (usually takes 10-30 seconds)

---

## 📋 Key Changes Verification

After pasting the new code, verify these lines are correct:

### Line 90-96: Function signature should have `userId` parameter
```typescript
async function retrieveUserData(
  questionEmbedding: number[],
  supabase: any,
  selectedFileIds: string[],
  topK: number,
  userId: string  // ← Must have this
): Promise<any[]> {
```

### Line 100-105: RPC call should use correct function name and parameters
```typescript
supabase.rpc('match_user_data_by_files', {  // ← Must be match_user_data_by_files
  p_user_id: userId,           // ← Must have this
  query_embedding: vectorString,
  match_count: topK,
  p_file_ids: [fileId]         // ← Must be p_file_ids (plural)
})
```

### Line 286-292: Function call should pass userId
```typescript
const userDataResults = await retrieveUserData(
  questionEmbedding,
  supabase,
  [report.user_data_id],
  report.top_k_results || 5,
  report.user_id  // ← Must pass this
);
```

---

## ✅ Verification Steps

After deployment:

1. **Check deployment status** in Supabase Dashboard
   - Should show "Deployed" with a green checkmark

2. **Check function logs**
   - Go to Edge Functions → process-user-reports → Logs
   - Should not show any deployment errors

3. **Test the function**
   - Generate a new report in your application
   - Check the logs for:
     ```
     ✅ Found XX knowledge chunks
     ✅ Found XX user data chunks  ← Should be > 0 now!
     ```

---

## 🆘 Troubleshooting

### If deployment fails:
- Check for syntax errors in the pasted code
- Make sure the entire code was copied (should be ~457 lines)
- Try refreshing the page and deploying again

### If "Found 0 user data chunks" still appears:
- Check that the function name is `match_user_data_by_files` (line 100)
- Check that `p_user_id: userId` is present (line 101)
- Check that `report.user_id` is passed in the function call (line 291)

### If you see RPC errors in logs:
- The database function `match_user_data_by_files` might not exist
- Check database migrations are applied
- Contact support with the error message

---

## 📞 Support

If you encounter any issues:
1. Copy the error message from Supabase logs
2. Share it with me for analysis
3. I'll help debug the issue

---

**Status**: Ready for Phase 1 deployment
**Expected Result**: User data chunks will be retrieved successfully
