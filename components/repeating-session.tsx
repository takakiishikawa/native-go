"use client";

import { useState } from "react";
import { cn } from "@takaki/go-design-system";
import type { WordNote } from "@/lib/types";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  Star,
  X,
  Languages,
  ChefHat,
  Briefcase,
  Plane,
  Heart,
  BookOpen,
  Coffee,
  ShoppingBag,
  Home,
  Dumbbell,
  Code,
  Cat,
  Dog,
  Bike,
  Utensils,
  Music,
  Users,
  MapPin,
  Wallet,
  Shirt,
  Brain,
  Sparkles,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

const SPEEDS = [0.6, 0.8, 1.0, 1.2] as const;

const TOPIC_ICON_MAP: Record<string, LucideIcon> = {
  "chef-hat": ChefHat,
  briefcase: Briefcase,
  plane: Plane,
  heart: Heart,
  "book-open": BookOpen,
  coffee: Coffee,
  "shopping-bag": ShoppingBag,
  home: Home,
  dumbbell: Dumbbell,
  code: Code,
  cat: Cat,
  dog: Dog,
  bike: Bike,
  utensils: Utensils,
  music: Music,
  users: Users,
  "map-pin": MapPin,
  wallet: Wallet,
  shirt: Shirt,
  brain: Brain,
  sparkles: Sparkles,
  "message-circle": MessageCircle,
};

// ─── Stars ──────────────────────────────────────────────────────────
function Stars({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i <= value
              ? "fill-[var(--color-warning)] text-[color:var(--color-warning)]"
              : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

// ─── Cycle ring (10回で卒業) ─────────────────────────────────────────
function CycleRing({ done, total }: { done: number; total: number }) {
  const size = 22;
  const sw = 3;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, done / total));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={sw}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

// ─── Session progress — chunked dots ────────────────────────────────
// total<=10: 1ドット/件。total>10: ≤10チャンクに分割、進行中のチャンクは
// 幅広＋部分塗り。
function SessionProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const dots = Math.min(10, Math.max(1, total));
  const perDot = total / dots;
  const currentDotIdx = Math.max(
    0,
    Math.min(dots - 1, Math.floor((current - 1) / perDot)),
  );
  const intoChunk = current - 1 - currentDotIdx * perDot;
  const partial =
    perDot <= 1 ? 1 : Math.max(0, Math.min(1, (intoChunk + 0.5) / perDot));
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: dots }).map((_, i) => {
        const active = i === currentDotIdx;
        const done = i < currentDotIdx;
        const isWide = active && perDot > 1;
        return (
          <span
            key={i}
            className={cn(
              "relative h-1.5 overflow-hidden rounded-full transition-all",
              done ? "bg-[color:var(--color-primary)]" : "bg-border",
            )}
            style={{
              width: active
                ? isWide
                  ? 36
                  : 26
                : perDot > 1
                  ? 16
                  : 10,
            }}
          >
            {active && (
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--color-primary)]"
                style={{ width: `${partial * 100}%` }}
              />
            )}
          </span>
        );
      })}
    </span>
  );
}

// ─── Topic chip ─────────────────────────────────────────────────────
function TopicChip({ label, icon }: { label: string; icon: string | null }) {
  const Icon = (icon && TOPIC_ICON_MAP[icon]) || MessageCircle;
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-muted py-1 pl-1 pr-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-primary)]">
        <Icon className="h-3.5 w-3.5 text-white" />
      </span>
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </span>
  );
}

// ─── Highlighted line (pattern highlight + inline Word Wise) ─────────
const isWordChar = (ch: string | undefined) => !!ch && /[\p{L}\p{N}]/u.test(ch);

/** word をトークン境界で探す（部分一致を避ける）。見つからなければ -1。 */
function findToken(text: string, word: string): number {
  if (!word) return -1;
  const lower = text.toLowerCase();
  const w = word.toLowerCase();
  let from = 0;
  while (from <= lower.length) {
    const idx = lower.indexOf(w, from);
    if (idx < 0) return -1;
    const before = text[idx - 1];
    const after = text[idx + word.length];
    if (!isWordChar(before) && !isWordChar(after)) return idx;
    from = idx + 1;
  }
  return -1;
}

type Seg =
  | { kind: "plain"; text: string }
  | { kind: "pattern"; text: string }
  | { kind: "wise"; text: string; note: string };

