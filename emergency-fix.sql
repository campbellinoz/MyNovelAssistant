-- Emergency fix for OAuth columns if migration deletes them
-- Run this immediately if columns get deleted

ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_audio_characters integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_translation_characters integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS audio_character_limit integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS translation_character_limit integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_month_overage_charges integer DEFAULT 0;