-- 029: Ryan(EN shadowing)のプレイリスト管理 + 完了記録の時間スナップショット化
-- Run this in the Supabase SQL editor (schema: fluent)
--
-- 背景: /report の合計時間集計は youtube_logs と youtube_videos を都度JOINして
-- 計算しており、youtube_videos の行を削除すると過去分の合計時間が失われる。
-- 今後 Ryan のライブラリを何度入れ替えても壊れないよう、完了時点の動画時間を
-- youtube_logs 自体に保存する（スナップショット化）。
--
-- 実行順序が重要（このファイルの上から順に実行すること）。

-- ── 1. youtube_logs に時間スナップショット列を追加 ────────────────────────
ALTER TABLE fluent.youtube_logs
  ADD COLUMN IF NOT EXISTS duration text;

-- 既存ログに現時点の動画時間をバックフィル（この後の削除で失われる前に確定させる）
UPDATE fluent.youtube_logs l
SET duration = v.duration
FROM fluent.youtube_videos v
WHERE l.video_id = v.id AND l.duration IS NULL;

-- video_id を nullable にし、動画削除時に「レコードごと消える」のではなく
-- 「video_id が外れるだけ」になるよう FK を ON DELETE SET NULL に張り替える
-- （制約名が環境によって異なる可能性があるため動的に探して張り替える）
ALTER TABLE fluent.youtube_logs
  ALTER COLUMN video_id DROP NOT NULL;

DO $$
DECLARE
  con text;
BEGIN
  SELECT tc.constraint_name INTO con
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'fluent'
    AND tc.table_name = 'youtube_logs'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'video_id'
  LIMIT 1;

  IF con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE fluent.youtube_logs DROP CONSTRAINT %I', con);
  END IF;
END $$;

ALTER TABLE fluent.youtube_logs
  ADD CONSTRAINT youtube_logs_video_id_fkey
  FOREIGN KEY (video_id) REFERENCES fluent.youtube_videos(id) ON DELETE SET NULL;

-- ── 2. 再生リスト管理テーブルを新設 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fluent.youtube_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES fluent.youtube_channels(id) ON DELETE CASCADE,
  youtube_playlist_id text NOT NULL,
  title text NOT NULL,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, youtube_playlist_id)
);

ALTER TABLE fluent.youtube_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own youtube_playlists"
  ON fluent.youtube_playlists FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own youtube_playlists"
  ON fluent.youtube_playlists FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own youtube_playlists"
  ON fluent.youtube_playlists FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own youtube_playlists"
  ON fluent.youtube_playlists FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON fluent.youtube_playlists TO authenticated;

-- ── 3. youtube_videos に所属プレイリストを追加（nullなら「未所属」） ──────
ALTER TABLE fluent.youtube_videos
  ADD COLUMN IF NOT EXISTS playlist_id uuid REFERENCES fluent.youtube_playlists(id) ON DELETE SET NULL;

-- ── 4. Ryan(en)チャンネルの取得済みデータを一度リセット ───────────────────
-- チャンネル行自体（ハンドルの情報源）は残し、動画のみ削除する。
-- youtube_logs は 1. のスナップショットにより duration を保持したまま、
-- video_id が NULL になるだけで完了記録・レポート集計は失われない。
DELETE FROM fluent.youtube_videos
WHERE channel_id IN (
  SELECT id FROM fluent.youtube_channels WHERE language = 'en'
);
