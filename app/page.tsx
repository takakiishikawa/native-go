import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  PageHeader,
  type KpiCard,
  type ChartConfig,
} from "@takaki/go-design-system";
import { DashboardChart } from "@/components/dashboard-chart";
import { DashboardKpiSection } from "@/components/dashboard-kpi-section";
import { DashboardAutoCheck } from "@/components/dashboard-auto-check";
import { SpeakingTestReminder } from "@/components/speaking-test-reminder";
import { StreakPopup } from "@/components/streak-popup";
import { ChevronRight, BookOpen, MessageSquare, Mic, Play } from "lucide-react";
import type { SpeakingScore } from "@/lib/types";

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
      <div className="group flex items-center gap-3 rounded-lg border border-[var(--color-border-default)] bg-card px-4 py-3 shadow-sm hover:border-[var(--color-border-strong)] hover:shadow-md transition-all cursor-pointer">
        <span className="shrink-0 flex items-center justify-center rounded-md bg-[var(--color-surface-subtle)] p-2 text-muted-foreground">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-medium text-foreground">{label}</p>
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

function trendFromDiff(diff: number | null, unit: string): KpiCard["trend"] {
  if (diff === null) return undefined;
  return {
    value: `前7日比 ${diff >= 0 ? "+" : ""}${diff}${unit}`,
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
  };
}

function weeklyDesc(
  value: number,
  baseline: number | undefined,
): string | undefined {
  if (!baseline || baseline <= 0) return undefined;
  return `${Math.round((value / baseline) * 100)}%`;
}

function weeklyProgress(
  value: number,
  baseline: number | undefined,
): number | undefined {
  if (!baseline || baseline <= 0) return undefined;
  return Math.round((value / baseline) * 100);
}

// ─── Chart configs ────────────────────────────────────────────────────────────

