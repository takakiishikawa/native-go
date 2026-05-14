-- 007: vocabulary table + priority flag + source title
-- Run this in the Supabase SQL editor (schema: nativego)

-- =========================================================
-- 1) words テーブル新設（単語専用）
-- =========================================================
CREATE TABLE IF NOT EXISTS nativego.words (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word            text NOT NULL,                 -- 見出し語（ベトナム語 or 英語）
  meaning         text NOT NULL,                 -- 日本語訳
  example         text,                          -- 例文（任意）
  usage_scene     text,                          -- 使用シーン（任意）
  word_notes      jsonb,                         -- 既存 expressions と同形式
  frequency       smallint NOT NULL DEFAULT 3,
  play_count      integer  NOT NULL DEFAULT 0,
  last_played_at  date,
  is_priority     boolean  NOT NULL DEFAULT false, -- 強化フラグ
  source_title    text,                            -- 例: "TRIAL LESSON - HOMEWORK"
  language        nativego.language_code NOT NULL DEFAULT 'en',
  lesson_id       uuid REFERENCES nativego.lessons(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_words_lang
  ON nativego.words(language, lesson_id);
CREATE INDEX IF NOT EXISTS idx_words_priority
  ON nativego.words(language, is_priority) WHERE is_priority = true;

-- 同一言語内で見出し語ユニーク（大文字小文字差のみ無視・声調記号は区別）
CREATE UNIQUE INDEX IF NOT EXISTS uq_words_lang_word
  ON nativego.words(language, lower(word));

ALTER TABLE nativego.words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "words_select_auth" ON nativego.words;
CREATE POLICY "words_select_auth" ON nativego.words
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "words_insert_auth" ON nativego.words;
CREATE POLICY "words_insert_auth" ON nativego.words
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "words_update_auth" ON nativego.words;
CREATE POLICY "words_update_auth" ON nativego.words
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "words_delete_auth" ON nativego.words;
CREATE POLICY "words_delete_auth" ON nativego.words
  FOR DELETE TO authenticated USING (true);

-- =========================================================
-- 2) 強化フラグ + ソースタイトルを既存テーブルにも追加
--    既存データは is_priority=false / source_title=null
-- =========================================================
ALTER TABLE nativego.expressions
  ADD COLUMN IF NOT EXISTS is_priority  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_title text;

ALTER TABLE nativego.grammar
  ADD COLUMN IF NOT EXISTS is_priority  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_title text;

CREATE INDEX IF NOT EXISTS idx_expressions_priority
  ON nativego.expressions(language, is_priority) WHERE is_priority = true;
CREATE INDEX IF NOT EXISTS idx_grammar_priority
  ON nativego.grammar(language, is_priority) WHERE is_priority = true;

-- =========================================================
-- 3) practice_logs に word_done_count を追加
-- =========================================================
ALTER TABLE nativego.practice_logs
  ADD COLUMN IF NOT EXISTS word_done_count int4 NOT NULL DEFAULT 0;
