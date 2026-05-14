import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const STANDALONE_CHANNEL_URL = "nativego:standalone-videos";
const STANDALONE_CHANNEL_NAME = "個別動画";

function parseDurationSec(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (
    parseInt(m[1] ?? "0") * 3600 +
    parseInt(m[2] ?? "0") * 60 +
    parseInt(m[3] ?? "0")
  );
}

function formatDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = parseInt(m[1] ?? "0");
  const min = parseInt(m[2] ?? "0");
  const sec = parseInt(m[3] ?? "0");
  if (h > 0)
    return `${h}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

// 各種YouTube URL から videoId を抽出する
function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  // youtu.be/<id>
  const short = trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (short) return short[1];
  // youtube.com/shorts/<id>
  const shorts = trimmed.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
  if (shorts) return shorts[1];
  // youtube.com/embed/<id>
  const embed = trimmed.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
  if (embed) return embed[1];
  // youtube.com/watch?v=<id> (also m.youtube.com)
  const watchMatch = trimmed.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  // 生のIDだけ渡された場合
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { videoUrl, language } = body as {
    videoUrl?: string;
    language?: "en" | "vi";
  };
  if (!videoUrl?.trim()) {
    return NextResponse.json(
      { error: "videoUrl is required" },
      { status: 400 },
    );
  }
  const lang: "en" | "vi" = language === "vi" ? "vi" : "en";

  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    return NextResponse.json(
      {
        error:
          "有効なYouTube動画URLを入力してください（例: https://www.youtube.com/watch?v=...）",
      },
      { status: 400 },
    );
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YouTube API key is not configured" },
      { status: 500 },
    );
  }

  // 同一URLの動画が既に登録済みかチェック（チャンネル所属/個別の両方を見る）
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const { data: existingVideo } = await supabase
    .from("youtube_videos")
    .select("id, channel_id")
    .eq("language", lang)
    .eq("video_url", canonicalUrl)
    .maybeSingle();

  if (existingVideo) {
    return NextResponse.json(
      { error: "この動画はすでに登録されています" },
      { status: 409 },
    );
  }

  // YouTube API で動画情報取得
  const detailRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`,
  );
  const detailData = await detailRes.json();
  const item = detailData.items?.[0];
  if (!item) {
    return NextResponse.json(
      { error: "動画が見つかりませんでした" },
      { status: 404 },
    );
  }

  const title: string = item.snippet?.title ?? "";
  const thumbnailUrl: string | null =
    item.snippet?.thumbnails?.medium?.url ??
    item.snippet?.thumbnails?.default?.url ??
    null;
  const publishedAt: string | null = item.snippet?.publishedAt
    ? item.snippet.publishedAt.slice(0, 10)
    : null;
  const isoDuration: string = item.contentDetails?.duration ?? "";
  const durationSec = parseDurationSec(isoDuration);
  const duration = isoDuration ? formatDuration(isoDuration) : null;

  // 個別動画チャンネル（センチネル）を取得 or 作成
  const { data: existingChannel } = await supabase
    .from("youtube_channels")
    .select("id")
    .eq("user_id", user.id)
    .eq("language", lang)
    .eq("channel_url", STANDALONE_CHANNEL_URL)
    .maybeSingle();

  let standaloneChannelId = existingChannel?.id ?? null;
  if (!standaloneChannelId) {
    const { data: newChannel, error: chErr } = await supabase
      .from("youtube_channels")
      .insert({
        user_id: user.id,
        channel_name: STANDALONE_CHANNEL_NAME,
        channel_url: STANDALONE_CHANNEL_URL,
        language: lang,
      })
      .select("id")
      .single();
    if (chErr || !newChannel) {
      return NextResponse.json(
        { error: "個別動画チャンネルの作成に失敗しました" },
        { status: 500 },
      );
    }
    standaloneChannelId = newChannel.id;
  }

  // sort_order: 既存の個別動画の末尾に追加
  const { data: existingSorts } = await supabase
    .from("youtube_videos")
    .select("sort_order")
    .eq("channel_id", standaloneChannelId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSort = (existingSorts?.[0]?.sort_order ?? -1) + 1;

  const { error: insertError } = await supabase.from("youtube_videos").insert({
    channel_id: standaloneChannelId,
    title,
    video_url: canonicalUrl,
    thumbnail_url: thumbnailUrl,
    published_at: publishedAt,
    duration,
    sort_order: nextSort,
    language: lang,
  });

  if (insertError) {
    return NextResponse.json(
      { error: "動画の保存に失敗しました" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    title,
    duration,
    durationSec,
  });
}
