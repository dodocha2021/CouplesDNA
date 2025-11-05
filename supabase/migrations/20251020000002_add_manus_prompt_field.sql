-- Add fields for Slide Generation
-- Migration: 20251020000002_add_slide_generation_fields

-- User-customizable prompt template for Manus (without report content)
ALTER TABLE prompt_configs
ADD COLUMN IF NOT EXISTS manus_prompt TEXT;

-- Store complete raw output from Manus API
ALTER TABLE prompt_configs
ADD COLUMN IF NOT EXISTS manus_raw_output JSONB;

-- Comments
COMMENT ON COLUMN prompt_configs.manus_prompt IS 'User-customizable prompt template for Manus slide generation (without report content)';
COMMENT ON COLUMN prompt_configs.manus_raw_output IS 'Complete raw output from Manus API for debugging and flexible parsing';
