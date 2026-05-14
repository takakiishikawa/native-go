-- 010: rename "個別動画" sentinel channel to "お気に入り"
-- 既存ユーザーが追加済みの個別動画チャンネルの表示名を更新する
-- channel_url のセンチネルは変えない（コード側の identifier として使用継続）

UPDATE nativego.youtube_channels
SET channel_name = 'お気に入り'
WHERE channel_url = 'nativego:standalone-videos';
