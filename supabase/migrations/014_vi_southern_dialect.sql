-- 014: VI 学習データを南部方言に統一
-- 背景: 教材は南部の先生由来で地の語彙は南部ベース（thịt heo / trái cây /
--       mắc / ký 等）だが、肯定の返事に北部の "Vâng" が 11 行混在していた。
--       南部の "Dạ" に統一する。
-- 対象列: expressions.conversation / grammar.examples / words.example （いずれも text）
-- 注: 語彙 "đắt"(id 651d388a) はホーチミンでも使うため変更しない。
-- Run this in the Supabase SQL editor (schema: nativego)

BEGIN;

UPDATE nativego.expressions
  SET conversation = replace(replace(conversation, 'Vâng', 'Dạ'), 'vâng', 'dạ')
  WHERE language = 'vi'
    AND (conversation LIKE '%Vâng%' OR conversation LIKE '%vâng%');

UPDATE nativego.grammar
  SET examples = replace(replace(examples, 'Vâng', 'Dạ'), 'vâng', 'dạ')
  WHERE language = 'vi'
    AND (examples LIKE '%Vâng%' OR examples LIKE '%vâng%');

UPDATE nativego.words
  SET example = replace(replace(example, 'Vâng', 'Dạ'), 'vâng', 'dạ')
  WHERE language = 'vi'
    AND (example LIKE '%Vâng%' OR example LIKE '%vâng%');

COMMIT;
