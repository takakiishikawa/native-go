import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@takaki/go-design-system";
import { ReportCharts } from "@/components/report-charts";
export default async function ReportPage() {
  const supabase = await createClient();

  const [logsResult, ncLogsResult, youtubeLogsResult] = await Promise.all([
    supabase
      .from("practice_logs")
      .select(
        "practiced_at, grammar_done_count, expression_done_count, speaking_count",
      )
      .order("practiced_at"),
    supabase
      .from("native_camp_logs")
      .select("logged_at, count, minutes")
      .order("logged_at"),
    supabase
      .from("youtube_logs")
      .select("completed_at, youtube_videos(duration)")
      .order("completed_at"),
  ]);

  const logs = (logsResult.data ?? []).map((l) => ({
    practiced_at: l.practiced_at,
    grammar_done_count: l.grammar_done_count ?? 0,
    expression_done_count: l.expression_done_count ?? 0,
    speaking_count: (l as { speaking_count?: number }).speaking_count ?? 0,
  }));

  const ncLogs = (ncLogsResult.data ?? []).map((l) => ({
    logged_at: l.logged_at,
    count: l.count ?? 0,
    minutes: l.minutes ?? (l.count ?? 0) * 25,
  }));

  const youtubeLogs = (youtubeLogsResult.data ?? []).map((l) => ({
    completed_at: l.completed_at,
    youtube_videos:
      (l.youtube_videos as unknown as { duration: string | null } | null) ??
      null,
  }));

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader title="レポート" description="学習データの集計・推移" />

      <ReportCharts logs={logs} ncLogs={ncLogs} youtubeLogs={youtubeLogs} />
    </div>
  );
}
