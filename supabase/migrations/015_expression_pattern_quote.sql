-- 015: expressions のパターンハイライト用 pattern_quote
-- Run this in the Supabase SQL editor (schema: nativego)
--
-- フレーズが会話内のどこに現れるかを AI で判定し、その実テキストを保存する。
-- （grammar.pattern_quote は migration 013 で追加済み）

ALTER TABLE nativego.expressions
  ADD COLUMN IF NOT EXISTS pattern_quote text;
