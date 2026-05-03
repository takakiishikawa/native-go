-- 006: speaking scenes — decouple speaking practice from grammar
-- Run this in the Supabase SQL editor (schema: nativego)
--
-- Speaking practice no longer references grammar items. Scenes are generated
-- independently as 4-panel illustrations of everyday situations.
-- This migration:
--   1. Creates `speaking_scenes`
--   2. Migrates existing grammar.image_url rows into speaking_scenes
--      (preserving UUIDs so existing speaking_logs continue to point at the
--      same id, just under a renamed column)
--   3. Renames speaking_logs.grammar_id → speaking_logs.scene_id and points
--      it at the new table
--   4. Drops the now-unused grammar.image_url column

-- 1) speaking_scenes table
CREATE TABLE IF NOT EXISTS nativego.speaking_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text,
  theme text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nativego.speaking_scenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "speaking_scenes_select_auth" ON nativego.speaking_scenes;
CREATE POLICY "speaking_scenes_select_auth" ON nativego.speaking_scenes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "speaking_scenes_insert_auth" ON nativego.speaking_scenes;
CREATE POLICY "speaking_scenes_insert_auth" ON nativego.speaking_scenes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "speaking_scenes_update_auth" ON nativego.speaking_scenes;
CREATE POLICY "speaking_scenes_update_auth" ON nativego.speaking_scenes
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "speaking_scenes_delete_auth" ON nativego.speaking_scenes;
CREATE POLICY "speaking_scenes_delete_auth" ON nativego.speaking_scenes
  FOR DELETE TO authenticated USING (true);

-- 2) Copy existing grammar.image_url rows into speaking_scenes, preserving id
INSERT INTO nativego.speaking_scenes (id, image_url, created_at)
SELECT id, image_url, created_at
FROM nativego.grammar
WHERE image_url IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 3) speaking_logs: add scene_id, backfill from grammar_id, drop grammar_id
ALTER TABLE nativego.speaking_logs
  ADD COLUMN IF NOT EXISTS scene_id uuid REFERENCES nativego.speaking_scenes(id);

UPDATE nativego.speaking_logs
SET scene_id = grammar_id
WHERE scene_id IS NULL
  AND grammar_id IN (SELECT id FROM nativego.speaking_scenes);

ALTER TABLE nativego.speaking_logs DROP COLUMN IF EXISTS grammar_id;

CREATE INDEX IF NOT EXISTS idx_speaking_logs_scene
  ON nativego.speaking_logs(scene_id);

-- 4) Drop grammar.image_url (data now lives in speaking_scenes)
ALTER TABLE nativego.grammar DROP COLUMN IF EXISTS image_url;
