"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Button,
  Input,
  PageHeader,
  FormActions,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  Badge,
} from "@takaki/go-design-system";
import {
  Plus,
  ExternalLink,
  CheckCircle,
  Archive,
  ArchiveRestore,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { YoutubeChannel, YoutubeVideo } from "@/lib/types";

type VideoWithLap = YoutubeVideo & { lapCount: number };
type Filter = "todo" | "done";

export default function ShadowingPage() {
  const supabase = createClient();

  const [channels, setChannels] = useState<YoutubeChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null,
  );
  const [videosByChannel, setVideosByChannel] = useState<
    Record<string, VideoWithLap[]>
  >({});
  const [filter, setFilter] = useState<Filter>("todo");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [channelUrl, setChannelUrl] = useState("");
  const [sinceYear, setSinceYear] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [channelsResult, videosResult, logsResult] = await Promise.all([
      supabase.from("youtube_channels").select("*").order("created_at"),
      supabase.from("youtube_videos").select("*").order("sort_order"),
      supabase.from("youtube_logs").select("video_id"),
    ]);

    const chList = channelsResult.data ?? [];
    const videos = videosResult.data ?? [];
    const logs = logsResult.data ?? [];

    const lapCounts = new Map<string, number>();
    for (const log of logs) {
      lapCounts.set(log.video_id, (lapCounts.get(log.video_id) ?? 0) + 1);
    }

    const byChannel: Record<string, VideoWithLap[]> = {};
    for (const v of videos) {
      if (!byChannel[v.channel_id]) byChannel[v.channel_id] = [];
      byChannel[v.channel_id].push({
        ...v,
        lapCount: lapCounts.get(v.id) ?? 0,
      });
    }

    setChannels(chList);
    setVideosByChannel(byChannel);
    setSelectedChannelId((prev) => {
      if (prev) return prev;
      const active = chList.find((c) => !c.archived);
      return active?.id ?? null;
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkDone = async (videoId: string): Promise<void> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { count } = await supabase
      .from("youtube_logs")
      .select("*", { count: "exact", head: true })
      .eq("video_id", videoId);

    const nextLap = (count ?? 0) + 1;

    const { error } = await supabase.from("youtube_logs").insert({
      user_id: user.id,
      video_id: videoId,
      lap: nextLap,
    });

    if (error) {
      toast.error("記録に失敗しました");
      return;
    }

    toast.success(`${nextLap}周目を完了しました`);

    setVideosByChannel((prev) => {
      const updated: Record<string, VideoWithLap[]> = {};
      for (const cId in prev) {
        updated[cId] = prev[cId].map((v) =>
          v.id === videoId ? { ...v, lapCount: v.lapCount + 1 } : v,
        );
      }
      return updated;
    });
  };

  const handleDeleteVideo = async (videoId: string): Promise<void> => {
    await supabase.from("youtube_logs").delete().eq("video_id", videoId);
    const { error } = await supabase
      .from("youtube_videos")
      .delete()
      .eq("id", videoId);

    if (error) {
      toast.error("削除に失敗しました");
      return;
    }

    toast.success("動画を削除しました");
    setVideosByChannel((prev) => {
      const updated: Record<string, VideoWithLap[]> = {};
      for (const cId in prev) {
        updated[cId] = prev[cId].filter((v) => v.id !== videoId);
      }
      return updated;
    });
  };

  const handleArchiveChannel = async (channelId: string, archive: boolean) => {
    const { error } = await supabase
      .from("youtube_channels")
      .update({ archived: archive })
      .eq("id", channelId);

    if (error) {
      toast.error("操作に失敗しました");
      return;
    }

    toast.success(archive ? "アーカイブしました" : "アーカイブを解除しました");
    setChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, archived: archive } : c)),
    );
    if (archive && selectedChannelId === channelId) {
      const next = channels.find((c) => !c.archived && c.id !== channelId);
      setSelectedChannelId(next?.id ?? null);
    }
  };

  const handleFetchChannel = async () => {
    if (!channelUrl.trim()) return;
    setFetching(true);
    setFetchError("");

    try {
      const body: Record<string, string | number> = {
        channelUrl: channelUrl.trim(),
      };
      const yr = parseInt(sinceYear);
      if (!isNaN(yr) && yr > 1990) body.sinceYear = yr;

      const res = await fetch("/api/youtube-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setFetchError(data.error ?? "取得に失敗しました");
        return;
      }

      const msg =
        data.shortsSkipped > 0
          ? `「${data.channelName}」の動画${data.videoCount}本を保存しました（ショート${data.shortsSkipped}本を除外）`
          : `「${data.channelName}」の動画${data.videoCount}本を保存しました`;
      toast.success(msg);
      setShowAddModal(false);
      setChannelUrl("");
      setSinceYear("");
      await loadData();
    } catch {
      setFetchError("ネットワークエラーが発生しました");
    } finally {
      setFetching(false);
    }
  };

  const activeChannels = channels.filter((c) => !c.archived);
  const archivedChannels = channels.filter((c) => c.archived);

  const allVideos = selectedChannelId
    ? (videosByChannel[selectedChannelId] ?? [])
    : [];
  const todoCnt = allVideos.filter((v) => v.lapCount === 0).length;
  const doneCnt = allVideos.filter((v) => v.lapCount > 0).length;
  const pct =
    allVideos.length > 0 ? Math.round((doneCnt / allVideos.length) * 100) : 0;

  const filteredVideos = allVideos.filter((v) =>
    filter === "todo" ? v.lapCount === 0 : v.lapCount > 0,
  );

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="シャドーイング"
        description="YouTubeでシャドーイング練習を管理する"
        actions={
          <div className="flex items-center gap-2">
            {archivedChannels.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowArchiveModal(true)}
              >
                <Archive className="h-4 w-4 mr-1.5" />
                アーカイブ済み
              </Button>
            )}
            <Button onClick={() => setShowAddModal(true)} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              チャンネルを追加
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="text-muted-foreground text-sm">読み込み中...</div>
      ) : activeChannels.length === 0 && archivedChannels.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="font-medium">チャンネルが登録されていません</p>
          <p className="text-sm mt-1">
            「チャンネルを追加」からYouTubeチャンネルを登録してください
          </p>
        </div>
      ) : (
        <>
          {/* Active channel tabs */}
          {activeChannels.length > 0 && (
            <div className="flex gap-2 flex-wrap items-center">
              {activeChannels.map((ch) => (
                <div key={ch.id} className="group relative flex items-center">
                  <Button
                    onClick={() => setSelectedChannelId(ch.id)}
                    variant={
                      selectedChannelId === ch.id ? "default" : "secondary"
                    }
                    size="sm"
                    className={cn("pl-4 pr-8 rounded-full")}
                  >
                    {ch.channel_name}
                  </Button>
                  <Button
                    onClick={() => handleArchiveChannel(ch.id, true)}
                    title="アーカイブ"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "absolute right-2 p-0.5 rounded transition-opacity",
                      selectedChannelId === ch.id
                        ? "opacity-60 hover:opacity-100 text-primary-foreground"
                        : "opacity-0 group-hover:opacity-60 hover:!opacity-100 text-muted-foreground",
                    )}
                  >
                    <Archive className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Content for selected channel */}
          {selectedChannelId && (
            <>
              {/* Archive notice */}
              {selectedChannel?.archived && (
                <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-xs text-muted-foreground">
                  <Archive className="h-3.5 w-3.5 shrink-0" />
                  このチャンネルはアーカイブ済みです
                </div>
              )}

              {/* Progress */}
              {allVideos.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {doneCnt} / {allVideos.length} 見た
                  </span>
                </div>
              )}

              {/* Filter tabs */}
              <Tabs
                value={filter}
                onValueChange={(v) => setFilter(v as Filter)}
              >
                <TabsList>
                  <TabsTrigger value="todo">
                    これから
                    <Badge variant="secondary" className="ml-2 rounded-full">
                      {todoCnt}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="done">
                    見た
                    <Badge variant="secondary" className="ml-2 rounded-full">
                      {doneCnt}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Video grid */}
              {filteredVideos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {filter === "todo"
                    ? "全部見ました！"
                    : "まだ見た動画がありません"}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onMarkDone={handleMarkDone}
                      onDelete={handleDeleteVideo}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Archive modal */}
      <Dialog open={showArchiveModal} onOpenChange={setShowArchiveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アーカイブ済みチャンネル</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {archivedChannels.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border-default)] px-4 py-3"
              >
                <span className="text-sm font-medium">{ch.channel_name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleArchiveChannel(ch.id, false)}
                >
                  <ArchiveRestore className="h-3.5 w-3.5 mr-1.5" />
                  戻す
                </Button>
              </div>
            ))}
          </div>
          <FormActions>
            <Button
              variant="outline"
              onClick={() => setShowArchiveModal(false)}
            >
              閉じる
            </Button>
          </FormActions>
        </DialogContent>
      </Dialog>

      {/* Add channel modal */}
      <Dialog
        open={showAddModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setChannelUrl("");
            setSinceYear("");
            setFetchError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>チャンネルを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">チャンネルURL</label>
              <Input
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                placeholder="https://www.youtube.com/@ChannelName"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleFetchChannel();
                }}
              />
              <p className="text-xs text-muted-foreground">
                例: https://www.youtube.com/@EnglishWithVenya
                <br />※ 3分未満の動画は自動的に除外されます
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">取得開始年（任意）</label>
              <Input
                value={sinceYear}
                onChange={(e) => setSinceYear(e.target.value)}
                placeholder="例: 2020"
                maxLength={4}
              />
              <p className="text-xs text-muted-foreground">
                入力した年以降の動画のみ取得します
              </p>
            </div>
            {fetchError && (
              <p className="text-sm text-destructive">{fetchError}</p>
            )}
            <FormActions>
              <Button
                onClick={handleFetchChannel}
                disabled={fetching || !channelUrl.trim()}
              >
                {fetching ? "取得中..." : "動画を取得する"}
              </Button>
            </FormActions>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VideoCard({
  video,
  onMarkDone,
  onDelete,
}: {
  video: VideoWithLap;
  onMarkDone: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [marking, setMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isCompleted = video.lapCount > 0;

  const handleComplete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMarking(true);
    await onMarkDone(video.id);
    setMarking(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    await onDelete(video.id);
    setDeleting(false);
  };

  return (
    <a
      href={video.video_url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group relative rounded-lg border border-[var(--color-border-default)] bg-card overflow-hidden flex flex-col transition-all cursor-pointer border border-border",
        "hover:border-[var(--color-border-strong)] hover:border border-border hover:-translate-y-0.5",
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-muted relative overflow-hidden">
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
        {/* Completed overlay */}
        {isCompleted ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "var(--color-overlay-default)" }}
          >
            <CheckCircle className="h-6 w-6 text-white drop-shadow" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
            <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow" />
          </div>
        )}
        {/* Delete button */}
        <Button
          onClick={handleDelete}
          disabled={deleting}
          title="削除"
          variant="ghost"
          size="sm"
          className="absolute top-2 left-2 p-1 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all disabled:opacity-30 cursor-pointer"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Title + duration */}
      <div className="px-3 pt-3 pb-10">
        <p
          className={cn(
            "text-sm font-medium line-clamp-2 leading-snug transition-colors",
            isCompleted ? "text-muted-foreground" : "group-hover:text-primary",
          )}
        >
          {video.title}
        </p>
        {video.duration && (
          <p
            className={cn(
              "text-xs mt-1",
              isCompleted
                ? "text-muted-foreground/60"
                : "text-muted-foreground",
            )}
          >
            {video.duration}
          </p>
        )}
      </div>

      {/* Action button - bottom right */}
      <div className="absolute bottom-2.5 right-2.5">
        {isCompleted ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleComplete}
            disabled={marking}
            className="cursor-pointer"
          >
            {marking ? "記録中..." : `もう1回 (${video.lapCount + 1}回目)`}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleComplete}
            disabled={marking}
            className="cursor-pointer"
          >
            {marking ? "記録中..." : "見た"}
          </Button>
        )}
      </div>
    </a>
  );
}
