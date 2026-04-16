"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"
import { Plus, ExternalLink, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { YoutubeChannel, YoutubeVideo } from "@/lib/types"

type VideoWithLap = YoutubeVideo & { lapCount: number }
type Filter = "all" | "todo" | "done"

export default function ShadowingPage() {
  const supabase = createClient()

  const [channels, setChannels] = useState<YoutubeChannel[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [videosByChannel, setVideosByChannel] = useState<Record<string, VideoWithLap[]>>({})
  const [filter, setFilter] = useState<Filter>("all")
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

  const handleMarkDone = async (videoId: string): Promise<void> => {
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

      const msg = data.shortsSkipped > 0
        ? `「${data.channelName}」の動画${data.videoCount}本を保存しました（ショート${data.shortsSkipped}本を除外）`
        : `「${data.channelName}」の動画${data.videoCount}本を保存しました`
      toast.success(msg)
      setShowAddModal(false)
      setChannelUrl("")
      await loadData()
    } catch {
      setFetchError("ネットワークエラーが発生しました")
    } finally {
      setFetching(false)
    }
  }

  const allVideos = selectedChannelId ? (videosByChannel[selectedChannelId] ?? []) : []
  const todoCnt = allVideos.filter((v) => v.lapCount === 0).length
  const doneCnt = allVideos.filter((v) => v.lapCount > 0).length

  const filteredVideos = allVideos.filter((v) => {
    if (filter === "todo") return v.lapCount === 0
    if (filter === "done") return v.lapCount > 0
    return true
  })

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-medium">シャドーイング</h1>
          <p className="text-sm text-muted-foreground mt-1">YouTubeでシャドーイング練習を管理する</p>
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
                    ? "bg-primary text-primary-foreground"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
              >
                {ch.channel_name}
              </button>
            ))}
          </div>

          {/* Progress bar + stats */}
          {allVideos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  全{allVideos.length}本中{" "}
                  <strong className="text-foreground">{doneCnt}本</strong>完了
                </span>
                <span className="text-muted-foreground text-xs">
                  {Math.round((doneCnt / allVideos.length) * 100)}%
                </span>
              </div>
              <div className="bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(doneCnt / allVideos.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-1 border-b">
            {(
              [
                { key: "all", label: `すべて (${allVideos.length})` },
                { key: "todo", label: `未着手 (${todoCnt})` },
                { key: "done", label: `完了済み (${doneCnt})` },
              ] as { key: Filter; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                  filter === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Video grid */}
          {filteredVideos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {filter === "todo" ? "未着手の動画はありません" : filter === "done" ? "完了済みの動画はありません" : "動画がありません"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video) => (
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
            <p className="text-xs text-muted-foreground">
              例: https://www.youtube.com/@EnglishWithVenya<br />
              ※ 3分未満の動画は自動的に除外されます
            </p>
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

function VideoCard({
  video,
  onMarkDone,
}: {
  video: VideoWithLap
  onMarkDone: (id: string) => Promise<void>
}) {
  const [marking, setMarking] = useState(false)
  const isCompleted = video.lapCount > 0

  const handleComplete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMarking(true)
    await onMarkDone(video.id)
    setMarking(false)
  }

  return (
    <a
      href={video.video_url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group rounded-xl border border-[var(--border-subtle,rgba(0,0,0,0.08))] bg-card overflow-hidden shadow-sm flex flex-col transition-all cursor-pointer",
        "hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-neutral-100 dark:bg-neutral-800 relative overflow-hidden">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ExternalLink className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
          <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow" />
        </div>
        {/* Lap badge */}
        {isCompleted && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-[var(--bg-elevated,#F0F0EF)] px-2 py-0.5 text-[var(--text-secondary,#6B6B68)] text-xs font-medium shadow-sm">
            <CheckCircle className="h-3 w-3" />
            {video.lapCount}周完了
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Title + duration */}
        <div className="flex-1">
          <p className="text-sm font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {video.title}
          </p>
          {video.duration && (
            <p className="text-xs text-muted-foreground mt-1">{video.duration}</p>
          )}
        </div>

        {/* Complete button */}
        <div>
          {isCompleted ? (
            <button
              onClick={handleComplete}
              disabled={marking}
              className="rounded-md border border-[var(--border-default,rgba(0,0,0,0.12))] bg-transparent hover:bg-muted px-3 py-1 text-xs font-medium text-[var(--text-secondary,#6B6B68)] transition-colors disabled:opacity-50"
            >
              {marking ? "記録中..." : `＋1周 (→${video.lapCount + 1}周目)`}
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={marking}
              className="rounded-md border border-[var(--border-default,rgba(0,0,0,0.12))] bg-transparent hover:bg-muted px-3 py-1 text-xs font-medium text-[var(--text-secondary,#6B6B68)] transition-colors disabled:opacity-50"
            >
              {marking ? "記録中..." : "完了にする"}
            </button>
          )}
        </div>
      </div>
    </a>
  )
}
