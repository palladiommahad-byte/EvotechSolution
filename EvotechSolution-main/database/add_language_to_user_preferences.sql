-- Add language column to user_preferences table
-- This stores the user's preferred language (en or fr)

ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en', 'fr'));

-- Create index for language
CREATE INDEX IF NOT EXISTS idx_user_preferences_language ON user_preferences(language);

-- Update existing preferences to have default language
UPDATE user_preferences 
SET language = 'en' 
WHERE language IS NULL;
