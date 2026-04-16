import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { channelUrl } = await request.json()
  if (!channelUrl) {
    return NextResponse.json({ error: "channelUrl is required" }, { status: 400 })
  }

  // Parse handle from URL (e.g. https://www.youtube.com/@EnglishWithVenya → EnglishWithVenya)
  const handleMatch = (channelUrl as string).match(/@([^/?\s]+)/)
  if (!handleMatch) {
    return NextResponse.json(
      { error: "有効なYouTubeチャンネルURLを入力してください（例: https://www.youtube.com/@ChannelName）" },
      { status: 400 }
    )
  }
  const handle = handleMatch[1]

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API key is not configured" }, { status: 500 })
  }

  // Get channel info: snippet (title) + contentDetails (uploads playlist ID)
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`
  )
  const channelData = await channelRes.json()

  if (!channelData.items || channelData.items.length === 0) {
    return NextResponse.json({ error: "チャンネルが見つかりませんでした" }, { status: 404 })
  }

  const channelItem = channelData.items[0]
  const channelName: string = channelItem.snippet.title
  const playlistId: string = channelItem.contentDetails.relatedPlaylists.uploads

  // Check for duplicate
  const { data: existing } = await supabase
    .from("youtube_channels")
    .select("id")
    .eq("user_id", user.id)
    .ilike("channel_url", `%@${handle}%`)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: "このチャンネルはすでに追加されています" }, { status: 409 })
  }

  // Create channel record
  const { data: newChannel, error: channelError } = await supabase
    .from("youtube_channels")
    .insert({ user_id: user.id, channel_name: channelName, channel_url: channelUrl })
    .select("id")
    .single()

  if (channelError || !newChannel) {
    return NextResponse.json({ error: "チャンネルの保存に失敗しました" }, { status: 500 })
  }

  // Fetch all videos (paginated, 50 per page)
  type VideoRow = {
    channel_id: string
    title: string
    video_url: string
    thumbnail_url: string | null
    published_at: string | null
    sort_order: number
  }

  const videos: VideoRow[] = []
  let pageToken: string | undefined = undefined
  let sortOrder = 0

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems")
    url.searchParams.set("part", "snippet")
    url.searchParams.set("playlistId", playlistId)
    url.searchParams.set("maxResults", "50")
    url.searchParams.set("key", apiKey)
    if (pageToken) url.searchParams.set("pageToken", pageToken)

    const videosRes = await fetch(url.toString())
    const videosData = await videosRes.json()

    for (const item of videosData.items ?? []) {
      const videoId: string | undefined = item.snippet?.resourceId?.videoId
      if (!videoId) continue
      if (item.snippet?.title === "Deleted video" || item.snippet?.title === "Private video") continue

      videos.push({
        channel_id: newChannel.id,
        title: item.snippet.title,
        video_url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail_url: item.snippet.thumbnails?.medium?.url ?? null,
        published_at: item.snippet.publishedAt?.slice(0, 10) ?? null,
        sort_order: sortOrder++,
      })
    }

    pageToken = videosData.nextPageToken
  } while (pageToken)

  // Batch insert videos
  if (videos.length > 0) {
    const { error: videosError } = await supabase.from("youtube_videos").insert(videos)
    if (videosError) {
      await supabase.from("youtube_channels").delete().eq("id", newChannel.id)
      return NextResponse.json({ error: "動画の保存に失敗しました" }, { status: 500 })
    }
  }

  return NextResponse.json({ channelName, videoCount: videos.length })
}
