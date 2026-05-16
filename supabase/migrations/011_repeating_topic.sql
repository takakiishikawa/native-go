-- 011: conversation topic for the repeating screen
-- Run this in the Supabase SQL editor (schema: nativego)
--
-- Each item's example dialogue gets an AI-picked conversation topic so the
-- repeating screen can show a chip ("Cooking" + icon) near the conversation.
--   topic_label : short English label (例: "Cooking", "Product work", "Dating")
--   topic_icon  : lucide-react icon name from a fixed set
-- Both nullable; existing rows stay null until regenerated.

ALTER TABLE nativego.grammar
  ADD COLUMN IF NOT EXISTS topic_label text,
  ADD COLUMN IF NOT EXISTS topic_icon text;

ALTER TABLE nativego.expressions
  ADD COLUMN IF NOT EXISTS topic_label text,
  ADD COLUMN IF NOT EXISTS topic_icon text;

ALTER TABLE nativego.words
  ADD COLUMN IF NOT EXISTS topic_label text,
  ADD COLUMN IF NOT EXISTS topic_icon text;
