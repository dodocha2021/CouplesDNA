-- Fix conflicting unique constraints for prompts_settings table
-- Run this in your Supabase SQL editor

-- Step 1: Drop the old global unique constraint on setting_key
DO $$
BEGIN
    -- Check if the old constraint exists and drop it
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'prompts_settings_setting_key_key' 
               AND table_name = 'prompts_settings') THEN
        ALTER TABLE public.prompts_settings DROP CONSTRAINT prompts_settings_setting_key_key;
        RAISE NOTICE 'Dropped old global unique constraint on setting_key';
    ELSE
        RAISE NOTICE 'Old constraint prompts_settings_setting_key_key does not exist';
    END IF;
END $$;

-- Step 2: Ensure the new user-specific constraint exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'prompts_settings_user_setting_unique' 
                  AND table_name = 'prompts_settings') THEN
        ALTER TABLE public.prompts_settings 
        ADD CONSTRAINT prompts_settings_user_setting_unique 
        UNIQUE (user_id, setting_key);
        RAISE NOTICE 'Added user-specific unique constraint (user_id, setting_key)';
    ELSE
        RAISE NOTICE 'User-specific unique constraint already exists';
    END IF;
END $$;

-- Step 3: Ensure prompts_config has the correct constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'prompts_config_user_question_unique' 
                  AND table_name = 'prompts_config') THEN
        ALTER TABLE public.prompts_config 
        ADD CONSTRAINT prompts_config_user_question_unique 
        UNIQUE (user_id, question_number);
        RAISE NOTICE 'Added user-specific unique constraint for prompts_config';
    ELSE
        RAISE NOTICE 'Prompts_config unique constraint already exists';
    END IF;
END $$;

-- Verify the constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('prompts_settings', 'prompts_config')
    AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.table_name, tc.constraint_name;