# User Data Retrieval Fix - Implementation Plan

## Problem Summary

The `process-user-reports` Edge Function is unable to retrieve user data chunks, showing "Found 0 user data chunks" in logs while successfully finding 40 knowledge chunks.

### Root Causes

1. **Bug #1**: Function name error - calling `match_user_data` (doesn't exist) instead of `match_user_data_by_files`
2. **Bug #2**: Missing required `p_user_id` parameter - user data requires user isolation
3. **Bug #3**: Parameter name error - using `p_file_id` (singular) instead of `p_file_ids` (plural array)
4. **Bug #4**: Extra parameter `match_threshold` - function doesn't accept this parameter

### Current System Limitation

- Knowledge: Supports multiple files (array) ✅
- User Data: Only supports single file ❌

---

## Phase 1: Emergency Fix (Critical) 🔴

**Priority**: IMMEDIATE
**Goal**: Fix the critical bugs to make user data retrieval work

### Changes Required

#### File: `supabase/functions/process-user-reports/index.ts`

**Location 1**: Line 89-116 - `retrieveUserData` function

Changes:
- Add `userId: string` parameter
- Change function name: `match_user_data` → `match_user_data_by_files`
- Add `p_user_id: userId` parameter
- Change parameter name: `p_file_id` → `p_file_ids`
- Change parameter format: `fileId` → `[fileId]` (array)
- Remove `match_threshold` parameter

**Location 2**: Line 284-290 - Function call

Changes:
- Pass `report.user_id` as new parameter
- Ensure `report.user_data_id` is wrapped in array: `[report.user_data_id]`

### Expected Result

After fix, Supabase logs should show:
```
✅ Found 40 knowledge chunks
✅ Found XX user data chunks  ← No longer 0!
```

### Testing Checklist

- [ ] Edge Function deploys successfully
- [ ] No TypeScript/Deno errors
- [ ] User data chunks are retrieved (count > 0)
- [ ] Report generation completes successfully
- [ ] Generated report contains user-specific information

---

## Phase 2: Multi-File Support (Enhancement) 🟡

**Priority**: SHORT-TERM
**Goal**: Allow users to select multiple user data files, matching knowledge file selection UX

### Changes Required

#### A. Database Schema Migration

**File**: `supabase/migrations/YYYYMMDDHHMMSS_add_user_data_ids_array.sql`

```sql
-- Add new array column for multi-file support
ALTER TABLE user_reports
  ADD COLUMN user_data_ids TEXT[] DEFAULT NULL;

-- Migrate existing data
UPDATE user_reports
SET user_data_ids = ARRAY[user_data_id::text]
WHERE user_data_ids IS NULL;

-- Add check constraint (at least one method must be used)
ALTER TABLE user_reports
  ADD CONSTRAINT user_data_selection_check
  CHECK (user_data_id IS NOT NULL OR (user_data_ids IS NOT NULL AND array_length(user_data_ids, 1) > 0));
```

#### B. API Endpoint Update

**File**: `pages/api/user-reports/create.js`

Changes:
- Accept both `user_data_id` (legacy) and `user_data_ids` (new) from request body
- Validate all file IDs belong to current user
- Support backward compatibility

#### C. Edge Function Update

**File**: `supabase/functions/process-user-reports/index.ts`

Changes:
- Read from `user_data_ids` array (fallback to single `user_data_id`)
- Query multiple user files metadata
- Pass all file IDs to `retrieveUserData`
- Update logs to show all selected files

#### D. Frontend Update

**File**: `components/admin/ReportGenerationTab.js`

Changes:
- Change from single Select to multi-select Checkbox list
- Update state management for array of IDs
- Update UI to show selected count
- Maintain UX consistency with knowledge file selection

### Testing Checklist

- [ ] Single file selection still works (backward compatibility)
- [ ] Multiple files can be selected
- [ ] All selected files are processed
- [ ] Results are merged correctly
- [ ] UI shows clear feedback on selection

