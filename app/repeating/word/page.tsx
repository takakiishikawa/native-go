"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Slider,
  PageHeader,
} from "@takaki/go-design-system";
import { incrementWordPlayCount } from "@/app/actions/practice";
import { useCurrentLanguage } from "@/lib/language-context";
import type { Word } from "@/lib/types";
import {
  Play,
  Square,
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { WordNotesPanel } from "@/components/word-notes";
import { ConversationLines } from "@/components/conversation-lines";
import { RepeatingCountPicker } from "@/components/repeating-count-picker";
import { RepeatingCompleteModal } from "@/components/repeating-complete-modal";
import { RepeatingLeaveConfirm } from "@/components/repeating-leave-confirm";
import { useRepeatingSessionGuard } from "@/lib/hooks/use-repeating-session-guard";

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${i <= value ? "fill-[var(--color-warning)] text-[color:var(--color-warning)]" : "text-muted-foreground"}`}
        />
      ))}
    </span>
  );
}

type TodayStatus = { grammar: boolean; expression: boolean; word: boolean };

function CompletionNavButton({
  label,
  done,
  onClick,
}: {
  label: string;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={done ? "outline" : "default"}
      onClick={onClick}
      className="w-full justify-between"
    >
      <span className="flex items-center gap-2">
        {done ? (
          <CheckCircle2 className="h-4 w-4 text-[color:var(--color-success)] shrink-0" />
        ) : (
          <ArrowRight className="h-4 w-4 shrink-0" />
        )}
        {label}
      </span>
      {done && (
        <span className="text-xs text-muted-foreground ml-2 shrink-0">
          今日完了済み
        </span>
      )}
    </Button>
  );
}

export default function WordRepeatingPage() {
  const router = useRouter();
  const supabase = createClient();
  const language = useCurrentLanguage();
  const searchParams = useSearchParams();
  const requestedCount = parseInt(searchParams.get("count") ?? "0", 10);
  const [allItems, setAllItems] = useState<Word[]>([]);
  const [items, setItems] = useState<Word[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(-1);
  const [rate, setRate] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [showComplete, setShowComplete] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [todayStatus, setTodayStatus] = useState<TodayStatus>({
    grammar: false,
    expression: false,
    word: true,
  });
  const cancelRef = useRef(false);
  const userCancelledRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rateRef = useRef(rate);
  const pendingIncrementsRef = useRef<Promise<unknown>[]>([]);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("words")
      .select("*")
      .eq("language", language)
      .lt("play_count", 10)
      .order("is_priority", { ascending: false })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    setAllItems(data ?? []);
    setLoading(false);
  }, [language, supabase]);

  useEffect(() => {
    loadItems();
    return () => {
      cancelRef.current = true;
      audioRef.current?.pause();
    };
  }, [loadItems]);

  useEffect(() => {
    if (sessionStarted) return;
    if (loading) return;
    if (allItems.length === 0) return;
    if (requestedCount <= 0) return;
    startSession(Math.min(requestedCount, allItems.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems, loading, sessionStarted, requestedCount]);

  function startSession(count: number) {
    setItems(allItems.slice(0, count));
    setIndex(0);
    setSessionStarted(true);
    setCompletedCount(0);
  }

  function restartSession() {
    setShowComplete(false);
    setSessionStarted(false);
    setIndex(0);
    setItems([]);
    setCompletedCount(0);
    loadItems();
  }

  useEffect(() => {
    if (!showComplete) return;
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("practice_logs")
      .select("grammar_done_count, expression_done_count")
      .eq("practiced_at", today)
      .eq("language", language)
      .maybeSingle()
      .then(({ data }) => {
        setTodayStatus({
          grammar: (data?.grammar_done_count ?? 0) > 0,
          expression: (data?.expression_done_count ?? 0) > 0,
          word: true,
        });
      });
  }, [showComplete, language]);

  const stopSpeech = useCallback(() => {
    cancelRef.current = true;
    userCancelledRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
    setCurrentSegment(-1);
  }, []);

  const speakSegment = useCallback(
    async (text: string, segIdx: number, speakRate: number): Promise<void> => {
      if (cancelRef.current) return;
      setCurrentSegment(segIdx);
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, rate: speakRate, language }),
        });
        if (!response.ok || cancelRef.current) return;
        const { audioContent } = await response.json();
        await new Promise<void>((resolve) => {
          if (cancelRef.current) {
            resolve();
            return;
          }
          const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
          audioRef.current = audio;
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
      } catch {
        // continue on error
      }
    },
    [language],
  );

  const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const handlePlay = useCallback(async () => {
    if (items.length === 0) return;
    cancelRef.current = false;
    userCancelledRef.current = false;
    setPlaying(true);

    let localItems = [...items];
    let localIndex = index;
    const initialCount = localItems.length;
    let playCount = 0;

    try {
      while (
        localItems.length > 0 &&
        !cancelRef.current &&
        playCount < initialCount
      ) {
        const item = localItems[localIndex];
        // example は A/B/A 3ターン対話 (新形式) or 単一文 (旧形式)。
        // 単語そのものを先頭に置き、続いて対話を1行ずつ再生する。
        const exampleLines = (item.example ?? "")
          .split("\n")
          .filter(Boolean);
        const segments = [
          item.word,
          ...exampleLines.map((l) => l.replace(/^[AB]:\s*/i, "")),
        ].filter((s): s is string => Boolean(s && s.trim()));

        for (let i = 0; i < segments.length; i++) {
          if (cancelRef.current) break;
          await speakSegment(segments[i], i, rateRef.current);
          if (i < segments.length - 1 && !cancelRef.current) {
            await pause(150);
          }
        }

        if (cancelRef.current) break;

        setCurrentSegment(-1);
        playCount++;
        setCompletedCount((c) => c + 1);
        pendingIncrementsRef.current.push(
          incrementWordPlayCount(item.id).catch((e) => {
            console.error("[word increment failed]", e);
          }),
        );

        localItems = localItems.map((it, idx) =>
          idx === localIndex ? { ...it, play_count: it.play_count + 1 } : it,
        );
        setItems([...localItems]);

        // 最終アイテム再生後はインデックスを進めない（先頭へ巻き戻さない）
        if (playCount < initialCount) {
          localIndex = (localIndex + 1) % localItems.length;
          setIndex(localIndex);
          await pause(50);
        }
      }
    } finally {
      setPlaying(false);
      setCurrentSegment(-1);
      // 完了モーダルを先に表示してから increment の flush を待つ
      if (!userCancelledRef.current) {
        setShowComplete(true);
      }
      await Promise.allSettled(pendingIncrementsRef.current);
      pendingIncrementsRef.current = [];
    }
  }, [items, index, speakSegment]);

  const guardActive = sessionStarted && !showComplete && completedCount > 0;
  const { pendingHref, confirmLeave, cancelLeave } = useRepeatingSessionGuard({
    active: guardActive,
    pendingPromisesRef: pendingIncrementsRef,
  });

  useEffect(() => {
    if (!sessionStarted || showComplete) return;
    const onKeydown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      if (playing) {
        stopSpeech();
      } else {
        handlePlay();
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [sessionStarted, showComplete, playing, handlePlay, stopSpeech]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (allItems.length === 0 && !showComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
        <p className="text-lg">練習中の単語はありません</p>
        <p className="text-sm">すべて完了しました！</p>
      </div>
    );
  }

  if (!sessionStarted) {
    return (
      <RepeatingCountPicker
        total={allItems.length}
        onSelect={startSession}
      />
    );
  }

  const current = items[index];
  const exampleLines = (current?.example ?? "").split("\n").filter(Boolean);
  // 対話行のハイライト位置。currentSegment は再生中の TTS index (0=単語, 1+=対話行)
  const dialogueLine = currentSegment > 0 ? currentSegment - 1 : -1;

  return (
    <>
      <div className="space-y-6 max-w-2xl">
        <PageHeader
          title="単語リピーティング"
          description={`${index + 1} / ${items.length} 件`}
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  stopSpeech();
                  await Promise.allSettled(pendingIncrementsRef.current);
                  pendingIncrementsRef.current = [];
                  router.push("/");
                }}
              >
                途中終了
              </Button>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {current?.play_count} / 10 回
              </Badge>
            </div>
          }
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl">{current?.word}</CardTitle>
              <StarRating value={current?.frequency ?? 0} />
            </div>
            <p className="text-lg text-muted-foreground whitespace-pre-line leading-relaxed">
              {current?.meaning?.replace(/\\n/g, "\n")}
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {current?.usage_scene && (
              <p className="text-base text-muted-foreground">
                場面: {current.usage_scene}
              </p>
            )}
            {exampleLines.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  会話
                </p>
                <ConversationLines
                  lines={exampleLines}
                  currentLine={dialogueLine}
                />
              </div>
            )}
            {current?.word_notes && (
              <WordNotesPanel notes={current.word_notes} />
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              速度
            </span>
            <Slider
              min={60}
              max={140}
              step={10}
              value={[Math.round(rate * 100)]}
              onValueChange={([v]) => setRate(v / 100)}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground w-10">
              {rate.toFixed(1)}x
            </span>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              stopSpeech();
              setIndex((i) => Math.max(0, i - 1));
            }}
            disabled={index === 0 || playing}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {playing ? (
            <Button onClick={stopSpeech} variant="destructive" size="lg">
              <Square className="mr-2 h-4 w-4" />
              停止
            </Button>
          ) : (
            <Button onClick={handlePlay} size="lg">
              <Play className="mr-2 h-4 w-4" />
              再生
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              stopSpeech();
              setIndex((i) => Math.min(items.length - 1, i + 1));
            }}
            disabled={index === items.length - 1 || playing}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <RepeatingLeaveConfirm
        open={pendingHref !== null}
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
      />

      <RepeatingCompleteModal
        open={showComplete}
        title="お疲れ様でした！"
        subtitle="単語リピーティングを 1 周完了しました"
        itemCount={items.length}
      >
        <CompletionNavButton
          label="文法リピーティング"
          done={todayStatus.grammar}
          onClick={() => router.push("/repeating/grammar")}
        />
        <CompletionNavButton
          label="フレーズリピーティング"
          done={todayStatus.expression}
          onClick={() => router.push("/repeating/expression")}
        />
        <CompletionNavButton
          label="単語リピーティング"
          done={todayStatus.word}
          onClick={restartSession}
        />
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="w-full text-muted-foreground"
        >
          ダッシュボードに戻る
        </Button>
      </RepeatingCompleteModal>
    </>
  );
}
