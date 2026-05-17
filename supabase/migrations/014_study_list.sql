-- 014: 「学習したい」リスト + メモ
-- Run this in the Supabase SQL editor (schema: nativego)
--
-- リピーティング画面でフラグを立てた文法/フレーズ/単語を、ライブラリの
-- 「学習したい」リストに表示する。
--   study_flag : 学習したいリストに入れる
--   study_done : リスト上で「完了」にチェック済み
--   study_note : 外部学習のメモ（リピーティング画面でコメントアイコンに表示）

ALTER TABLE nativego.grammar
  ADD COLUMN IF NOT EXISTS study_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS study_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS study_note text;

ALTER TABLE nativego.expressions
  ADD COLUMN IF NOT EXISTS study_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS study_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS study_note text;

ALTER TABLE nativego.words
  ADD COLUMN IF NOT EXISTS study_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS study_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS study_note text;
