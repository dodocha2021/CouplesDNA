-- Adds required columns for questionnaire, timestamps and dashboard data to the profiles table.
-- IF NOT EXISTS makes the command safe to run multiple times.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC-8',
ADD COLUMN IF NOT EXISTS age_range TEXT,
ADD COLUMN IF NOT EXISTS relationship_stage TEXT,
ADD COLUMN IF NOT EXISTS default_focus TEXT,
ADD COLUMN IF NOT EXISTS total_reports INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_sentiment_score DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS best_communication_mode TEXT,
ADD COLUMN IF NOT EXISTS sentiment_trend JSON,
ADD COLUMN IF NOT EXISTS communication_style_distribution JSON,
ADD COLUMN IF NOT EXISTS email_reports BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS weekly_insights BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS chat_reminders BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS marketing_emails BOOLEAN DEFAULT false;