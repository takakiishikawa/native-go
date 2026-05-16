"use client";

import { cn } from "@takaki/go-design-system";
import type { WordNote } from "@/lib/types";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  Star,
  X,
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

// 卒業まで 10 回。残りを小さなリングで示す。
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

function Bubble({
  line,
  active,
}: {
  line: string;
  active: boolean;
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
          "mt-1 h-8 w-8 shrink-0 rounded-full",
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
          "max-w-[78%] rounded-2xl px-4 py-2.5 text-[17px] leading-relaxed text-foreground",
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
        {text}
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
  currentLine: number;
  wordNotes?: WordNote[] | null;
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
  currentLine,
  wordNotes,
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
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header strip */}
      <header className="flex items-center gap-3 border-b border-border pb-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {kindLabel}リピーティング
        </span>
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="h-1.5 w-32 max-w-[40%] overflow-hidden rounded-full bg-border">
            <span
              className="block h-full rounded-full bg-[color:var(--color-primary)]"
              style={{
                width: `${(sessionCurrent / Math.max(1, sessionTotal)) * 100}%`,
              }}
            />
          </span>
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
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-4">
        {/* Pattern block — plain white, no border */}
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

        {/* Topic chip — sits right by the conversation */}
        {topicLabel && <TopicChip label={topicLabel} icon={topicIcon ?? null} />}

        {/* Conversation — chat bubbles */}
        <div className="flex w-full max-w-[640px] flex-col gap-3">
          {lines.map((line, i) => (
            <Bubble key={i} line={line} active={i === currentLine} />
          ))}
        </div>

        {/* Word Wise — always on, slightly larger text */}
        {wordNotes && wordNotes.length > 0 && (
          <div className="flex w-full max-w-[640px] flex-wrap justify-center gap-1.5">
            {wordNotes.map((n, i) => (
              <span
                key={i}
                className="inline-flex items-baseline gap-1.5 rounded-md bg-muted px-2 py-1"
              >
                <span className="text-sm font-semibold text-foreground">
                  {n.word}
                </span>
                <span className="text-sm text-muted-foreground">{n.note}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Player */}
      <div className="flex justify-center pt-2">
        <div className="inline-flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2.5 shadow-[0_8px_28px_rgba(15,23,42,0.10)]">
          {/* Speed segmented */}
          <div className="inline-flex rounded-full bg-muted p-0.5">
            {SPEEDS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onSpeedChange(v)}
                className={cn(
                  "h-8 min-w-[48px] rounded-full px-2 text-xs font-bold tabular-nums transition-colors",
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
        </div>
      </div>
    </div>
  );
}
