import { createClient } from "@/lib/supabase/server";
import { getCurrentLanguage } from "@/lib/language";
import Link from "next/link";
import {
  ActivityHeatmap,
  type HeatmapCell,
} from "@/components/activity-heatmap";
import { StreakPopup } from "@/components/streak-popup";
import { ChevronRight, Repeat2, Play } from "lucide-react";

// ─── CTACard（今日の練習に進むカード） ─────────────────────────────────────

function CTACard({
  href,
  icon,
  label,
  sub,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <Link href={href} className="group block">
      <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border-default)] bg-card p-4 transition-all hover:border-[var(--color-border-strong)] hover:shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-subtle)] text-foreground">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{sub}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

// ─── MetricCard（今週のサマリー） ───────────────────────────────────────────

function MetricCard({
  label,
  value,
  unit,
  ratio,
  weekDiff,
}: {
  label: string;
  value: number;
  unit: string;
  ratio: number | null;
  weekDiff: number | null;
}) {
  const reached = ratio != null && ratio >= 100;
  const diffColor =
    weekDiff == null || weekDiff === 0
      ? "text-muted-foreground"
      : weekDiff > 0
        ? "text-[#4d6b3a] dark:text-[#8fb574]"
        : "text-[#9a3a2a] dark:text-[#d98a78]";

  return (
    <div className="rounded-xl border border-[var(--color-border-default)] bg-card p-4">
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[32px] font-semibold leading-none tracking-[-0.035em] tabular-nums text-foreground">
          {value}
        </span>
        <span className="text-[13px] text-muted-foreground">{unit}</span>
        {weekDiff != null && (
          <span className={`ml-1.5 text-[12px] ${diffColor}`}>
            先週比 {weekDiff > 0 ? "+" : ""}
            {weekDiff}
          </span>
        )}
      </div>

      {ratio != null && (
        <div className="mt-4 flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-subtle)]">
            <div
              className={`h-full rounded-full ${
                reached ? "bg-[#4d6b3a] dark:bg-[#8fb574]" : "bg-foreground"
              }`}
              style={{ width: `${Math.min(ratio, 100)}%` }}
            />
          </div>
          <span className="text-[12px] font-semibold tabular-nums text-foreground">
            {ratio}%
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toStr = (d: Date): string => d.toISOString().split("T")[0];
const addDays = (d: Date, n: number): Date =>
  new Date(d.getTime() + n * 86400000);

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 0;
  let current = sorted[0] === today ? today : yesterday;
  for (const date of sorted) {
    if (date === current) {
      streak++;
      current = new Date(new Date(current).getTime() - 86400000)
        .toISOString()
        .split("T")[0];
    } else {
      break;
    }
  }
  return streak;
}

function longestStreak(dates: string[]): number {
  const sorted = [...new Set(dates)].sort();
  let best = 0;
  let current = 0;
  let prev = "";
  for (const date of sorted) {
    if (prev) {
      const diff =
        (new Date(date).getTime() - new Date(prev).getTime()) / 86400000;
      current = diff === 1 ? current + 1 : 1;
    } else {
      current = 1;
    }
    if (current > best) best = current;
    prev = date;
  }
  return best;
}

function ratioOf(value: number, baseline: number | undefined): number | null {
  if (!baseline || baseline <= 0) return null;
  return Math.round((value / baseline) * 100);
}

const MONTH_ABBR = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createClient();
  const currentLanguage = await getCurrentLanguage();

  const now = new Date();
  const todayStr = toStr(now);
  const todayUTC = new Date(todayStr + "T00:00:00Z");
  const weekday = todayUTC.getUTCDay(); // 0=Sun … 6=Sat

  const heatmapStart = addDays(todayUTC, -weekday - 77);
  const heatmapStartStr = toStr(heatmapStart);
  const rangeStartStr = toStr(addDays(todayUTC, -6));
  const prev7StartStr = toStr(addDays(todayUTC, -13));

  const [allDatesResult, rangeLogsResult, youtubeLogsResult, settingsResult] =
    await Promise.all([
      supabase
        .from("practice_logs")
        .select("practiced_at")
        .eq("language", currentLanguage),
      supabase
        .from("practice_logs")
        .select(
          "practiced_at, grammar_done_count, expression_done_count, word_done_count",
        )
        .eq("language", currentLanguage)
        .gte("practiced_at", heatmapStartStr)
        .lte("practiced_at", todayStr)
        .order("practiced_at"),
      supabase
        .from("youtube_logs")
        .select("completed_at, youtube_videos(duration)")
        .eq("language", currentLanguage)
        .gte(
          "completed_at",
          new Date(heatmapStartStr + "T00:00:00").toISOString(),
        )
        .lte("completed_at", new Date(todayStr + "T23:59:59").toISOString()),
      supabase.from("user_settings").select("*").maybeSingle(),
    ]);

  type RangeLog = {
    practiced_at: string;
    grammar_done_count: number;
    expression_done_count: number;
    word_done_count: number;
  };

  let rangeLogs: RangeLog[];
  if (rangeLogsResult.error) {
    const { data: fallback } = await supabase
      .from("practice_logs")
      .select("practiced_at, grammar_done_count, expression_done_count")
      .eq("language", currentLanguage)
      .gte("practiced_at", heatmapStartStr)
      .lte("practiced_at", todayStr)
      .order("practiced_at");
    rangeLogs = (fallback ?? []).map((l) => ({
      practiced_at: l.practiced_at,
      grammar_done_count: l.grammar_done_count ?? 0,
      expression_done_count: l.expression_done_count ?? 0,
      word_done_count: 0,
    }));
  } else {
    rangeLogs = (rangeLogsResult.data ?? []).map((l) => ({
      practiced_at: l.practiced_at,
      grammar_done_count: l.grammar_done_count ?? 0,
      expression_done_count: l.expression_done_count ?? 0,
      word_done_count: l.word_done_count ?? 0,
    }));
  }

  const allDates = (allDatesResult.data ?? []).map((l) => l.practiced_at);
  const streak = calculateStreak(allDates);
  const longest = Math.max(longestStreak(allDates), streak);

  const dayTotal = (l: RangeLog) =>
    l.grammar_done_count + l.expression_done_count + l.word_done_count;

  const weeklyRepeating = rangeLogs
    .filter((l) => l.practiced_at >= rangeStartStr)
    .reduce((s, l) => s + dayTotal(l), 0);
  const prevWeeklyRepeating = rangeLogs
    .filter(
      (l) => l.practiced_at >= prev7StartStr && l.practiced_at < rangeStartStr,
    )
    .reduce((s, l) => s + dayTotal(l), 0);
  const hasPrevData = rangeLogs.some((l) => l.practiced_at < rangeStartStr);
  const repeatingDiff = hasPrevData
    ? weeklyRepeating - prevWeeklyRepeating
    : null;

  function parseDurToMin(dur: string | null | undefined): number {
    if (!dur) return 0;
    const parts = dur.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 60 + parts[1];
    if (parts.length === 2) return parts[0];
    return 0;
  }
  let weeklyShadowing = 0;
  let prevWeeklyShadowing = 0;
  const shadowingByDate = new Map<string, number>();
  for (const yt of youtubeLogsResult.data ?? []) {
    const dateStr = yt.completed_at.slice(0, 10);
    const min = parseDurToMin(
      (yt.youtube_videos as unknown as { duration: string | null } | null)
        ?.duration,
    );
    shadowingByDate.set(dateStr, (shadowingByDate.get(dateStr) ?? 0) + min);
    if (dateStr >= rangeStartStr) weeklyShadowing += min;
    else if (dateStr >= prev7StartStr) prevWeeklyShadowing += min;
  }
  const shadowingDiff = hasPrevData
    ? weeklyShadowing - prevWeeklyShadowing
    : null;

  const settings = settingsResult.data ?? null;
  const isEn = currentLanguage === "en";

  // ── 12週間ヒートマップ ──
  const countByDate = new Map<string, number>();
  for (const l of rangeLogs) {
    countByDate.set(l.practiced_at, dayTotal(l));
  }
  const heatmapCells: HeatmapCell[] = [];
  for (let col = 0; col < 12; col++) {
    const colStart = addDays(todayUTC, -weekday - (11 - col) * 7);
    for (let row = 0; row < 7; row++) {
      const cellStr = toStr(addDays(colStart, row));
      heatmapCells.push({
        date: cellStr,
        repeating: countByDate.get(cellStr) ?? 0,
        shadowing: shadowingByDate.get(cellStr) ?? 0,
        future: cellStr > todayStr,
      });
    }
  }
  const monthLabels: string[] = [];
  let lastMonth = -1;
  for (let col = 0; col < 12; col++) {
    const m = addDays(todayUTC, -weekday - (11 - col) * 7).getUTCMonth();
    if (m !== lastMonth) {
      monthLabels.push(MONTH_ABBR[m]);
      lastMonth = m;
    }
  }

  const dateLabel = new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(now);

  return (
    <div className="w-full max-w-3xl">
      <StreakPopup streak={streak} />

      <header className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">
          ダッシュボード
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{dateLabel}</p>
      </header>

      <div className="space-y-4">
        {/* 練習への導線 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <CTACard
            href="/repeating"
            icon={<Repeat2 className="h-5 w-5" />}
            label="リピーティング"
            sub={isEn ? "文法・フレーズ" : "文法・フレーズ・単語"}
          />
          <CTACard
            href="/shadowing"
            icon={<Play className="h-5 w-5" />}
            label="シャドーイング"
            sub="YouTubeを見る"
          />
        </div>

        {/* 今週の数字 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard
            label="今週のリピーティング"
            value={weeklyRepeating}
            unit="回"
            ratio={ratioOf(weeklyRepeating, settings?.baseline_repeating)}
            weekDiff={repeatingDiff}
          />
          <MetricCard
            label="今週のシャドーイング"
            value={weeklyShadowing}
            unit="分"
            ratio={ratioOf(weeklyShadowing, settings?.baseline_shadowing)}
            weekDiff={shadowingDiff}
          />
        </div>

        {/* アクティビティ */}
        <ActivityHeatmap
          cells={heatmapCells}
          monthLabels={monthLabels}
          streak={streak}
          longest={longest}
        />
      </div>
    </div>
  );
}
