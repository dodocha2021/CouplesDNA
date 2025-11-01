-- Add category_thresholds field to user_reports table
-- This stores the threshold values for each knowledge category used in vector search
-- Format: { "category_name": threshold_value, ... } e.g., { "Relationship": 0.05, "General": 0.30 }

ALTER TABLE user_reports
ADD COLUMN category_thresholds JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_reports.category_thresholds IS 'Category-specific similarity thresholds for knowledge base search (e.g., {"Relationship": 0.05, "Communication": 0.15})';
