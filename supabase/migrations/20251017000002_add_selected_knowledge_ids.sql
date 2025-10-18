-- Add support for multiple knowledge base selection in prompt_configs

-- Add new column for storing multiple knowledge base IDs
ALTER TABLE prompt_configs 
ADD COLUMN selected_knowledge_ids TEXT[];

-- Add index for the new column
CREATE INDEX idx_prompt_configs_selected_knowledge_ids 
ON prompt_configs USING GIN (selected_knowledge_ids);

-- Migrate existing single knowledge_base_id to array format
UPDATE prompt_configs 
SET selected_knowledge_ids = ARRAY[knowledge_base_id::text]
WHERE knowledge_base_id IS NOT NULL AND selected_knowledge_ids IS NULL;

-- Add comment
COMMENT ON COLUMN prompt_configs.selected_knowledge_ids IS 'Array of selected knowledge base file IDs (supports multiple selection)';