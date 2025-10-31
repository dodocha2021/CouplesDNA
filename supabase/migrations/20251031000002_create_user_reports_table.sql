-- Create user_reports table for storing user-generated reports
-- This table tracks the complete lifecycle of report generation from user data

CREATE TABLE user_reports (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- User selections
  user_data_id UUID NOT NULL REFERENCES user_uploads(id),
  setting_name TEXT NOT NULL,

  -- Configuration copied from prompt_configs
  model_selection TEXT NOT NULL,
  selected_knowledge_ids TEXT[] NOT NULL,
  top_k_results INTEGER NOT NULL DEFAULT 5,
  strict_mode BOOLEAN NOT NULL DEFAULT true,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  manus_prompt TEXT,
  category_thresholds JSONB DEFAULT '{}'::jsonb,
  source_config_id UUID REFERENCES prompt_configs(id),

  -- Generated content
  debug_logs TEXT,
  generated_report TEXT,
  generate_slides JSONB,

  -- Overall status tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

  -- Report generation status
  report_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (report_status IN ('pending', 'generating', 'completed', 'failed')),
  report_error TEXT,

  -- Slide generation status
  slide_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (slide_status IN ('pending', 'generating', 'completed', 'failed')),
  slide_error TEXT,

  -- Manus integration
  manus_task_id TEXT,
  manus_share_url TEXT,
  manus_task_status TEXT,
  manus_task_error TEXT,
  manus_task_created_at TIMESTAMPTZ,
  manus_task_completed_at TIMESTAMPTZ,
  manus_raw_output JSONB,

  -- User feedback
  thumb_up BOOLEAN DEFAULT NULL,

  -- Soft delete
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_reports_updated_at_trigger
  BEFORE UPDATE ON user_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reports_updated_at();

-- Add comments
COMMENT ON TABLE user_reports IS 'Stores user-generated reports with complete lifecycle tracking';
COMMENT ON COLUMN user_reports.status IS 'Overall status: pending -> processing -> completed/failed';
COMMENT ON COLUMN user_reports.report_status IS 'Report generation status';
COMMENT ON COLUMN user_reports.slide_status IS 'Slide generation status';
COMMENT ON COLUMN user_reports.thumb_up IS 'User feedback: true=like, false=dislike, null=not rated';
