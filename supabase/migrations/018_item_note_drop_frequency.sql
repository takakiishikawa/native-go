-- 018: メモ列（note）を追加 + 頻度列（frequency）を廃止
-- Run this in the Supabase SQL editor (schema: nativego)
--
--   note      : 理解のための自由メモ（ライブラリで入力/編集/削除。主にベトナム語で利用）
--   frequency : 頻度（★）— 表示をやめたため列ごと削除

-- 1) note 列を追加（任意）
ALTER TABLE nativego.grammar      ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE nativego.expressions  ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE nativego.words        ADD COLUMN IF NOT EXISTS note text;

-- 2) frequency 列を削除
ALTER TABLE nativego.grammar      DROP COLUMN IF EXISTS frequency;
ALTER TABLE nativego.expressions  DROP COLUMN IF EXISTS frequency;
ALTER TABLE nativego.words        DROP COLUMN IF EXISTS frequency;
