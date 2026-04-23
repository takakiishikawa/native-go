"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import type { Grammar } from "@/lib/types";
import {
  Play,
  Square,
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { ConversationLines } from "@/components/conversation-lines";

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

type TodayStatus = { grammar: boolean; expression: boolean; speaking: boolean };

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
  const [items, setItems] = useState<Grammar[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(-1);
  const [rate, setRate] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [showComplete, setShowComplete] = useState(false);
  const [aiComment, setAiComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [todayStatus, setTodayStatus] = useState<TodayStatus>({
    grammar: true,
    expression: false,
    speaking: false,
  });
  const cancelRef = useRef(false);
  const userCancelledRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resumeLineRef = useRef(0);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("grammar")
        .select("*")
        .lt("play_count", 10)
        .order("created_at", { ascending: true });
      setItems(data ?? []);
      setLoading(false);
    }
    load();
    return () => {
      cancelRef.current = true;
      audioRef.current?.pause();
    };
  }, []);

  // Fetch today's completion status when the modal appears
  useEffect(() => {
    if (!showComplete) return;
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("practice_logs")
      .select("grammar_done_count, expression_done_count, speaking_count")
      .eq("practiced_at", today)
      .maybeSingle()
      .then(({ data }) => {
        setTodayStatus({
          grammar: true, // just completed
          expression: (data?.expression_done_count ?? 0) > 0,
          speaking: (data?.speaking_count ?? 0) > 0,
        });
      });
  }, [showComplete]);

  const fetchComment = useCallback(async () => {
    setCommentLoading(true);
    try {
      const res = await fetch("/api/repeating-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "grammar" }),
      });
      const data = await res.json();
      if (data.comment) setAiComment(data.comment);
    } catch {
      // silently fail
    } finally {
      setCommentLoading(false);
    }
  }, []);

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
          body: JSON.stringify({ text, rate: speakRate }),
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
    const playRate = rate;
    const initialCount = localItems.length;
    let playCount = 0;
    let startLine = resumeLineRef.current;

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
        await speakLine(ttsText, i, playRate);
        if (i < examples.length - 1 && !cancelRef.current) {
          await pause(10);
        }
      }

      if (cancelRef.current) break;

      resumeLineRef.current = 0;
      setCurrentLine(-1);
      playCount++;
      incrementGrammarPlayCount(item.id); // fire and forget for faster transition

      // Update play_count locally for display only — never remove items mid-session
      localItems = localItems.map((it, idx) =>
        idx === localIndex ? { ...it, play_count: it.play_count + 1 } : it,
      );
      localIndex = (localIndex + 1) % localItems.length;

      setItems([...localItems]);
      setIndex(localIndex);
      await pause(50);
    }

    setPlaying(false);
    setCurrentLine(-1);
    if (!userCancelledRef.current) {
      setShowComplete(true);
      fetchComment();
    }
  }, [items, index, rate, speakLine, fetchComment]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (items.length === 0 && !showComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
        <p className="text-lg">練習中の文法はありません</p>
        <p className="text-sm">すべて完了しました！</p>
      </div>
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
                onClick={() => {
                  stopSpeech();
                  router.push("/practice");
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
          <CardContent>
            <p className="text-sm font-medium text-muted-foreground mb-3">
              会話
            </p>
            <ConversationLines lines={examples} currentLine={currentLine} />
            <p className="text-base text-muted-foreground mt-4">
              場面: {current?.usage_scene}
            </p>
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

      {showComplete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-lg p-8 text-center space-y-4 w-full max-w-sm border border-border">
            <div className="rounded-full bg-[color:var(--color-success-subtle)] p-4 w-20 h-20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-[color:var(--color-success)]" />
            </div>
            <h2 className="text-2xl font-semibold">お疲れ様でした！</h2>
            <p className="text-muted-foreground">文法リピーティング 1周完了</p>
            {commentLoading ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : aiComment ? (
              <p className="text-sm text-foreground leading-relaxed text-left">
                {aiComment}
              </p>
            ) : null}

            <div className="space-y-2 pt-2">
              <CompletionNavButton
                label="文法リピーティング"
                done={todayStatus.grammar}
                onClick={() => {
                  setShowComplete(false);
                  router.push("/repeating/grammar");
                }}
              />
              <CompletionNavButton
                label="フレーズリピーティング"
                done={todayStatus.expression}
                onClick={() => router.push("/repeating/expression")}
              />
              <CompletionNavButton
                label="スピーキング"
                done={todayStatus.speaking}
                onClick={() => router.push("/speaking")}
              />
              <Button
                variant="ghost"
                onClick={() => router.push("/")}
                className="w-full text-muted-foreground"
              >
                ダッシュボードに戻る
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
