"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"
import { Plus, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { YoutubeChannel, YoutubeVideo } from "@/lib/types"

type VideoWithLap = YoutubeVideo & { lapCount: number }

export default function ShadowingPage() {
  const supabase = createClient()

  const [channels, setChannels] = useState<YoutubeChannel[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [videosByChannel, setVideosByChannel] = useState<Record<string, VideoWithLap[]>>({})
  const [loading, setLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [channelUrl, setChannelUrl] = useState("")
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [channelsResult, videosResult, logsResult] = await Promise.all([
      supabase.from("youtube_channels").select("*").order("created_at"),
      supabase.from("youtube_videos").select("*").order("sort_order"),
      supabase.from("youtube_logs").select("video_id"),
    ])

    const chList = channelsResult.data ?? []
    const videos = videosResult.data ?? []
    const logs = logsResult.data ?? []

    const lapCounts = new Map<string, number>()
    for (const log of logs) {
      lapCounts.set(log.video_id, (lapCounts.get(log.video_id) ?? 0) + 1)
    }

    const byChannel: Record<string, VideoWithLap[]> = {}
    for (const v of videos) {
      if (!byChannel[v.channel_id]) byChannel[v.channel_id] = []
      byChannel[v.channel_id].push({ ...v, lapCount: lapCounts.get(v.id) ?? 0 })
    }

    setChannels(chList)
    setVideosByChannel(byChannel)
    setSelectedChannelId((prev) => prev ?? (chList[0]?.id ?? null))
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  const handleMarkDone = async (videoId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { count } = await supabase
      .from("youtube_logs")
      .select("*", { count: "exact", head: true })
      .eq("video_id", videoId)

    const nextLap = (count ?? 0) + 1

    const { error } = await supabase.from("youtube_logs").insert({
      user_id: user.id,
      video_id: videoId,
      lap: nextLap,
    })

    if (error) {
      toast.error("記録に失敗しました")
      return
    }

    toast.success(`${nextLap}周目を完了しました`)

    setVideosByChannel((prev) => {
      const updated: Record<string, VideoWithLap[]> = {}
      for (const cId in prev) {
        updated[cId] = prev[cId].map((v) =>
          v.id === videoId ? { ...v, lapCount: v.lapCount + 1 } : v
        )
      }
      return updated
    })
  }

  const handleFetchChannel = async () => {
    if (!channelUrl.trim()) return
    setFetching(true)
    setFetchError("")

    try {
      const res = await fetch("/api/youtube-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl: channelUrl.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setFetchError(data.error ?? "取得に失敗しました")
        return
      }

      toast.success(`「${data.channelName}」の動画${data.videoCount}本を保存しました`)
      setShowAddModal(false)
      setChannelUrl("")
      await loadData()
    } catch {
      setFetchError("ネットワークエラーが発生しました")
    } finally {
      setFetching(false)
    }
  }

  const selectedVideos = selectedChannelId ? (videosByChannel[selectedChannelId] ?? []) : []
  const totalVideos = selectedVideos.length
  const completedVideos = selectedVideos.filter((v) => v.lapCount > 0).length
  const maxLap = selectedVideos.length > 0 ? Math.max(...selectedVideos.map((v) => v.lapCount)) : 0

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">シャドーイング</h1>
          <p className="text-muted-foreground mt-1">YouTubeでシャドーイング練習を管理する</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          チャンネルを追加
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">読み込み中...</div>
      ) : channels.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="font-medium">チャンネルが登録されていません</p>
          <p className="text-sm mt-1">「チャンネルを追加」からYouTubeチャンネルを登録してください</p>
        </div>
      ) : (
        <>
          {/* Channel tabs */}
          <div className="flex gap-2 flex-wrap">
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setSelectedChannelId(ch.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                  selectedChannelId === ch.id
                    ? "bg-violet-600 text-white"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
              >
                {ch.channel_name}
              </button>
            ))}
          </div>

          {/* Progress summary */}
          {totalVideos > 0 && (
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>
                全{totalVideos}本中{" "}
                <strong className="text-foreground">{completedVideos}本</strong>完了
              </span>
              {maxLap > 0 && (
                <span>
                  現在<strong className="text-foreground">{maxLap}周目</strong>
                </span>
              )}
              <div className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 max-w-48">
                <div
                  className="bg-violet-600 h-1.5 rounded-full transition-all"
                  style={{ width: totalVideos > 0 ? `${(completedVideos / totalVideos) * 100}%` : "0%" }}
                />
              </div>
            </div>
          )}

          {/* Video grid */}
          {selectedVideos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">動画がありません</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedVideos.map((video) => (
                <VideoCard key={video.id} video={video} onMarkDone={handleMarkDone} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add channel modal */}
      <Dialog
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setChannelUrl("")
          setFetchError("")
        }}
        title="チャンネルを追加"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">チャンネルURL</label>
            <Input
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder="https://www.youtube.com/@ChannelName"
              onKeyDown={(e) => { if (e.key === "Enter") handleFetchChannel() }}
            />
            <p className="text-xs text-muted-foreground">例: https://www.youtube.com/@EnglishWithVenya</p>
          </div>
          {fetchError && <p className="text-sm text-destructive">{fetchError}</p>}
          <Button
            onClick={handleFetchChannel}
            disabled={fetching || !channelUrl.trim()}
            className="w-full"
          >
            {fetching ? "取得中..." : "動画を取得する"}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

function StatusBadge({ lapCount }: { lapCount: number }) {
  if (lapCount === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        未着手
      </span>
    )
  }
  if (lapCount === 1) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/20 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
        1周完了
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-900/20 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-400">
      {lapCount}周完了
    </span>
  )
}

function VideoCard({
  video,
  onMarkDone,
}: {
  video: VideoWithLap
  onMarkDone: (id: string) => Promise<void>
}) {
  const [marking, setMarking] = useState(false)

  const handleClick = async () => {
    setMarking(true)
    await onMarkDone(video.id)
    setMarking(false)
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm flex flex-col">
      {video.thumbnail_url ? (
        <div className="aspect-video bg-neutral-100 dark:bg-neutral-800">
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">No thumbnail</span>
        </div>
      )}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-sm font-medium line-clamp-2 leading-snug">{video.title}</p>
        <div className="flex items-center justify-between">
          <StatusBadge lapCount={video.lapCount} />
          {video.duration && (
            <span className="text-xs text-muted-foreground">{video.duration}</span>
          )}
        </div>
        <div className="flex gap-2 mt-auto pt-1">
          <a
            href={video.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            YouTube
          </a>
          <button
            onClick={handleClick}
            disabled={marking}
            className="flex-1 rounded-md bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {marking ? "記録中..." : "完了にする"}
          </button>
        </div>
      </div>
    </div>
  )
}
