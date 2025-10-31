-- Add setting_name and category_thresholds fields to prompt_configs table
-- These fields support the System Default Configuration feature

-- Add setting_name field for user-defined topic names
ALTER TABLE prompt_configs
ADD COLUMN setting_name TEXT;

-- Add category_thresholds field for storing threshold values per category
ALTER TABLE prompt_configs
ADD COLUMN category_thresholds JSONB DEFAULT '{}'::jsonb;

-- Add index for setting_name lookups
CREATE INDEX idx_prompt_configs_setting_name
ON prompt_configs(setting_name) WHERE setting_name IS NOT NULL;

-- Add comment
COMMENT ON COLUMN prompt_configs.setting_name IS 'User-defined name for the configuration template (shown in My Reports topic selection)';
COMMENT ON COLUMN prompt_configs.category_thresholds IS 'Threshold values for each knowledge base category, e.g. {"General": 0.30, "Psychology": 0.25}';