function buildSegments(
  text: string,
  patternQuote: string | null | undefined,
  wordNotes: WordNote[] | null | undefined,
): Seg[] {
  type Marker = {
    start: number;
    end: number;
    kind: "pattern" | "wise";
    note?: string;
  };
  const markers: Marker[] = [];

  if (patternQuote) {
    const i = text.indexOf(patternQuote);
    if (i >= 0)
      markers.push({ start: i, end: i + patternQuote.length, kind: "pattern" });
  }
  const pat = markers[0];
  for (const n of wordNotes ?? []) {
    const i = findToken(text, n.word);
    if (i < 0) continue;
    const end = i + n.word.length;
    // パターン範囲と重なる語はスキップ（パターン強調を優先）
    if (pat && i < pat.end && end > pat.start) continue;
    markers.push({ start: i, end, kind: "wise", note: n.note });
  }
  markers.sort((a, b) => a.start - b.start);

  const segs: Seg[] = [];
  let cursor = 0;
  for (const m of markers) {
    if (m.start < cursor) continue; // 重複防止
    if (m.start > cursor)
      segs.push({ kind: "plain", text: text.slice(cursor, m.start) });
    if (m.kind === "pattern") {
      segs.push({ kind: "pattern", text: text.slice(m.start, m.end) });
    } else {
      segs.push({
        kind: "wise",
        text: text.slice(m.start, m.end),
        note: m.note ?? "",
      });
    }
    cursor = m.end;
  }
  if (cursor < text.length)
    segs.push({ kind: "plain", text: text.slice(cursor) });
  return segs;
}

function HighlightedLine({
  text,
  patternQuote,
  wordNotes,
}: {
  text: string;
  patternQuote?: string | null;
  wordNotes?: WordNote[] | null;
}) {
  const segs = buildSegments(text, patternQuote, wordNotes);
  return (
    <span className="leading-[2.1]">
      {segs.map((s, i) => {
        if (s.kind === "plain") return <span key={i}>{s.text}</span>;
        if (s.kind === "pattern")
          return (
            <span
              key={i}
              className="rounded bg-[var(--color-primary)]/15 px-0.5 font-semibold text-[color:var(--color-primary)]"
            >
              {s.text}
            </span>
          );
        // Word Wise — gloss above the word
        return (
          <span
            key={i}
            className="relative inline-block whitespace-nowrap pt-[18px] align-baseline"
          >
            <span className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-[12.5px] font-medium leading-none text-muted-foreground">
              {s.note}
            </span>
            <span className="border-b border-dotted border-[color:var(--color-primary)]/40">
              {s.text}
            </span>
          </span>
        );
      })}
    </span>
  );
}

// ─── Bubble ─────────────────────────────────────────────────────────
function Bubble({
  line,
  ja,
  active,
  showJa,
  patternQuote,
  wordNotes,
}: {
  line: string;
  ja?: string | null;
  active: boolean;
  showJa: boolean;
  patternQuote?: string | null;
  wordNotes?: WordNote[] | null;
}) {
  const isA = /^A:/i.test(line);
  const text = line.replace(/^[AB]:\s*/i, "");
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 transition-opacity duration-200",
        isA ? "flex-row" : "flex-row-reverse",
        active ? "opacity-100" : "opacity-55",
      )}
    >
      <span
        className={cn(
          "mt-1.5 h-8 w-8 shrink-0 rounded-full",
          isA
            ? "bg-[color:var(--color-primary)]"
            : "bg-[color:var(--color-warning)]",
          active && "ring-2 ring-offset-2 ring-offset-background",
          active &&
            (isA
              ? "ring-[color:var(--color-primary)]"
              : "ring-[color:var(--color-warning)]"),
        )}
      />
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2 text-[17px] text-foreground",
          isA ? "rounded-tl-sm" : "rounded-tr-sm",
          active
            ? cn(
                "font-medium",
                isA
                  ? "bg-[var(--color-primary)]/10"
                  : "bg-[var(--color-warning)]/10",
              )
            : "bg-muted",
        )}
      >
        <HighlightedLine
          text={text}
          patternQuote={patternQuote}
          wordNotes={wordNotes}
        />
        {showJa && ja && (
          <div className="mt-1.5 border-t border-border/60 pt-1.5 text-xs leading-relaxed text-muted-foreground">
            {ja}
          </div>
        )}
      </div>
    </div>
  );
}

