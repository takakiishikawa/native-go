-- 009: add category column to words (parallel to grammar.category / expressions.category)
-- Run this in the Supabase SQL editor (schema: nativego)

ALTER TABLE nativego.words
  ADD COLUMN IF NOT EXISTS category text;
