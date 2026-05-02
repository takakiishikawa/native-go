-- 003: language switch (en/vi) — adds per-record language scoping
-- Run this in the Supabase SQL editor (schema: nativego)

-- 1. ENUM type for language codes
DO $$ BEGIN
  CREATE TYPE nativego.language_code AS ENUM ('en', 'vi');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. user_settings: 現在選択中の言語
ALTER TABLE nativego.user_settings
  ADD COLUMN IF NOT EXISTS current_language nativego.language_code NOT NULL DEFAULT 'en';

-- 3. コンテンツ系テーブル
ALTER TABLE nativego.grammar
  ADD COLUMN IF NOT EXISTS language nativego.language_code NOT NULL DEFAULT 'en';
ALTER TABLE nativego.expressions
  ADD COLUMN IF NOT EXISTS language nativego.language_code NOT NULL DEFAULT 'en';
ALTER TABLE nativego.lessons
  ADD COLUMN IF NOT EXISTS language nativego.language_code NOT NULL DEFAULT 'en';

-- 4. ログ系テーブル
ALTER TABLE nativego.practice_logs
  ADD COLUMN IF NOT EXISTS language nativego.language_code NOT NULL DEFAULT 'en';
ALTER TABLE nativego.speaking_logs
  ADD COLUMN IF NOT EXISTS language nativego.language_code NOT NULL DEFAULT 'en';

-- 5. YouTube系（チャンネル + 派生テーブル両方に持つ。レポートクエリでJOINを避けるため）
ALTER TABLE nativego.youtube_channels
  ADD COLUMN IF NOT EXISTS language nativego.language_code NOT NULL DEFAULT 'en';
ALTER TABLE nativego.youtube_videos
  ADD COLUMN IF NOT EXISTS language nativego.language_code NOT NULL DEFAULT 'en';
ALTER TABLE nativego.youtube_logs
  ADD COLUMN IF NOT EXISTS language nativego.language_code NOT NULL DEFAULT 'en';

-- 6. practice_logs の一意性を再定義
--    既存: UNIQUE (practiced_at)
--    新:   UNIQUE (practiced_at, language)
ALTER TABLE nativego.practice_logs
  DROP CONSTRAINT IF EXISTS practice_logs_practiced_at_key;
ALTER TABLE nativego.practice_logs
  ADD CONSTRAINT practice_logs_practiced_at_lang_key
  UNIQUE (practiced_at, language);

-- 7. 複合インデックス
CREATE INDEX IF NOT EXISTS idx_grammar_lang
  ON nativego.grammar(language, lesson_id);
CREATE INDEX IF NOT EXISTS idx_expressions_lang
  ON nativego.expressions(language, lesson_id);
CREATE INDEX IF NOT EXISTS idx_lessons_lang
  ON nativego.lessons(language, level);
CREATE INDEX IF NOT EXISTS idx_practice_logs_lang_date
  ON nativego.practice_logs(language, practiced_at);
CREATE INDEX IF NOT EXISTS idx_youtube_channels_user_lang
  ON nativego.youtube_channels(user_id, language);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_lang
  ON nativego.youtube_videos(language, channel_id);
CREATE INDEX IF NOT EXISTS idx_youtube_logs_lang_date
  ON nativego.youtube_logs(language, completed_at);
