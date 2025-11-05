-- Enable RLS on user_reports table
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own active reports
CREATE POLICY "Users can view own reports"
ON user_reports
FOR SELECT
USING (
  auth.uid() = user_id
  AND is_active = true
);

-- Policy: Admins can view all reports (including soft-deleted)
CREATE POLICY "Admins can view all reports"
ON user_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Users can insert their own reports
CREATE POLICY "Users can create own reports"
ON user_reports
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Policy: Users can update their own reports (for thumb_up, soft delete)
CREATE POLICY "Users can update own reports"
ON user_reports
FOR UPDATE
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- Policy: Admins can update all reports (for restore, etc.)
CREATE POLICY "Admins can update all reports"
ON user_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Users can delete (hard delete) their own reports
-- Note: Soft delete should be done via UPDATE, this is for edge cases
CREATE POLICY "Users can delete own reports"
ON user_reports
FOR DELETE
USING (
  auth.uid() = user_id
);

-- Policy: Admins can delete any report
CREATE POLICY "Admins can delete any report"
ON user_reports
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Add comments
COMMENT ON POLICY "Users can view own reports" ON user_reports IS 'Users see only their active reports in My Reports page';
COMMENT ON POLICY "Admins can view all reports" ON user_reports IS 'Admins see all reports including soft-deleted ones in Admin Panel';
