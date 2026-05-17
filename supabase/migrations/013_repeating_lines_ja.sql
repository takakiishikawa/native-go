-- 013: grammar pattern highlight
-- Run this in the Supabase SQL editor (schema: nativego)
--
-- pattern_quote: the exact substring of the dialogue that demonstrates the
-- grammar pattern, so the repeating screen can highlight it. Grammar only.
-- Nullable; existing rows stay null until regenerated.
--
-- (Per-line Japanese translations are fetched on demand via the translation
-- API — no column needed.)

ALTER TABLE nativego.grammar
  ADD COLUMN IF NOT EXISTS pattern_quote text;
