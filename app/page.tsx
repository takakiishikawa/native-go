import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Flame, CalendarDays, BookOpen, MessageSquare, ChevronRight } from "lucide-react"
import { PracticeChart } from "@/components/practice-chart"

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
      current = new Date(new Date(current).getTime() - 86400000)
        .toISOString()
        .split("T")[0]
    } else {
      break
    }
  }
  return streak
}


export default async function HomePage() {
  const supabase = await createClient()

  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 13 + i)
    return d.toISOString().split("T")[0]
  })

  const [logsResult, grammarResult, expressionsResult, logsChartResult] =
    await Promise.all([
      supabase.from("practice_logs").select("practiced_at"),
      supabase.from("grammar").select("play_count"),
      supabase.from("expressions").select("play_count"),
      supabase
        .from("practice_logs")
        .select("practiced_at, grammar_done_count, expression_done_count")
        .in("practiced_at", last14Days)
        .order("practiced_at"),
    ])

  const logs = logsResult.data ?? []
  const grammars = grammarResult.data ?? []
  const expressions = expressionsResult.data ?? []

  const streak = calculateStreak(logs.map((l) => l.practiced_at))
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthlyDays = logs.filter((l) =>
    l.practiced_at.startsWith(thisMonth)
  ).length
  const grammarDone = grammars.filter((g) => g.play_count >= 10).length
  const expressionDone = expressions.filter((e) => e.play_count >= 10).length

  const logMap = new Map(
    (logsChartResult.data ?? []).map((l) => [l.practiced_at, l])
  )
  const chartData = last14Days.map((date) => {
    const log = logMap.get(date)
    return {
      date,
      grammar: log?.grammar_done_count ?? 0,
      expression: log?.expression_done_count ?? 0,
    }
  })

  const metrics = [
    {
      title: "連続練習日数",
      value: streak,
      unit: "日",
      icon: Flame,
      color: "text-neutral-500",
      bg: "bg-neutral-100",
    },
    {
      title: "今月の練習日数",
      value: monthlyDays,
      unit: "日",
      icon: CalendarDays,
      color: "text-neutral-500",
      bg: "bg-neutral-100",
    },
    {
      title: "文法 Done",
      value: grammarDone,
      unit: "件",
      icon: BookOpen,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "フレーズ Done",
      value: expressionDone,
      unit: "件",
      icon: MessageSquare,
      color: "text-[#10B981]",
      bg: "bg-[#ECFDF5]",
    },
  ]

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">ホーム</h1>
        <p className="text-muted-foreground mt-1">学習進捗の概要</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map(({ title, value, unit, icon: Icon, color, bg }) => (
          <Card key={title} className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{value}</span>
                <span className="text-base text-muted-foreground">{unit}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Practice Shortcuts */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          練習を始める
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/repeating/grammar">
            <Card className="cursor-pointer border-2 border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition-all group">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-blue-100 p-2.5 group-hover:bg-blue-200 transition-colors">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-base text-blue-900">文法練習</p>
                  <p className="text-sm text-blue-600/70">
                    {grammars.filter((g) => g.play_count < 10).length} 件 練習中
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-blue-400 ml-auto group-hover:text-blue-600 transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/repeating/expression">
            <Card className="cursor-pointer border-2 border-green-200 bg-green-50/40 hover:border-green-400 hover:bg-green-50 hover:shadow-md transition-all group">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-green-100 p-2.5 group-hover:bg-green-200 transition-colors">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-base text-green-900">フレーズ練習</p>
                  <p className="text-sm text-green-600/70">
                    {expressions.filter((e) => e.play_count < 10).length} 件 練習中
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-green-400 ml-auto group-hover:text-green-600 transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <PracticeChart data={chartData} />
    </div>
  )
}