const repeatingConfig: ChartConfig = {
  grammar: { label: "文法", color: "var(--color-primary)" },
  expression: { label: "フレーズ", color: "var(--color-primary-chart-2)" },
  total: { label: "合計", color: "var(--color-primary)" },
};
const speakingConfig: ChartConfig = {
  count: { label: "練習回数", color: "var(--color-primary)" },
};
const ncConfig: ChartConfig = {
  minutes: { label: "学習時間", color: "var(--color-primary)" },
};
const shadowingConfig: ChartConfig = {
  minutes: { label: "視聴時間", color: "var(--color-primary)" },
};
const scoreConfig: ChartConfig = {
  score: { label: "スコア", color: "var(--color-primary)" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createClient();

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
    grammarResult,
    expressionsResult,
    allRangeLogsResult,
    scoresResult,
    allNcLogsResult,
    speakingLogsResult,
    allYoutubeLogsResult,
    settingsResult,
  ] = await Promise.all([
    supabase.from("practice_logs").select("practiced_at"),
    supabase.from("grammar").select("id, play_count, image_url"),
    supabase.from("expressions").select("play_count"),
    supabase
      .from("practice_logs")
      .select(
        "practiced_at, grammar_done_count, expression_done_count, speaking_count",
      )
      .gte("practiced_at", prev14StartStr)
      .lte("practiced_at", todayStr)
      .order("practiced_at"),
    supabase
      .from("speaking_scores")
      .select("id, user_id, score, tested_at, created_at")
      .order("tested_at"),
    supabase
      .from("native_camp_logs")
      .select("logged_at, count, minutes")
      .gte("logged_at", prev14StartStr)
      .lte("logged_at", todayStr),
    supabase.from("speaking_logs").select("grammar_id"),
    supabase
      .from("youtube_logs")
      .select("completed_at, youtube_videos(duration)")
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
  const grammars = grammarResult.data ?? [];
  const expressions = expressionsResult.data ?? [];

  type RangeLog = {
    practiced_at: string;
    grammar_done_count: number;
    expression_done_count: number;
    speaking_count: number;
  };

  let allRangeLogs: RangeLog[];
  if (allRangeLogsResult.error) {
    const { data: fallback } = await supabase
      .from("practice_logs")
      .select("practiced_at, grammar_done_count, expression_done_count")
      .gte("practiced_at", prev14StartStr)
      .lte("practiced_at", todayStr)
      .order("practiced_at");
    allRangeLogs = (fallback ?? []).map((l) => ({ ...l, speaking_count: 0 }));
  } else {
    allRangeLogs = (allRangeLogsResult.data ?? []).map((l) => ({
      ...l,
      speaking_count: l.speaking_count ?? 0,
    }));
  }

  const rangeLogs = allRangeLogs.filter((l) => l.practiced_at >= rangeStartStr);
  const prevRangeLogs = allRangeLogs.filter(
    (l) => l.practiced_at < rangeStartStr,
  );

  const scores = (scoresResult.data ?? []) as SpeakingScore[];

  const allNcLogs = allNcLogsResult.data ?? [];
  const ncByDate = new Map<string, number>();
  const prevNcByDate = new Map<string, number>();
  for (const nc of allNcLogs) {
    const target = nc.logged_at >= rangeStartStr ? ncByDate : prevNcByDate;
    target.set(nc.logged_at, (target.get(nc.logged_at) ?? 0) + (nc.count ?? 0));
  }

  const streak = calculateStreak(allLogs.map((l) => l.practiced_at));

  const grammarsInProgress = grammars.filter(
    (g) => g.play_count > 0 && g.play_count < 10,
  ).length;
  const grammarDone = grammars.filter((g) => g.play_count >= 10).length;
  const expressionsInProgress = expressions.filter(
    (e) => e.play_count > 0 && e.play_count < 10,
  ).length;
  const expressionDone = expressions.filter((e) => e.play_count >= 10).length;

  const speakingLogCounts = new Map<string, number>();
  for (const log of speakingLogsResult.data ?? []) {
    speakingLogCounts.set(
      log.grammar_id,
      (speakingLogCounts.get(log.grammar_id) ?? 0) + 1,
    );
  }
  const speakingInProgress = grammars.filter(
    (g) => g.image_url && (speakingLogCounts.get(g.id) ?? 0) < 3,
  ).length;
  const speakingDone = grammars.filter(
    (g) => g.image_url && (speakingLogCounts.get(g.id) ?? 0) >= 3,
  ).length;

  const weeklyGrammar = rangeLogs.reduce((s, l) => s + l.grammar_done_count, 0);
  const weeklyExpression = rangeLogs.reduce(
    (s, l) => s + l.expression_done_count,
    0,
  );
  const weeklyRepeating = weeklyGrammar + weeklyExpression;
  const weeklySpeaking = rangeLogs.reduce((s, l) => s + l.speaking_count, 0);
  const weeklyNativeCampCount = [...ncByDate.values()].reduce(
    (s, c) => s + c,
    0,
  );

  const prevWeeklyGrammar = prevRangeLogs.reduce(
    (s, l) => s + l.grammar_done_count,
    0,
  );
  const prevWeeklyExpression = prevRangeLogs.reduce(
    (s, l) => s + l.expression_done_count,
    0,
  );
  const prevWeeklyRepeating = prevWeeklyGrammar + prevWeeklyExpression;
  const prevWeeklySpeaking = prevRangeLogs.reduce(
    (s, l) => s + l.speaking_count,
    0,
  );
  const prevNativeCampCount = [...prevNcByDate.values()].reduce(
    (s, c) => s + c,
    0,
  );

  const hasPrevData =
    allRangeLogs.some((l) => l.practiced_at < rangeStartStr) ||
    allNcLogs.some((nc) => nc.logged_at < rangeStartStr);
  const repeatingDiff = hasPrevData
    ? weeklyRepeating - prevWeeklyRepeating
    : null;
  const speakingDiff = hasPrevData ? weeklySpeaking - prevWeeklySpeaking : null;
  const ncCountDiff = hasPrevData
    ? weeklyNativeCampCount - prevNativeCampCount
    : null;

  const sortedScores = [...scores].sort((a, b) =>
    b.tested_at.localeCompare(a.tested_at),
  );
  const latestScore = sortedScores.length > 0 ? sortedScores[0].score : null;
  const scoreDiff =
    sortedScores.length >= 2
      ? sortedScores[0].score - sortedScores[1].score
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
  const hasNativeCampToday = (ncByDate.get(todayStr) ?? 0) > 0;

  // KPI cards for SectionCards
  const kpiCards: KpiCard[] = [
    {
      title: "リピーティング",
      value: `${weeklyRepeating}回`,
      description: weeklyDesc(weeklyRepeating, settings?.baseline_repeating),
      progress: weeklyProgress(weeklyRepeating, settings?.baseline_repeating),
      trend: trendFromDiff(repeatingDiff, "回"),
    },
    {
      title: "スピーキング",
      value: `${weeklySpeaking}回`,
      description: weeklyDesc(weeklySpeaking, settings?.baseline_speaking),
      progress: weeklyProgress(weeklySpeaking, settings?.baseline_speaking),
      trend: trendFromDiff(speakingDiff, "回"),
    },
    {
      title: "Native Camp",
      value: `${weeklyNativeCampCount * 25}分`,
      description: weeklyDesc(
        weeklyNativeCampCount * 25,
        settings?.baseline_nativecamp,
      ),
      progress: weeklyProgress(
        weeklyNativeCampCount * 25,
        settings?.baseline_nativecamp,
      ),
      trend: trendFromDiff(
        ncCountDiff !== null ? ncCountDiff * 25 : null,
        "分",
      ),
    },
    {
      title: "シャドーイング",
      value: `${weeklyShadowing}分`,
      description: weeklyDesc(weeklyShadowing, settings?.baseline_shadowing),
      progress: weeklyProgress(weeklyShadowing, settings?.baseline_shadowing),
      trend: trendFromDiff(shadowingDiff, "分"),
    },
    {
      title: "NC AI Speaking Test",
      value: latestScore !== null ? `${latestScore}点` : "未記録",
      trend:
        scoreDiff !== null
          ? {
              value: `前回比 ${scoreDiff >= 0 ? "+" : ""}${scoreDiff}点`,
              direction:
                scoreDiff > 0 ? "up" : scoreDiff < 0 ? "down" : "neutral",
            }
          : undefined,
    },
  ];

  // Chart data (7 days)
  const logMap = new Map(rangeLogs.map((l) => [l.practiced_at, l]));

  const repeatingChartData = days.map(({ str, label }) => {
    const l = logMap.get(str);
    const grammar = l?.grammar_done_count ?? 0;
    const expression = l?.expression_done_count ?? 0;
    return { label, grammar, expression, total: grammar + expression };
  });
  const speakingChartData = days.map(({ str, label }) => {
    const l = logMap.get(str);
    return { label, count: l?.speaking_count ?? 0 };
  });
  const ncChartData = days.map(({ str, label }) => ({
    label,
    minutes: (ncByDate.get(str) ?? 0) * 25,
  }));
  const scoreChartData = [...scores]
    .sort((a, b) => a.tested_at.localeCompare(b.tested_at))
    .map((s) => {
      const d = new Date(s.tested_at);
      return { label: fmtDate(d), score: s.score };
    });
  const shadowingChartData = days.map(({ str, label }) => ({
    label,
    minutes: ytByDate.get(str) ?? 0,
  }));

  return (
    <div className="space-y-8 max-w-4xl">
      <StreakPopup streak={streak} />

      {settings?.speaking_test_day && (
        <SpeakingTestReminder
          testDay={settings.speaking_test_day}
          initialScores={scores}
        />
      )}

      <div>
        <PageHeader title="ダッシュボード" />
      </div>

      {/* 練習を始める */}
      <div>
        <h2 className="section-label">練習を始める</h2>
        <div className="grid grid-cols-2 gap-2">
          <CTACard
            href="/repeating/grammar"
            icon={<BookOpen className="h-4 w-4" />}
            label="文法リピーティング"
            sub={`練習中 ${grammarsInProgress} / 完了 ${grammarDone}`}
          />
          <CTACard
            href="/repeating/expression"
            icon={<MessageSquare className="h-4 w-4" />}
            label="フレーズリピーティング"
            sub={`練習中 ${expressionsInProgress} / 完了 ${expressionDone}`}
          />
          <CTACard
            href="/speaking"
            icon={<Mic className="h-4 w-4" />}
            label="スピーキング"
            sub={`練習中 ${speakingInProgress} / 完了 ${speakingDone}`}
          />
          <CTACard
            href="/shadowing"
            icon={<Play className="h-4 w-4" />}
            label="シャドーイング"
            sub="YouTubeで練習する"
          />
        </div>
      </div>

      {/* 学習ログ */}
      <div className="space-y-4">
        <h2 className="section-label">学習ログ</h2>
        <DashboardKpiSection cards={kpiCards} initialScores={scores} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DashboardChart
            title="リピーティング（7日間）"
            data={repeatingChartData}
            config={repeatingConfig}
            xKey="label"
            yKeys={["grammar", "expression"]}
            lineKeys={["total"]}
            unit="回"
            baseline={
              settings ? Math.round(settings.baseline_repeating / 7) : undefined
            }
          />
          <DashboardChart
            title="スピーキング（7日間）"
            data={speakingChartData}
            config={speakingConfig}
            xKey="label"
            yKeys={["count"]}
            unit="回"
            baseline={
              settings ? Math.round(settings.baseline_speaking / 7) : undefined
            }
          />
          <DashboardChart
            title="Native Camp（7日間）"
            data={ncChartData}
            config={ncConfig}
            xKey="label"
            yKeys={["minutes"]}
            unit="分"
            baseline={
              settings
                ? Math.round(settings.baseline_nativecamp / 7)
                : undefined
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
          <DashboardChart
            title="NC AI Speaking Test スコア"
            data={scoreChartData}
            config={scoreConfig}
            xKey="label"
            yKeys={["score"]}
            unit="点"
            yDomain={[0, 100]}
            emptyText="スコアを記録するとグラフが表示されます"
          />
        </div>
      </div>

      <DashboardAutoCheck hasNativeCampToday={hasNativeCampToday} />
    </div>
  );
}
