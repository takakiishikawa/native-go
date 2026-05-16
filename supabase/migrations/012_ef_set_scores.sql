-- 011: EF SET スコア記録テーブル
-- Run this in the Supabase SQL editor (schema: nativego)

CREATE TABLE IF NOT EXISTS nativego.ef_set_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tested_at date NOT NULL,
  reading int4 NOT NULL,
  listening int4 NOT NULL,
  writing int4 NOT NULL,
  speaking int4 NOT NULL,
  cefr_level text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nativego.ef_set_scores ENABLE ROW LEVEL SECURITY;

-- RLS: 本人レコードのみアクセス可
CREATE POLICY "Users can read own ef_set_scores"
  ON nativego.ef_set_scores FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ef_set_scores"
  ON nativego.ef_set_scores FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ef_set_scores"
  ON nativego.ef_set_scores FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ef_set_scores"
  ON nativego.ef_set_scores FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ef_set_scores_user_date
  ON nativego.ef_set_scores(user_id, tested_at DESC);
