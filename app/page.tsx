import { createClient } from "@/lib/supabase/server"
import { CTASection } from "@/components/cta-section"
import { MetricsSection } from "@/components/metrics-section"
import { LineChart, type LineChartPoint } from "@/components/line-chart"
import { DashboardAutoCheck } from "@/components/dashboard-auto-check"
import { SpeakingTestReminder } from "@/components/speaking-test-reminder"
import { StreakPopup } from "@/components/streak-popup"
import { COLORS } from "@/lib/colors"
import type { SpeakingScore } from "@/lib/types"

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0
  const sorted = [...new Set(dates)].sort((a, b) => b.localeCompare(a))
  const today = new Date().toISOString().split("T")[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0
  let streak = 0
  let current = sorted[0] === today ? today : yesterday
  for (const date of sorted) {
    if (date === current) {
      streak++
      current = new Date(new Date(current).getTime() - 86400000).toISOString().split("T")[0]
    } else {
      break
    }
  }
  return streak
}

function fmtDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default async function HomePage() {
  const supabase = await createClient()

  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]

  // Current 7-day window: [today-6 … today]
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const str = d.toISOString().split("T")[0]
    return { str, label: fmtDate(d) }
  })
  const rangeStartStr = days[0].str // today − 6

  // Previous 7-day window start: today − 13
  const prev14Start = new Date(today)
  prev14Start.setDate(prev14Start.getDate() - 13)
  const prev14StartStr = prev14Start.toISOString().split("T")[0]

  const [logsResult, grammarResult, expressionsResult, allRangeLogsResult, scoresResult, allNcLogsResult, speakingLogsResult, allYoutubeLogsResult, settingsResult] =
    await Promise.all([
      supabase.from("practice_logs").select("practiced_at"),
      supabase.from("grammar").select("id, play_count, image_url"),
      supabase.from("expressions").select("play_count"),
      supabase
        .from("practice_logs")
        .select("practiced_at, grammar_done_count, expression_done_count, speaking_count")
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
        .gte("completed_at", new Date(new Date(prev14Start).setHours(0, 0, 0, 0)).toISOString())
        .lte("completed_at", new Date(new Date(today).setHours(23, 59, 59, 999)).toISOString()),
      supabase.from("user_settings").select("*").maybeSingle(),
    ])

  const allLogs = logsResult.data ?? []
  const grammars = grammarResult.data ?? []
  const expressions = expressionsResult.data ?? []

  type RangeLog = {
    practiced_at: string
    grammar_done_count: number
    expression_done_count: number
    speaking_count: number
  }

  let allRangeLogs: RangeLog[]
  if (allRangeLogsResult.error) {
    const { data: fallback } = await supabase
      .from("practice_logs")
      .select("practiced_at, grammar_done_count, expression_done_count")
      .gte("practiced_at", prev14StartStr)
      .lte("practiced_at", todayStr)
      .order("practiced_at")
    allRangeLogs = (fallback ?? []).map((l) => ({ ...l, speaking_count: 0 }))
  } else {
    allRangeLogs = (allRangeLogsResult.data ?? []).map((l) => ({
      ...l,
      speaking_count: l.speaking_count ?? 0,
    }))
  }

  // Split into current 7 days and previous 7 days
  const rangeLogs = allRangeLogs.filter((l) => l.practiced_at >= rangeStartStr)
  const prevRangeLogs = allRangeLogs.filter((l) => l.practiced_at < rangeStartStr)

  const scores = (scoresResult.data ?? []) as SpeakingScore[]

  // NC logs: split into curr / prev 7 days
  const allNcLogs = allNcLogsResult.data ?? []
  const ncByDate = new Map<string, number>()
  const prevNcByDate = new Map<string, number>()
  for (const nc of allNcLogs) {
    const target = nc.logged_at >= rangeStartStr ? ncByDate : prevNcByDate
    target.set(nc.logged_at, (target.get(nc.logged_at) ?? 0) + (nc.count ?? 0))
  }

  // Streak
  const streak = calculateStreak(allLogs.map((l) => l.practiced_at))

  // Grammar / expression progress counts
  const grammarsInProgress = grammars.filter((g) => g.play_count > 0 && g.play_count < 10).length
  const grammarDone = grammars.filter((g) => g.play_count >= 10).length
  const expressionsInProgress = expressions.filter((e) => e.play_count > 0 && e.play_count < 10).length
  const expressionDone = expressions.filter((e) => e.play_count >= 10).length

  // Speaking progress: count speaking_logs per grammar (RLS filters to current user)
  const speakingLogCounts = new Map<string, number>()
  for (const log of speakingLogsResult.data ?? []) {
    speakingLogCounts.set(log.grammar_id, (speakingLogCounts.get(log.grammar_id) ?? 0) + 1)
  }
  const speakingInProgress = grammars.filter((g) => g.image_url && (speakingLogCounts.get(g.id) ?? 0) < 3).length
  const speakingDone = grammars.filter((g) => g.image_url && (speakingLogCounts.get(g.id) ?? 0) >= 3).length

  // Current 7-day metrics
  const weeklyGrammar = rangeLogs.reduce((s, l) => s + l.grammar_done_count, 0)
  const weeklyExpression = rangeLogs.reduce((s, l) => s + l.expression_done_count, 0)
  const weeklyRepeating = weeklyGrammar + weeklyExpression
  const weeklySpeaking = rangeLogs.reduce((s, l) => s + l.speaking_count, 0)
  const weeklyNativeCampCount = [...ncByDate.values()].reduce((s, c) => s + c, 0)

  // Previous 7-day metrics
  const prevWeeklyGrammar = prevRangeLogs.reduce((s, l) => s + l.grammar_done_count, 0)
  const prevWeeklyExpression = prevRangeLogs.reduce((s, l) => s + l.expression_done_count, 0)
  const prevWeeklyRepeating = prevWeeklyGrammar + prevWeeklyExpression
  const prevWeeklySpeaking = prevRangeLogs.reduce((s, l) => s + l.speaking_count, 0)
  const prevNativeCampCount = [...prevNcByDate.values()].reduce((s, c) => s + c, 0)

  // Diffs (null if no prior data at all)
  const hasPrevData = allRangeLogs.some((l) => l.practiced_at < rangeStartStr) ||
    allNcLogs.some((nc) => nc.logged_at < rangeStartStr)
  const repeatingDiff = hasPrevData ? weeklyRepeating - prevWeeklyRepeating : null
  const speakingDiff  = hasPrevData ? weeklySpeaking  - prevWeeklySpeaking  : null
  const ncCountDiff   = hasPrevData ? weeklyNativeCampCount - prevNativeCampCount : null

  // Speaking score metrics
  const sortedScores = [...scores].sort((a, b) => b.tested_at.localeCompare(a.tested_at))
  const latestScore = sortedScores.length > 0 ? sortedScores[0].score : null
  const scoreDiff = sortedScores.length >= 2 ? sortedScores[0].score - sortedScores[1].score : null

  // Youtube logs: split into curr / prev 7 days (sum minutes)
  function parseDurToMin(dur: string | null | undefined): number {
    if (!dur) return 0
    const parts = dur.split(":").map(Number)
    if (parts.length === 3) return parts[0] * 60 + parts[1]
    if (parts.length === 2) return parts[0]
    return 0
  }
  const allYoutubeLogs = allYoutubeLogsResult.data ?? []
  const ytByDate = new Map<string, number>()
  const prevYtByDate = new Map<string, number>()
  for (const yt of allYoutubeLogs) {
    const dateStr = yt.completed_at.slice(0, 10)
    const dur = (yt.youtube_videos as unknown as { duration: string | null } | null)?.duration
    const min = parseDurToMin(dur)
    const target = dateStr >= rangeStartStr ? ytByDate : prevYtByDate
    target.set(dateStr, (target.get(dateStr) ?? 0) + min)
  }
  const weeklyShadowing = [...ytByDate.values()].reduce((s, c) => s + c, 0)
  const prevWeeklyShadowing = [...prevYtByDate.values()].reduce((s, c) => s + c, 0)
  const shadowingDiff = hasPrevData ? weeklyShadowing - prevWeeklyShadowing : null

  // User settings
  const settings = settingsResult.data ?? null

  // Today's native camp check for auto-modal
  const hasNativeCampToday = (ncByDate.get(todayStr) ?? 0) > 0

  // Charts (7 days)
  const logMap = new Map(rangeLogs.map((l) => [l.practiced_at, l]))

  const repeatingChartData: LineChartPoint[] = days.map(({ str, label }) => {
    const l = logMap.get(str)
    return { label, grammar: l?.grammar_done_count ?? 0, expression: l?.expression_done_count ?? 0 }
  })

  const speakingChartData: LineChartPoint[] = days.map(({ str, label }) => {
    const l = logMap.get(str)
    return { label, count: l?.speaking_count ?? 0 }
  })

  const ncChartData: LineChartPoint[] = days.map(({ str, label }) => ({
    label,
    minutes: (ncByDate.get(str) ?? 0) * 25,
  }))

  const scoreChartData: LineChartPoint[] = [...scores]
    .sort((a, b) => a.tested_at.localeCompare(b.tested_at))
    .map((s) => { const d = new Date(s.tested_at); return { label: fmtDate(d), score: s.score } })

  const shadowingChartData: LineChartPoint[] = days.map(({ str, label }) => ({
    label,
    minutes: ytByDate.get(str) ?? 0,
  }))

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
        <h1 className="text-[25px] font-medium">ダッシュボード</h1>
        <p className="text-sm text-muted-foreground mt-1">学習進捗のまとめ</p>
      </div>

      {/* 練習を始める */}
      <div>
        <h2 className="section-label">練習を始める</h2>
        <CTASection
          grammarsInProgress={grammarsInProgress}
          expressionsInProgress={expressionsInProgress}
          grammarDone={grammarDone}
          expressionDone={expressionDone}
          speakingInProgress={speakingInProgress}
          speakingDone={speakingDone}
        />
      </div>

      {/* 学習ログ */}
      <div className="space-y-4">
        <h2 className="section-label">学習ログ</h2>
        <MetricsSection
          weeklyRepeating={weeklyRepeating}
          weeklyGrammar={weeklyGrammar}
          weeklyExpression={weeklyExpression}
          weeklySpeaking={weeklySpeaking}
          weeklyNativeCampCount={weeklyNativeCampCount}
          weeklyShadowing={weeklyShadowing}
          repeatingDiff={repeatingDiff}
          speakingDiff={speakingDiff}
          ncCountDiff={ncCountDiff}
          shadowingDiff={shadowingDiff}
          latestScore={latestScore}
          scoreDiff={scoreDiff}
          initialScores={scores}
          settings={settings ?? undefined}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LineChart
            title="リピーティング（7日間）"
            series={[
              { key: "grammar",    label: "文法",     color: COLORS.grammar.main },
              { key: "expression", label: "フレーズ", color: COLORS.phrase.main },
            ]}
            data={repeatingChartData}
            unit="回"
          />
          <LineChart
            title="スピーキング（7日間）"
            series={[{ key: "count", label: "練習回数", color: COLORS.speaking.main }]}
            data={speakingChartData}
            unit="回"
          />
          <LineChart
            title="Native Camp（7日間）"
            series={[{ key: "minutes", label: "学習時間", color: COLORS.grammar.main }]}
            data={ncChartData}
            unit="分"
          />
          <LineChart
            title="シャドーイング（7日間）"
            series={[{ key: "minutes", label: "視聴時間", color: COLORS.shadowing.main }]}
            data={shadowingChartData}
            unit="分"
          />
          <LineChart
            title="NC AI Speaking Test スコア"
            series={[{ key: "score", label: "スコア", color: COLORS.speaking.main }]}
            data={scoreChartData}
            unit="点"
            emptyText="スコアを記録するとグラフが表示されます"
          />
        </div>
      </div>

      <DashboardAutoCheck hasNativeCampToday={hasNativeCampToday} />
    </div>
  )
}
