"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, PageHeader } from "@takaki/go-design-system";
import {
  Loader2,
  CheckCircle2,
  Volume2,
  BookOpen,
  MessageSquare,
  TrendingUp,
} from "lucide-react";

const SCORE_LABELS = ["語彙", "文法", "流暢さ", "発音"];

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 90)
    return { label: "非常に自然", color: "text-[color:var(--color-success)]" };
  if (score >= 75)
    return { label: "概ね自然", color: "text-[color:var(--color-grammar)]" };
  if (score >= 60)
    return {
      label: "伝わるが改善の余地あり",
      color: "text-[color:var(--color-warning)]",
    };
  return { label: "要練習", color: "text-destructive" };
}

function getSection(raw: string, tag: string) {
  const m = raw.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)(?=\\[|$)`));
  return m ? m[1].trim() : null;
}

function parseComment(raw: string) {
  const good = getSection(raw, "GOOD");
  if (!good) return null;
  return {
    good,
    improve: getSection(raw, "IMPROVE"),
    grammarBefore: getSection(raw, "GRAMMAR_BEFORE"),
    grammarAfter: getSection(raw, "GRAMMAR_AFTER"),
    phraseBefore: getSection(raw, "PHRASE_BEFORE"),
    phraseAfter: getSection(raw, "PHRASE_AFTER"),
    example1: getSection(raw, "EXAMPLE1"),
    example2: getSection(raw, "EXAMPLE2"),
  };
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 80
      ? "bg-[color:var(--color-grammar)]"
      : pct >= 60
        ? "bg-[color:var(--color-grammar)]/70"
        : pct >= 40
          ? "bg-[color:var(--color-warning)]"
          : "bg-destructive";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums">
          {score}
          <span className="text-xs text-muted-foreground font-normal">
            {" "}
            / 100
          </span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BeforeAfterCard({
  before,
  after,
  type,
}: {
  before: string | null;
  after: string | null;
  type: "grammar" | "phrase";
}) {
  if (!before || !after || before === "-" || after === "-") return null;
  const label = type === "grammar" ? "文法" : "フレーズ";
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <div className="grid grid-cols-[1fr_16px_1fr] items-center gap-1.5">
        <div className="rounded-lg bg-muted/60 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 mb-1">
            Before
          </p>
          <p className="text-sm leading-snug text-muted-foreground">{before}</p>
        </div>
        <span className="text-muted-foreground text-center text-sm">→</span>
        <div className="rounded-lg bg-[color:var(--color-grammar)]/10 border border-[color:var(--color-grammar)]/30 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-grammar)]/70 mb-1">
            After
          </p>
          <p className="text-sm leading-snug text-foreground">{after}</p>
        </div>
      </div>
    </div>
  );
}

function SpeakButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);

  async function speak() {
    if (speaking) return;
    setSpeaking(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, rate: 0.9 }),
      });
      if (!res.ok) {
        setSpeaking(false);
        return;
      }
      const { audioContent } = await res.json();
      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      audio.play().catch(() => setSpeaking(false));
    } catch {
      setSpeaking(false);
    }
  }

  return (
    <Button
      onClick={speak}
      disabled={speaking}
      variant="ghost"
      size="sm"
      className={`flex-shrink-0 p-1.5 rounded-full transition-colors ${
        speaking
          ? "text-[color:var(--color-grammar)]"
          : "text-muted-foreground hover:text-foreground"
      }`}
      aria-label="音声を再生"
    >
      {speaking ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  );
}

type LogData = {
  scores: number[];
  total_score: number;
  comment: string;
  speech_text: string;
  grammar: { name: string; summary: string; image_url: string | null } | null;
};

function ResultContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const logId = searchParams.get("log");
  const grammarId = params.id as string;
  const [data, setData] = useState<LogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextLoading, setNextLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!logId) {
      router.replace("/speaking");
      return;
    }

    supabase
      .from("speaking_logs")
      .select(
        "scores, total_score, comment, speech_text, grammar:grammar_id(name, summary, image_url)",
      )
      .eq("id", logId)
      .single()
      .then(({ data: log }) => {
        if (!log) {
          router.replace("/speaking");
          return;
        }
        setData({
          scores: log.scores as number[],
          total_score: log.total_score,
          comment: log.comment,
          speech_text: (log.speech_text as string) ?? "",
          grammar: Array.isArray(log.grammar)
            ? log.grammar[0]
            : (log.grammar as LogData["grammar"]),
        });
        setLoading(false);
      });
  }, [logId, router]);

  async function goToNext() {
    setNextLoading(true);

    const { data: curr } = await supabase
      .from("grammar")
      .select("created_at")
      .eq("id", grammarId)
      .single();

    let next: { id: string } | null = null;

    if (curr) {
      const { data } = await supabase
        .from("grammar")
        .select("id")
        .not("image_url", "is", null)
        .or("play_count.is.null,play_count.lt.10")
        .lt("created_at", curr.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      next = data;
    }

    if (next?.id) {
      router.push(`/speaking/${next.id}`);
    } else {
      router.push("/speaking");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const sections = parseComment(data.comment);
  const avgScore = data.total_score;
  const scoreLabel = getScoreLabel(avgScore);
  const hasBeforeAfter =
    (sections?.grammarBefore &&
      sections.grammarBefore !== "-" &&
      sections?.grammarAfter &&
      sections.grammarAfter !== "-") ||
    (sections?.phraseBefore &&
      sections.phraseBefore !== "-" &&
      sections?.phraseAfter &&
      sections.phraseAfter !== "-");

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title="評価結果" description={data.grammar?.name} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column */}
        <div className="space-y-5">
          {/* Thumbnail */}
          {data.grammar?.image_url && (
            <div className="rounded-xl overflow-hidden bg-muted w-full aspect-[4/3]">
              <img
                src={data.grammar.image_url}
                alt=""
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Total score */}
          <div className="rounded-lg border bg-card p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                総合スコア
              </p>
              <p className={`text-sm font-medium ${scoreLabel.color}`}>
                {scoreLabel.label}
              </p>
            </div>
            <p className="text-4xl font-bold tabular-nums">
              {avgScore}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / 100
              </span>
            </p>
          </div>

          {/* Score breakdown */}
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              内訳
            </p>
            {SCORE_LABELS.map((label, i) => (
              <ScoreBar key={label} label={label} score={data.scores[i] ?? 0} />
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* User speech */}
          {data.speech_text && (
            <div className="rounded-lg border bg-card p-5 space-y-3">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  あなたのスピーチ
                </p>
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                {data.speech_text}
              </p>
            </div>
          )}

          {/* Feedback */}
          {data.comment && (
            <div className="rounded-lg border bg-card p-5 space-y-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                フィードバック
              </p>

              {sections ? (
                <>
                  {/* Good point */}
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[color:var(--color-success)]" />
                    <p className="text-sm leading-relaxed text-foreground">
                      {sections.good}
                    </p>
                  </div>

                  {/* Improve point */}
                  {sections.improve && sections.improve !== "-" && (
                    <div className="flex items-start gap-2.5">
                      <TrendingUp className="h-4 w-4 shrink-0 mt-0.5 text-[color:var(--color-warning)]" />
                      <p className="text-sm leading-relaxed text-foreground">
                        {sections.improve}
                      </p>
                    </div>
                  )}

                  {/* Before / After cards */}
                  {hasBeforeAfter && (
                    <div className="space-y-4 pt-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        添削
                      </p>
                      <BeforeAfterCard
                        before={sections.grammarBefore}
                        after={sections.grammarAfter}
                        type="grammar"
                      />
                      <BeforeAfterCard
                        before={sections.phraseBefore}
                        after={sections.phraseAfter}
                        type="phrase"
                      />
                    </div>
                  )}

                  {/* Example sentences */}
                  {(sections.example1 || sections.example2) && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          こう言うと自然
                        </p>
                      </div>
                      <div className="space-y-2">
                        {[sections.example1, sections.example2]
                          .filter(Boolean)
                          .map((ex, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 rounded-lg bg-muted/30 px-3 py-2.5"
                            >
                              <span className="text-xs font-bold text-muted-foreground/50 mt-0.5 shrink-0">
                                {i + 1}
                              </span>
                              <p className="text-sm leading-relaxed flex-1">
                                {ex}
                              </p>
                              <SpeakButton text={ex!} />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-foreground leading-relaxed">
                  {data.comment}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/speaking")}
          className="flex-1"
        >
          一覧に戻る
        </Button>
        <Button onClick={goToNext} disabled={nextLoading} className="flex-1">
          {nextLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          次へ進む
        </Button>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}