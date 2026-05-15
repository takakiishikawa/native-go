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
import { incrementGrammarPlayCount } from "@/app/actions/practice";
import { useCurrentLanguage } from "@/lib/language-context";
import type { Grammar } from "@/lib/types";
import {
  Play,
  Square,
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { ConversationLines } from "@/components/conversation-lines";
import { WordNotesPanel } from "@/components/word-notes";
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

type TodayStatus = {
  grammar: boolean;
  expression: boolean;
  word: boolean;
};

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

export default function GrammarRepeatingPage() {
  const router = useRouter();
  const supabase = createClient();
  const language = useCurrentLanguage();
  const searchParams = useSearchParams();
  const requestedCount = parseInt(searchParams.get("count") ?? "0", 10);
  const [allItems, setAllItems] = useState<Grammar[]>([]);
  const [items, setItems] = useState<Grammar[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(-1);
  const [rate, setRate] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [showComplete, setShowComplete] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [todayStatus, setTodayStatus] = useState<TodayStatus>({
    grammar: true,
    expression: false,
    word: false,
  });
  const cancelRef = useRef(false);
  const userCancelledRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resumeLineRef = useRef(0);
  const rateRef = useRef(rate);
  const pendingIncrementsRef = useRef<Promise<unknown>[]>([]);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("grammar")
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

  // ?count=N が指定されていれば picker をスキップして自動開始
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
    resumeLineRef.current = 0;
    loadItems();
  }

  // Fetch today's completion status when the modal appears
  useEffect(() => {
    if (!showComplete) return;
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("practice_logs")
      .select("expression_done_count, word_done_count")
      .eq("practiced_at", today)
      .eq("language", language)
      .maybeSingle()
      .then(({ data }) => {
        setTodayStatus({
          grammar: true, // just completed
          expression: (data?.expression_done_count ?? 0) > 0,
          word: (data?.word_done_count ?? 0) > 0,
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
    setCurrentLine(-1);
  }, []);

  const speakLine = useCallback(
    async (
      text: string,
      lineIndex: number,
      speakRate: number,
    ): Promise<void> => {
      if (cancelRef.current) return;
      resumeLineRef.current = lineIndex;
      setCurrentLine(lineIndex);
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
    [],
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
    let startLine = resumeLineRef.current;
    // 完走したアイテムの DB 反映用 Promise を貯める（fire-and-forget で発火し
    // 次のアイテムへはすぐ進む。完了/停止/離脱確認時に await して確実に書き込み）

    try {
      while (
        localItems.length > 0 &&
        !cancelRef.current &&
        playCount < initialCount
      ) {
        const item = localItems[localIndex];
        const examples = item.examples.split("\n").filter(Boolean);
        const fromLine = startLine;
        startLine = 0; // subsequent items always start from line 0

        for (let i = fromLine; i < examples.length; i++) {
          if (cancelRef.current) break;
          const ttsText = examples[i].replace(/^[AB]:\s*/i, "");
          await speakLine(ttsText, i, rateRef.current);
          if (i < examples.length - 1 && !cancelRef.current) {
            await pause(10);
          }
        }

        if (cancelRef.current) break;

        resumeLineRef.current = 0;
        setCurrentLine(-1);
        playCount++;
        setCompletedCount((c) => c + 1);
        pendingIncrementsRef.current.push(
          incrementGrammarPlayCount(item.id).catch((e) => {
            console.error("[grammar increment failed]", e);
          }),
        );

        // Update play_count locally for display only — never remove items mid-session
        localItems = localItems.map((it, idx) =>
          idx === localIndex ? { ...it, play_count: it.play_count + 1 } : it,
        );
        localIndex = (localIndex + 1) % localItems.length;

        setItems([...localItems]);
        setIndex(localIndex);
        await pause(50);
      }
    } finally {
      setPlaying(false);
      setCurrentLine(-1);
      // セッション終了時に、ここまでに走らせた全ての increment 完了を待つ
      // （通常時の遷移は速いまま、終了タイミングだけ確実に DB に届ける）
      await Promise.allSettled(pendingIncrementsRef.current);
      pendingIncrementsRef.current = [];
      if (!userCancelledRef.current) {
        setShowComplete(true);
      }
    }
  }, [items, index, speakLine]);

  // 1件以上完走済みでセッション中（=未完了完走済みデータがある）にページ離脱を試みた時、確認モーダルを挟む
  const guardActive = sessionStarted && !showComplete && completedCount > 0;
  const { pendingHref, confirmLeave, cancelLeave } = useRepeatingSessionGuard({
    active: guardActive,
    pendingPromisesRef: pendingIncrementsRef,
  });

  // スペースキーで再生/停止トグル（YouTube ライク）
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
        <p className="text-lg">練習中の文法はありません</p>
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
  const examples = current?.examples.split("\n").filter(Boolean) ?? [];

  return (
    <>
      <div className="space-y-6 max-w-2xl">
        <PageHeader
          title="文法リピーティング"
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
              <CardTitle className="text-3xl">{current?.name}</CardTitle>
              <StarRating value={current?.frequency ?? 0} />
            </div>
            <p className="text-lg text-muted-foreground whitespace-pre-line leading-relaxed">
              {current?.summary?.replace(/\\n/g, "\n")}
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {current?.usage_scene && (
              <p className="text-base text-muted-foreground">
                場面: {current.usage_scene}
              </p>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">
                会話
              </p>
              <ConversationLines lines={examples} currentLine={currentLine} />
            </div>
            {language === "vi" && current?.word_notes && (
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
              resumeLineRef.current = 0;
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
              resumeLineRef.current = 0;
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
        subtitle="文法リピーティングを 1 周完了しました"
        itemCount={items.length}
      >
        <CompletionNavButton
          label="文法リピーティング"
          done={todayStatus.grammar}
          onClick={restartSession}
        />
        <CompletionNavButton
          label="フレーズリピーティング"
          done={todayStatus.expression}
          onClick={() => router.push("/repeating/expression")}
        />
        {language === "vi" && (
          <CompletionNavButton
            label="単語リピーティング"
            done={todayStatus.word}
            onClick={() => router.push("/repeating/word")}
          />
        )}
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
