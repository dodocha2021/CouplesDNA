-- Create prompt_configs table for storing prompt configurations

-- Create enum for prompt type
CREATE TYPE prompt_type AS ENUM ('general', 'report');

-- Create prompt_configs table
CREATE TABLE prompt_configs (
    -- Primary fields
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_type prompt_type NOT NULL,
    name TEXT NOT NULL,
    
    -- Common configuration fields (both types)
    model_selection TEXT NOT NULL,
    knowledge_base_id UUID REFERENCES knowledge_uploads(id) ON DELETE SET NULL,
    knowledge_base_name TEXT,
    top_k_results INTEGER NOT NULL,
    strict_mode BOOLEAN NOT NULL DEFAULT true,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    debug_logs TEXT,
    
    -- General Prompt specific fields
    test_question TEXT,
    generated_response TEXT,
    
    -- Report Prompt specific fields
    user_data_id UUID REFERENCES user_uploads(id) ON DELETE SET NULL,
    user_data_name TEXT,
    report_topic TEXT,
    generated_report TEXT,
    generate_slides TEXT,
    
    -- System flags
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_system_default BOOLEAN NOT NULL DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_prompt_configs_user_id ON prompt_configs(user_id);
CREATE INDEX idx_prompt_configs_prompt_type ON prompt_configs(prompt_type);
CREATE INDEX idx_prompt_configs_is_system_default ON prompt_configs(is_system_default);
CREATE INDEX idx_prompt_configs_created_at ON prompt_configs(created_at DESC);
CREATE INDEX idx_prompt_configs_is_active ON prompt_configs(is_active);

-- Composite index for finding system defaults by type
CREATE INDEX idx_prompt_configs_type_default ON prompt_configs(prompt_type, is_system_default) 
WHERE is_system_default = true;

-- Add unique constraint: only one system default per prompt_type per user
CREATE UNIQUE INDEX idx_prompt_configs_unique_default 
ON prompt_configs(user_id, prompt_type, is_system_default) 
WHERE is_system_default = true;

-- Enable Row Level Security
ALTER TABLE prompt_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own prompt configs"
ON prompt_configs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompt configs"
ON prompt_configs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompt configs"
ON prompt_configs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompt configs"
ON prompt_configs FOR DELETE
USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prompt_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_prompt_configs_updated_at
    BEFORE UPDATE ON prompt_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_prompt_configs_updated_at();