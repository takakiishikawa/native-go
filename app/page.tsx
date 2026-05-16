import { createClient } from "@/lib/supabase/server";
import { getCurrentLanguage } from "@/lib/language";
import Link from "next/link";
import { PageHeader, type ChartConfig } from "@takaki/go-design-system";
import { DashboardChart } from "@/components/dashboard-chart";
import {
  DashboardKpiSection,
  type DashboardKpi,
} from "@/components/dashboard-kpi-section";
import { StreakPopup } from "@/components/streak-popup";
import { ChevronRight, Repeat2, Play } from "lucide-react";

// ─── CTACard (inline, CTA向けカード) ────────────────────────────────────────

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
    <Link href={href}>
      <div className="group flex items-center gap-3 rounded-lg border border-[var(--color-border-default)] bg-card px-4 py-3 border border-border hover:border-[var(--color-border-strong)] hover:border border-border transition-all cursor-pointer">
        <span className="shrink-0 flex items-center justify-center rounded-md bg-[var(--color-surface-subtle)] p-2 text-muted-foreground">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{sub}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function fmtDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function ratioOf(
  value: number,
  baseline: number | undefined,
): number | null {
  if (!baseline || baseline <= 0) return null;
  return Math.round((value / baseline) * 100);
}

// ─── Chart configs ────────────────────────────────────────────────────────────

