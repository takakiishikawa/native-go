import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

// ISO 8601 duration → seconds (e.g. "PT1M30S" → 90)
function parseDurationSec(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (
    parseInt(m[1] ?? "0") * 3600 +
    parseInt(m[2] ?? "0") * 60 +
    parseInt(m[3] ?? "0")
  );
}

// ISO 8601 duration → display string (e.g. "1:30", "12:05")
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

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { channelUrl, sinceYear } = body as {
    channelUrl: string;
    sinceYear?: number;
  };
  if (!channelUrl) {
    return NextResponse.json(
      { error: "channelUrl is required" },
      { status: 400 },
    );
  }

  const handleMatch = (channelUrl as string).match(/@([^/?\s]+)/);
  if (!handleMatch) {
    return NextResponse.json(
      {
        error:
          "有効なYouTubeチャンネルURLを入力してください（例: https://www.youtube.com/@ChannelName）",
      },
      { status: 400 },
    );
  }
  const handle = handleMatch[1];

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YouTube API key is not configured" },
      { status: 500 },
    );
  }

  // Step 1: Get channel info
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`,
  );
  const channelData = await channelRes.json();

  if (!channelData.items || channelData.items.length === 0) {
    return NextResponse.json(
      { error: "チャンネルが見つかりませんでした" },
      { status: 404 },
    );
  }

  const channelItem = channelData.items[0];
  const channelName: string = channelItem.snippet.title;
  const playlistId: string =
    channelItem.contentDetails.relatedPlaylists.uploads;

  // Duplicate check
  const { data: existing } = await supabase
    .from("youtube_channels")
    .select("id")
    .eq("user_id", user.id)
    .ilike("channel_url", `%@${handle}%`)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "このチャンネルはすでに追加されています" },
      { status: 409 },
    );
  }

  // Step 2: Fetch all playlist items (paginated)
  type RawVideo = {
    videoId: string;
    title: string;
    thumbnailUrl: string | null;
    publishedAt: string | null;
  };
  const rawVideos: RawVideo[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    const data = await res.json();

    for (const item of data.items ?? []) {
      const videoId: string | undefined = item.snippet?.resourceId?.videoId;
      if (!videoId) continue;
      const title: string = item.snippet?.title ?? "";
      if (title === "Deleted video" || title === "Private video") continue;

      rawVideos.push({
        videoId,
        title,
        thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? null,
        publishedAt: item.snippet.publishedAt?.slice(0, 10) ?? null,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  // Step 3: Batch-fetch video durations (50 per request) to filter out Shorts (≤60s)
  const durationMap = new Map<string, string>(); // videoId → ISO duration

  for (let i = 0; i < rawVideos.length; i += 50) {
    const batchIds = rawVideos
      .slice(i, i + 50)
      .map((v) => v.videoId)
      .join(",");
    const detailRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batchIds}&key=${apiKey}`,
    );
    const detailData = await detailRes.json();
    for (const item of detailData.items ?? []) {
      durationMap.set(item.id, item.contentDetails?.duration ?? "");
    }
  }

  // Step 3.5: Filter by sinceYear if provided
  if (sinceYear && sinceYear > 1990) {
    const cutoff = String(sinceYear);
    rawVideos.splice(
      0,
      rawVideos.length,
      ...rawVideos.filter((v) => {
        if (!v.publishedAt) return true;
        return v.publishedAt.slice(0, 4) >= cutoff;
      }),
    );
  }

  // Step 4: Filter shorts and build final rows
  type VideoRow = {
    channel_id: string;
    title: string;
    video_url: string;
    thumbnail_url: string | null;
    published_at: string | null;
    duration: string | null;
    sort_order: number;
  };

  // Create channel record first
  const { data: newChannel, error: channelError } = await supabase
    .from("youtube_channels")
    .insert({
      user_id: user.id,
      channel_name: channelName,
      channel_url: channelUrl,
    })
    .select("id")
    .single();

  if (channelError || !newChannel) {
    return NextResponse.json(
      { error: "チャンネルの保存に失敗しました" },
      { status: 500 },
    );
  }

  const videos: VideoRow[] = [];
  let sortOrder = 0;

  for (const v of rawVideos) {
    const isoDuration = durationMap.get(v.videoId) ?? "";
    const sec = parseDurationSec(isoDuration);
    // Skip short videos: <3 minutes (180 seconds)
    if (sec > 0 && sec < 180) continue;

    videos.push({
      channel_id: newChannel.id,
      title: v.title,
      video_url: `https://www.youtube.com/watch?v=${v.videoId}`,
      thumbnail_url: v.thumbnailUrl,
      published_at: v.publishedAt,
      duration: isoDuration ? formatDuration(isoDuration) : null,
      sort_order: sortOrder++,
    });
  }

  // Batch insert videos
  if (videos.length > 0) {
    const { error: videosError } = await supabase
      .from("youtube_videos")
      .insert(videos);
    if (videosError) {
      await supabase.from("youtube_channels").delete().eq("id", newChannel.id);
      return NextResponse.json(
        { error: "動画の保存に失敗しました" },
        { status: 500 },
      );
    }
  }

  const skipped = rawVideos.length - videos.length;
  return NextResponse.json({
    channelName,
    videoCount: videos.length,
    shortsSkipped: skipped,
  });
}