export type RepeatingSessionProps = {
  kindLabel: string;
  eyebrow: string;
  title: string;
  summary?: string | null;
  importance: number;
  topicLabel?: string | null;
  topicIcon?: string | null;
  lines: string[];
  linesJa?: string[] | null;
  currentLine: number;
  wordNotes?: WordNote[] | null;
  patternQuote?: string | null;
  playCount: number;
  sessionCurrent: number;
  sessionTotal: number;
  speed: number;
  onSpeedChange: (v: number) => void;
  playing: boolean;
  onPlay: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
  onExit: () => void;
};

export function RepeatingSession({
  kindLabel,
  eyebrow,
  title,
  summary,
  importance,
  topicLabel,
  topicIcon,
  lines,
  linesJa,
  currentLine,
  wordNotes,
  patternQuote,
  playCount,
  sessionCurrent,
  sessionTotal,
  speed,
  onSpeedChange,
  playing,
  onPlay,
  onStop,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  onExit,
}: RepeatingSessionProps) {
  const [showJa, setShowJa] = useState(false);
  const hasJa = !!linesJa?.some(Boolean);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      {/* Header strip */}
      <header className="flex items-center gap-3 border-b border-border px-6 py-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {kindLabel}リピーティング
        </span>
        <div className="flex flex-1 items-center justify-center gap-2.5">
          <SessionProgress current={sessionCurrent} total={sessionTotal} />
          <span className="text-xs tabular-nums text-muted-foreground">
            <span className="font-bold text-foreground">{sessionCurrent}</span>
            {" / "}
            {sessionTotal} 件
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
          <CycleRing done={playCount} total={10} />
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {playCount}
            <span className="font-medium text-muted-foreground">/10回</span>
          </span>
        </span>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          終了
        </button>
      </header>

      {/* Stage — vertically centered, compact */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-4">
        {/* Pattern block — plain, no border */}
        <div className="max-w-[640px] text-center">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
              {title}
            </h1>
            <Stars value={importance} />
          </div>
          {summary && (
            <p className="mx-auto mt-2 max-w-[560px] text-xs leading-relaxed text-muted-foreground">
              {summary}
            </p>
          )}
        </div>

        {/* Topic chip — right by the conversation */}
        {topicLabel && <TopicChip label={topicLabel} icon={topicIcon ?? null} />}

        {/* Conversation — chat bubbles */}
        <div className="flex w-full max-w-[660px] flex-col gap-3">
          {lines.map((line, i) => (
            <Bubble
              key={i}
              line={line}
              ja={linesJa?.[i]}
              active={i === currentLine}
              showJa={showJa}
              patternQuote={patternQuote}
              wordNotes={wordNotes}
            />
          ))}
        </div>
      </div>

      {/* Player */}
      <div className="flex justify-center px-6 pb-6 pt-2">
        <div className="inline-flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2.5 shadow-[0_8px_28px_rgba(15,23,42,0.10)]">
          {/* Speed segmented */}
          <div className="inline-flex rounded-full bg-muted p-0.5">
            {SPEEDS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onSpeedChange(v)}
                className={cn(
                  "h-8 min-w-[46px] rounded-full px-2 text-xs font-bold tabular-nums transition-colors",
                  speed === v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v.toFixed(1)}×
              </button>
            ))}
          </div>

          <span className="h-7 w-px bg-border" />

          <button
            type="button"
            onClick={onPrev}
            disabled={prevDisabled}
            aria-label="前へ"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={playing ? onStop : onPlay}
            aria-label={playing ? "停止" : "再生"}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-primary)] text-white shadow-[0_6px_20px_rgba(0,82,204,0.35)] transition-transform active:scale-95"
          >
            {playing ? (
              <Square className="h-5 w-5 fill-current" />
            ) : (
              <Play className="ml-0.5 h-6 w-6 fill-current" />
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            aria-label="次へ"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {hasJa && (
            <>
              <span className="h-7 w-px bg-border" />
              <button
                type="button"
                onClick={() => setShowJa((v) => !v)}
                aria-pressed={showJa}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-xs font-bold transition-colors",
                  showJa
                    ? "border-[color:var(--color-primary)] bg-[var(--color-primary)]/8 text-[color:var(--color-primary)]"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Languages className="h-4 w-4" />
                日本語
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
