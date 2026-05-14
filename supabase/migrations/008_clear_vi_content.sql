-- 008: clear all Vietnamese-tagged content for a fresh start
-- Background: 既存 VI データは Claude との対話で生成したもの。今後は Preply の
-- 実レッスン由来データだけで運用するため、いったん白紙に戻す。
-- 保持: practice_logs (全件) / lessons / youtube_* / speaking_* / EN 側全データ
-- 注: スピーキング機能は VI 非対応なので speaking_logs/scenes は触らない

BEGIN;

DELETE FROM nativego.expressions WHERE language = 'vi';
DELETE FROM nativego.grammar     WHERE language = 'vi';

COMMIT;
