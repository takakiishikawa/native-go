-- 013: per-line Japanese translations + grammar pattern highlight
-- Run this in the Supabase SQL editor (schema: nativego)
--
-- For the redesigned repeating screen:
--   *_ja        : jsonb array of per-line Japanese translations, parallel to
--                 the existing line column (examples / conversation / example).
--                 Toggled on/off by the 日本語 button.
--   pattern_quote: the exact substring of the dialogue that demonstrates the
--                  grammar pattern, so it can be highlighted. Grammar only.
-- All nullable; existing rows stay null until regenerated.

ALTER TABLE nativego.grammar
  ADD COLUMN IF NOT EXISTS examples_ja jsonb,
  ADD COLUMN IF NOT EXISTS pattern_quote text;

ALTER TABLE nativego.expressions
  ADD COLUMN IF NOT EXISTS conversation_ja jsonb;

ALTER TABLE nativego.words
  ADD COLUMN IF NOT EXISTS example_ja jsonb;
