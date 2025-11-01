-- Add report_topic field to user_reports table
-- This field stores the actual question/query to be sent to AI
-- Different from setting_name which is just a display label for users

ALTER TABLE user_reports
ADD COLUMN report_topic TEXT;

COMMENT ON COLUMN user_reports.setting_name IS 'Display name shown to users (e.g., "Relationship", "Communication")';
COMMENT ON COLUMN user_reports.report_topic IS 'Actual question/query sent to AI (e.g., "What Mia can do to prevent...")';
