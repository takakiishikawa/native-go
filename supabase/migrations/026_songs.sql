-- 026: Songs（歌詞和訳）機能のテーブル
-- Run this in the Supabase SQL editor (schema: fluent)
--
-- ユーザーが好きな曲を選び、公式MVを見ながら歌詞を1行ずつ自分の日本語訳に
-- 起こしていく個人ワークスペース。歌詞は自動取得せずユーザー自身が貼り付ける。

CREATE TABLE IF NOT EXISTS fluent.songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'en',
  title text NOT NULL,
  artist text NOT NULL DEFAULT '',
  youtube_video_id text NOT NULL,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fluent.songs ENABLE ROW LEVEL SECURITY;

-- RLS: 本人レコードのみアクセス可
CREATE POLICY "Users can read own songs"
  ON fluent.songs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own songs"
  ON fluent.songs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own songs"
  ON fluent.songs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own songs"
  ON fluent.songs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_songs_user_lang
  ON fluent.songs(user_id, language, created_at DESC);

-- fluent スキーマには ALTER DEFAULT PRIVILEGES が無いため、新規テーブルには
-- 明示的に GRANT を当てる必要がある（019のoutput_topicsで一度漏れた教訓）
GRANT SELECT, INSERT, UPDATE, DELETE ON fluent.songs TO authenticated;
