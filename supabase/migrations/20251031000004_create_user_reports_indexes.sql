-- Create indexes for user_reports table to optimize query performance

-- Index for user-specific queries (My Reports page)
CREATE INDEX idx_user_reports_user_id
ON user_reports(user_id);

-- Index for status queries (Edge Function polling)
CREATE INDEX idx_user_reports_status
ON user_reports(status)
WHERE status IN ('pending', 'processing');

-- Index for recent reports (order by created_at DESC)
CREATE INDEX idx_user_reports_created_at
ON user_reports(created_at DESC);

-- Index for soft delete filter
CREATE INDEX idx_user_reports_is_active
ON user_reports(is_active);

-- Composite index for user + active reports (most common query)
CREATE INDEX idx_user_reports_user_active
ON user_reports(user_id, is_active, created_at DESC)
WHERE is_active = true;

-- Index for Manus webhook lookups
CREATE INDEX idx_user_reports_manus_task_id
ON user_reports(manus_task_id)
WHERE manus_task_id IS NOT NULL;

-- Index for source config lookups (admin analytics)
CREATE INDEX idx_user_reports_source_config
ON user_reports(source_config_id)
WHERE source_config_id IS NOT NULL;

-- Add comments
COMMENT ON INDEX idx_user_reports_status IS 'Optimizes Edge Function queries for pending reports';
COMMENT ON INDEX idx_user_reports_user_active IS 'Optimizes My Reports page queries';
COMMENT ON INDEX idx_user_reports_manus_task_id IS 'Optimizes webhook callback lookups';
