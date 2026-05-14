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
import { incrementExpressionPlayCount } from "@/app/actions/practice";
import { useCurrentLanguage } from "@/lib/language-context";
import type { Expression } from "@/lib/types";
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

export default function ExpressionRepeatingPage() {
  const router = useRouter();
  const supabase = createClient();
  const language = useCurrentLanguage();
  const [allItems, setAllItems] = useState<Expression[]>([]);
  const [items, setItems] = useState<Expression[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(-1);
  const [rate, setRate] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [showComplete, setShowComplete] = useState(false);
  const [todayStatus, setTodayStatus] = useState<TodayStatus>({
    grammar: false,
    expression: true,
    word: false,
  });
  const cancelRef = useRef(false);
  const userCancelledRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resumeLineRef = useRef(0);
  const rateRef = useRef(rate);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("expressions")
      .select("*")
      .eq("language", language)
      .lt("play_count", 10)
      .order("is_priority", { ascending: false })
      .order("created_at", { ascending: true });
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

  function startSession(count: number) {
    setItems(allItems.slice(0, count));
    setIndex(0);
    setSessionStarted(true);
  }

  function restartSession() {
    setShowComplete(false);
    setSessionStarted(false);
    setIndex(0);
    setItems([]);
    resumeLineRef.current = 0;
    loadItems();
  }

  // Fetch today's completion status when the modal appears
  useEffect(() => {
    if (!showComplete) return;
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("practice_logs")
      .select("grammar_done_count, word_done_count")
      .eq("practiced_at", today)
      .eq("language", language)
      .maybeSingle()
      .then(({ data }) => {
        setTodayStatus({
          grammar: (data?.grammar_done_count ?? 0) > 0,
          expression: true, // just completed
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

    try {
      while (
        localItems.length > 0 &&
        !cancelRef.current &&
        playCount < initialCount
      ) {
        const item = localItems[localIndex];
        const lines = (item.conversation ?? "").split("\n").filter(Boolean);
        const fromLine = startLine;
        startLine = 0; // subsequent items always start from line 0

        for (let i = fromLine; i < lines.length; i++) {
          if (cancelRef.current) break;
          const ttsText = lines[i].replace(/^[AB]:\s*/i, "");
          await speakLine(ttsText, i, rateRef.current);
          if (i < lines.length - 1 && !cancelRef.current) {
            await pause(10);
          }
        }

        if (cancelRef.current) break;

        resumeLineRef.current = 0;
        setCurrentLine(-1);
        playCount++;
        incrementExpressionPlayCount(item.id); // fire and forget for faster transition

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
      if (!userCancelledRef.current) {
        setShowComplete(true);
      }
    }
  }, [items, index, speakLine]);

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
        <p className="text-lg">練習中のフレーズはありません</p>
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
  const lines = current?.conversation.split("\n").filter(Boolean) ?? [];

  return (
    <>
      <div className="space-y-6 max-w-2xl">
        <PageHeader
          title="フレーズリピーティング"
          description={`${index + 1} / ${items.length} 件`}
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  stopSpeech();
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
              <div>
                <Badge variant="outline" className="mb-2">
                  {current?.category}
                </Badge>
                <CardTitle className="text-3xl">
                  {current?.expression}
                </CardTitle>
              </div>
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
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">
                会話
              </p>
              <ConversationLines lines={lines} currentLine={currentLine} />
            </div>
            {language === "vi" && current?.nuance && (
              <div className="rounded-md border border-border/60 bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  ニュアンス
                </p>
                <p className="text-sm leading-relaxed">{current.nuance}</p>
              </div>
            )}
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

      <RepeatingCompleteModal
        open={showComplete}
        title="お疲れ様でした！"
        subtitle="フレーズリピーティングを 1 周完了しました"
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
          onClick={restartSession}
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