const repeatingConfig: ChartConfig = {
  grammar: { label: "文法", color: "var(--color-primary)" },
  expression: { label: "フレーズ", color: "var(--color-primary-chart-2)" },
  word: { label: "単語", color: "var(--color-primary-chart-3)" },
  total: { label: "合計", color: "var(--color-primary)" },
};
const shadowingConfig: ChartConfig = {
  minutes: { label: "視聴時間", color: "var(--color-primary)" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createClient();
  const currentLanguage = await getCurrentLanguage();

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const str = d.toISOString().split("T")[0];
    return { str, label: fmtDate(d) };
  });
  const rangeStartStr = days[0].str;

  const prev14Start = new Date(today);
  prev14Start.setDate(prev14Start.getDate() - 13);
  const prev14StartStr = prev14Start.toISOString().split("T")[0];

  const [
    logsResult,
    allRangeLogsResult,
    allYoutubeLogsResult,
    settingsResult,
  ] = await Promise.all([
    supabase
      .from("practice_logs")
      .select("practiced_at")
      .eq("language", currentLanguage),
    supabase
      .from("practice_logs")
      .select(
        "practiced_at, grammar_done_count, expression_done_count, word_done_count, speaking_count",
      )
      .eq("language", currentLanguage)
      .gte("practiced_at", prev14StartStr)
      .lte("practiced_at", todayStr)
      .order("practiced_at"),
    supabase
      .from("youtube_logs")
      .select("completed_at, youtube_videos(duration)")
      .eq("language", currentLanguage)
      .gte(
        "completed_at",
        new Date(new Date(prev14Start).setHours(0, 0, 0, 0)).toISOString(),
      )
      .lte(
        "completed_at",
        new Date(new Date(today).setHours(23, 59, 59, 999)).toISOString(),
      ),
    supabase.from("user_settings").select("*").maybeSingle(),
  ]);

  const allLogs = logsResult.data ?? [];

  type RangeLog = {
    practiced_at: string;
    grammar_done_count: number;
    expression_done_count: number;
    word_done_count: number;
    speaking_count: number;
  };

  let allRangeLogs: RangeLog[];
  if (allRangeLogsResult.error) {
    const { data: fallback } = await supabase
      .from("practice_logs")
      .select("practiced_at, grammar_done_count, expression_done_count")
      .eq("language", currentLanguage)
      .gte("practiced_at", prev14StartStr)
      .lte("practiced_at", todayStr)
      .order("practiced_at");
    allRangeLogs = (fallback ?? []).map((l) => ({
      ...l,
      word_done_count: 0,
      speaking_count: 0,
    }));
  } else {
    allRangeLogs = (allRangeLogsResult.data ?? []).map((l) => ({
      ...l,
      word_done_count: l.word_done_count ?? 0,
      speaking_count: l.speaking_count ?? 0,
    }));
  }

  const rangeLogs = allRangeLogs.filter((l) => l.practiced_at >= rangeStartStr);
  const prevRangeLogs = allRangeLogs.filter(
    (l) => l.practiced_at < rangeStartStr,
  );

  const streak = calculateStreak(allLogs.map((l) => l.practiced_at));

  const weeklyGrammar = rangeLogs.reduce((s, l) => s + l.grammar_done_count, 0);
  const weeklyExpression = rangeLogs.reduce(
    (s, l) => s + l.expression_done_count,
    0,
  );
  const weeklyWord = rangeLogs.reduce((s, l) => s + l.word_done_count, 0);
  const weeklyRepeating = weeklyGrammar + weeklyExpression + weeklyWord;

  const prevWeeklyGrammar = prevRangeLogs.reduce(
    (s, l) => s + l.grammar_done_count,
    0,
  );
  const prevWeeklyExpression = prevRangeLogs.reduce(
    (s, l) => s + l.expression_done_count,
    0,
  );
  const prevWeeklyWord = prevRangeLogs.reduce(
    (s, l) => s + l.word_done_count,
    0,
  );
  const prevWeeklyRepeating =
    prevWeeklyGrammar + prevWeeklyExpression + prevWeeklyWord;

  const hasPrevData = allRangeLogs.some((l) => l.practiced_at < rangeStartStr);
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
  const allYoutubeLogs = allYoutubeLogsResult.data ?? [];
  const ytByDate = new Map<string, number>();
  const prevYtByDate = new Map<string, number>();
  for (const yt of allYoutubeLogs) {
    const dateStr = yt.completed_at.slice(0, 10);
    const dur = (
      yt.youtube_videos as unknown as { duration: string | null } | null
    )?.duration;
    const min = parseDurToMin(dur);
    const target = dateStr >= rangeStartStr ? ytByDate : prevYtByDate;
    target.set(dateStr, (target.get(dateStr) ?? 0) + min);
  }
  const weeklyShadowing = [...ytByDate.values()].reduce((s, c) => s + c, 0);
  const prevWeeklyShadowing = [...prevYtByDate.values()].reduce(
    (s, c) => s + c,
    0,
  );
  const shadowingDiff = hasPrevData
    ? weeklyShadowing - prevWeeklyShadowing
    : null;

  const settings = settingsResult.data ?? null;

  const isEn = currentLanguage === "en";
  const kpiCards: DashboardKpi[] = [
    {
      title: "リピーティング",
      value: `${weeklyRepeating}回`,
      ratio: ratioOf(weeklyRepeating, settings?.baseline_repeating),
      weekDiff: repeatingDiff,
      diffUnit: "回",
    },
    {
      title: "シャドーイング",
      value: `${weeklyShadowing}分`,
      ratio: ratioOf(weeklyShadowing, settings?.baseline_shadowing),
      weekDiff: shadowingDiff,
      diffUnit: "分",
    },
  ];

  // Chart data (7 days)
  const logMap = new Map(rangeLogs.map((l) => [l.practiced_at, l]));

  const repeatingChartData = days.map(({ str, label }) => {
    const l = logMap.get(str);
    const grammar = l?.grammar_done_count ?? 0;
    const expression = l?.expression_done_count ?? 0;
    const word = l?.word_done_count ?? 0;
    return {
      label,
      grammar,
      expression,
      word,
      total: grammar + expression + word,
    };
  });
  const shadowingChartData = days.map(({ str, label }) => ({
    label,
    minutes: ytByDate.get(str) ?? 0,
  }));

  return (
    <div className="space-y-8 max-w-4xl">
      <StreakPopup streak={streak} />

      <div>
        <PageHeader title="ダッシュボード" />
      </div>

      {/* 今日の練習 */}
      <div>
        <h2 className="section-label">今日の練習</h2>
        <div className="grid grid-cols-2 gap-2">
          <CTACard
            href="/repeating"
            icon={<Repeat2 className="h-4 w-4" />}
            label="リピーティング"
            sub={isEn ? "文法・フレーズ" : "文法・フレーズ・単語"}
          />
          <CTACard
            href="/shadowing"
            icon={<Play className="h-4 w-4" />}
            label="シャドーイング"
            sub="YouTubeを見る"
          />
        </div>
      </div>

      {/* 今週のサマリー */}
      <div className="space-y-4">
        <h2 className="section-label">今週のサマリー</h2>
        <DashboardKpiSection cards={kpiCards} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DashboardChart
            title="リピーティング（7日間）"
            data={repeatingChartData}
            config={repeatingConfig}
            xKey="label"
            yKeys={
              isEn
                ? ["grammar", "expression"]
                : ["grammar", "expression", "word"]
            }
            lineKeys={["total"]}
            unit="回"
            baseline={
              settings ? Math.round(settings.baseline_repeating / 7) : undefined
            }
          />
          <DashboardChart
            title="シャドーイング（7日間）"
            data={shadowingChartData}
            config={shadowingConfig}
            xKey="label"
            yKeys={["minutes"]}
            unit="分"
            baseline={
              settings ? Math.round(settings.baseline_shadowing / 7) : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
