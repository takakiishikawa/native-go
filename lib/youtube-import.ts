import type { SupabaseClient } from "@supabase/supabase-js";

// Ryan(EN shadowing)チャンネルの全再生リスト＋未所属動画をまとめて取り込む共通ロジック。
// 手動トリガー(app/api/youtube-import-ryan)と週次cron(app/api/cron/sync-ryan)の
// 両方から呼ばれる。呼び出し側が認証・Supabaseクライアントの選定を担当し、
// ここでは userId を渡してもらうだけにする（session/adminどちらのクライアントでも動くように）。

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

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

function extractHandle(channelUrl: string): string | null {
  const m = channelUrl.match(/@([^/?\s]+)/);
  return m ? m[1] : null;
}

type RawVideo = {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
};

async function fetchPlaylistItems(
  playlistId: string,
  apiKey: string,
): Promise<RawVideo[]> {
  const items: RawVideo[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${YOUTUBE_API_BASE}/playlistItems`);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.error) break;

    for (const item of data.items ?? []) {
      const videoId: string | undefined = item.snippet?.resourceId?.videoId;
      if (!videoId) continue;
      const title: string = item.snippet?.title ?? "";
      if (title === "Deleted video" || title === "Private video") continue;

      items.push({
        videoId,
        title,
        thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? null,
        publishedAt: item.snippet.publishedAt?.slice(0, 10) ?? null,
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

async function fetchAllPlaylists(
  youtubeChannelId: string,
  apiKey: string,
): Promise<{ id: string; title: string; thumbnailUrl: string | null }[]> {
  const playlists: { id: string; title: string; thumbnailUrl: string | null }[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${YOUTUBE_API_BASE}/playlists`);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("channelId", youtubeChannelId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.error) {
      console.error("[youtube-import] playlists.list failed:", data.error);
      break;
    }
    for (const item of data.items ?? []) {
      playlists.push({
        id: item.id,
        title: item.snippet?.title ?? "",
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? null,
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return playlists;
}

async function fetchDurations(
  videoIds: string[],
  apiKey: string,
): Promise<Map<string, string>> {
  const durationMap = new Map<string, string>();
  for (let i = 0; i < videoIds.length; i += 50) {
    const batchIds = videoIds.slice(i, i + 50).join(",");
    if (!batchIds) continue;
    const res = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=contentDetails&id=${batchIds}&key=${apiKey}`,
    );
    const data = await res.json();
    for (const item of data.items ?? []) {
      durationMap.set(item.id, item.contentDetails?.duration ?? "");
    }
  }
  return durationMap;
}

export type ImportRyanResult = {
  channelName: string;
  playlistCount: number;
  videoCount: number;
  skipped: number;
};

export async function importRyanChannel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  opts: { language?: "en" | "vi"; channelUrl?: string } = {},
): Promise<{ error?: string; result?: ImportRyanResult }> {
  const lang = opts.language === "vi" ? "vi" : "en";
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { error: "YouTube API key is not configured" };

  const { data: existingChannel } = await supabase
    .from("youtube_channels")
    .select("id, channel_url")
    .eq("user_id", userId)
    .eq("language", lang)
    .eq("archived", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sourceUrl = existingChannel?.channel_url ?? opts.channelUrl;
  const handle = sourceUrl ? extractHandle(sourceUrl) : null;
  if (!handle) {
    return {
      error: existingChannel
        ? "チャンネルのハンドルが特定できませんでした"
        : "チャンネルが未登録です。初回はYouTubeチャンネルURLを指定してください",
    };
  }

  const channelRes = await fetch(
    `${YOUTUBE_API_BASE}/channels?part=snippet,contentDetails&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`,
  );
  const channelData = await channelRes.json();
  const channelItem = channelData.items?.[0];
  if (!channelItem) return { error: "チャンネルが見つかりませんでした" };

  const channelName: string = channelItem.snippet.title;
  const youtubeChannelId: string = channelItem.id;
  const uploadsPlaylistId: string =
    channelItem.contentDetails.relatedPlaylists.uploads;

  let channelRowId: string;
  if (existingChannel) {
    channelRowId = existingChannel.id;
    await supabase
      .from("youtube_channels")
      .update({ channel_name: channelName })
      .eq("id", channelRowId);
  } else {
    const { data: created, error: createErr } = await supabase
      .from("youtube_channels")
      .insert({
        user_id: userId,
        channel_name: channelName,
        channel_url: opts.channelUrl,
        language: lang,
      })
      .select("id")
      .single();
    if (createErr || !created) return { error: "チャンネルの保存に失敗しました" };
    channelRowId = created.id;
  }

  // 全再生リスト＋各リストの動画、アップロード全体（＝未所属も含む全動画）を取得
  const playlists = await fetchAllPlaylists(youtubeChannelId, apiKey);
  const playlistVideoMap = new Map<string, RawVideo[]>();
  for (const p of playlists) {
    playlistVideoMap.set(p.id, await fetchPlaylistItems(p.id, apiKey));
  }
  const uploadsVideos = await fetchPlaylistItems(uploadsPlaylistId, apiKey);

  // 再生リストを保存し、YouTube上のplaylistId → 行ID の対応を作る
  const playlistRowIdMap = new Map<string, string>();
  for (const p of playlists) {
    const { data: upserted, error: upsertErr } = await supabase
      .from("youtube_playlists")
      .upsert(
        {
          user_id: userId,
          channel_id: channelRowId,
          youtube_playlist_id: p.id,
          title: p.title,
          thumbnail_url: p.thumbnailUrl,
        },
        { onConflict: "channel_id,youtube_playlist_id" },
      )
      .select("id")
      .single();
    if (upsertErr) {
      console.error("[youtube-import] playlist upsert failed:", p.id, upsertErr);
      continue;
    }
    if (upserted) playlistRowIdMap.set(p.id, upserted.id);
  }

  // 動画ごとに「最初に見つかった所属プレイリスト」を割り当てる（無ければ未所属=null）
  const videoPlaylistRowId = new Map<string, string | null>();
  for (const [ytPlaylistId, items] of playlistVideoMap) {
    const rowId = playlistRowIdMap.get(ytPlaylistId) ?? null;
    for (const item of items) {
      if (!videoPlaylistRowId.has(item.videoId)) {
        videoPlaylistRowId.set(item.videoId, rowId);
      }
    }
  }

  const allVideosById = new Map<string, RawVideo>();
  for (const v of uploadsVideos) allVideosById.set(v.videoId, v);

  const durationMap = await fetchDurations([...allVideosById.keys()], apiKey);

  const { data: existingVideos } = await supabase
    .from("youtube_videos")
    .select("id, video_url, playlist_id")
    .eq("channel_id", channelRowId);
  const existingByUrl = new Map(
    (existingVideos ?? []).map((v) => [v.video_url as string, v]),
  );

  const { data: sortMax } = await supabase
    .from("youtube_videos")
    .select("sort_order")
    .eq("channel_id", channelRowId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  let sortOrder = (sortMax?.sort_order ?? -1) + 1;

  let inserted = 0;
  let skipped = 0;
  const toInsert: Record<string, unknown>[] = [];

  for (const [videoId, meta] of allVideosById) {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const isoDuration = durationMap.get(videoId) ?? "";
    const sec = parseDurationSec(isoDuration);
    // Shorts (3分未満) は除外。既存の youtube-fetch と同じ基準
    if (sec > 0 && sec < 180) {
      skipped++;
      continue;
    }

    const newPlaylistId = videoPlaylistRowId.get(videoId) ?? null;
    const existingRow = existingByUrl.get(videoUrl);
    if (existingRow) {
      if (existingRow.playlist_id !== newPlaylistId) {
        await supabase
          .from("youtube_videos")
          .update({ playlist_id: newPlaylistId })
          .eq("id", existingRow.id);
      }
      continue;
    }

    toInsert.push({
      channel_id: channelRowId,
      playlist_id: newPlaylistId,
      title: meta.title,
      video_url: videoUrl,
      thumbnail_url: meta.thumbnailUrl,
      published_at: meta.publishedAt,
      duration: isoDuration ? formatDuration(isoDuration) : null,
      sort_order: sortOrder++,
      language: lang,
    });
    inserted++;
  }

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase
      .from("youtube_videos")
      .insert(toInsert);
    if (insertErr) return { error: "動画の保存に失敗しました" };
  }

  return {
    result: {
      channelName,
      playlistCount: playlists.length,
      videoCount: inserted,
      skipped,
    },
  };
}
