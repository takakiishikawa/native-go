import { createClient } from "@/lib/supabase/server"
import { ReportCharts } from "@/components/report-charts"
import type { SpeakingScore } from "@/lib/types"

export default async function ReportPage() {
  const supabase = await createClient()

  const [logsResult, scoresResult] = await Promise.all([
    supabase
      .from("practice_logs")
      .select("practiced_at, grammar_done_count, expression_done_count, speaking_count, native_camp_count")
      .order("practiced_at"),
    supabase
      .from("speaking_scores")
      .select("id, user_id, score, tested_at, created_at")
      .order("tested_at"),
  ])

  const rawLogs = logsResult.data ?? []
  const logs = rawLogs.map((l) => ({
    practiced_at: l.practiced_at,
    grammar_done_count: l.grammar_done_count ?? 0,
    expression_done_count: l.expression_done_count ?? 0,
    speaking_count: (l as { speaking_count?: number }).speaking_count ?? 0,
    native_camp_count: (l as { native_camp_count?: number }).native_camp_count ?? 0,
  }))
  const scores = (scoresResult.data ?? []) as SpeakingScore[]

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">レポート</h1>
        <p className="text-muted-foreground mt-1">学習データの集計・推移</p>
      </div>

      <ReportCharts logs={logs} scores={scores} />
    </div>
  )
}