---

## Phase 3: Performance Optimization (Optimization) 🟢

**Priority**: MEDIUM-TERM
**Goal**: Improve query efficiency and response time

### A. Batch Query Optimization

**File**: `supabase/functions/process-user-reports/index.ts`

**Current approach** (inefficient):
```typescript
// Calls RPC once per file
const promises = selectedFileIds.map(fileId =>
  supabase.rpc('match_user_data_by_files', {
    p_file_ids: [fileId]  // Single file per call
  })
);
```

**Optimized approach**:
```typescript
// Single RPC call for all files
const { data } = await supabase.rpc('match_user_data_by_files', {
  p_user_id: userId,
  query_embedding: vectorString,
  match_count: topK,
  p_file_ids: selectedFileIds  // All files in one call
});
```

**Benefits**:
- Reduces network round trips
- Reduces database connections
- Faster response time
- Lower resource usage

### B. Add Threshold Support (Optional)

**File**: `supabase/migrations/YYYYMMDDHHMMSS_add_threshold_to_match_user_data.sql`

Add `match_threshold` parameter to maintain consistency with knowledge query:

```sql
CREATE OR REPLACE FUNCTION match_user_data_by_files(
  p_user_id uuid,
  query_embedding vector(768),
  match_count int DEFAULT 5,
  match_threshold double precision DEFAULT 0.0,  -- New parameter
  p_file_ids text[] DEFAULT NULL
)
RETURNS TABLE (
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    clv.content,
    clv.metadata,
    1 - (clv.embedding <=> query_embedding) as similarity
  FROM chat_log_vectors AS clv
  INNER JOIN user_uploads AS uu ON (clv.metadata->>'file_id')::text = uu.id::text
  WHERE
    clv.user_id = p_user_id
    AND clv.is_active = true
    AND uu.is_active = true
    AND (p_file_ids IS NULL OR (clv.metadata->>'file_id') = ANY(p_file_ids))
    AND 1 - (clv.embedding <=> query_embedding) > match_threshold  -- Threshold filter
  ORDER BY
    clv.embedding <=> query_embedding
  LIMIT
    match_count;
END;
$$;
```

### Testing Checklist

- [ ] Single RPC call retrieves all file data
- [ ] Response time improved (measure before/after)
- [ ] Results are identical to multi-call approach
- [ ] Threshold filtering works correctly (if implemented)
- [ ] No regression in functionality

---

## Implementation Schedule

### Today's Goal: Complete Phase 1, 2, and 3

#### Morning Session
- ✅ Complete Phase 1 (Emergency Fix)
- 🧪 User testing Phase 1

#### Afternoon Session
- ✅ Complete Phase 2 (Multi-File Support)
- 🧪 User testing Phase 2
- ✅ Complete Phase 3 (Performance Optimization)
- 🧪 User testing Phase 3

---

## Rollback Plan

If any phase causes issues:

### Phase 1 Rollback
- Revert `process-user-reports/index.ts` changes
- Re-deploy previous Edge Function version

### Phase 2 Rollback
- Keep `user_data_ids` column but don't use it
- Continue using `user_data_id` only
- Frontend remains single-select

### Phase 3 Rollback
- Revert to map-based multi-call approach
- Keep threshold parameter optional

---

## Success Metrics

### Phase 1
- User data chunks retrieved successfully (count > 0)
- Report generation success rate: 100%

### Phase 2
- Users can select 1-N files
- Multi-file reports generate successfully
- Backward compatibility maintained

### Phase 3
- Query time reduced by 30-50%
- Single RPC call instead of N calls
- Resource usage optimized

---

## Notes

- Each phase is independent and can be deployed separately
- All changes maintain backward compatibility where possible
- Database migrations are designed to be reversible
- Edge Functions can be quickly rolled back via Supabase dashboard

---

**Document Created**: 2025-11-03
**Last Updated**: 2025-11-03
**Status**: Phase 1 - In Progress
