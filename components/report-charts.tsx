"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { LineChart, type LineChartPoint, type LineChartSeries } from "@/components/line-chart"
import { COLORS } from "@/lib/colors"

type PracticeLog = {
  practiced_at: string
  grammar_done_count: number
  expression_done_count: number
  speaking_count: number
}

type NcLog = {
  logged_at: string
  count: number
  minutes: number
}

type YoutubeLog = {
  completed_at: string
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-")
  return `${y}/${m}`
}

function fmtDate(str: string): string {
  const [, m, d] = str.split("-")
  return `${m}/${d}`
}

function buildShadowingData(youtubeLogs: YoutubeLog[], mode: "monthly" | "alltime"): LineChartPoint[] {
  if (mode === "monthly") {
    const map = new Map<string, number>()
    for (const l of youtubeLogs) {
      const ym = l.completed_at.slice(0, 7)
      map.set(ym, (map.get(ym) ?? 0) + 1)
    }
    const months = [...map.keys()].sort()
    return months.map((ym) => ({ label: fmtMonth(ym), count: map.get(ym) ?? 0 }))
  } else {
    const map = new Map<string, number>()
    for (const l of youtubeLogs) {
      const d = l.completed_at.slice(0, 10)
      map.set(d, (map.get(d) ?? 0) + 1)
    }
    const days = [...map.keys()].sort()
    return days.map((d) => ({ label: fmtDate(d), count: map.get(d) ?? 0 }))
  }
}

function buildMonthlyData(logs: PracticeLog[], ncLogs: NcLog[]): {
  repeating: LineChartPoint[]
  speaking: LineChartPoint[]
  nativeCamp: LineChartPoint[]
} {
  const rMap = new Map<string, { grammar: number; expression: number; speaking: number }>()
  for (const l of logs) {
    const ym = l.practiced_at.slice(0, 7)
    const e = rMap.get(ym) ?? { grammar: 0, expression: 0, speaking: 0 }
    rMap.set(ym, {
      grammar: e.grammar + l.grammar_done_count,
      expression: e.expression + l.expression_done_count,
      speaking: e.speaking + l.speaking_count,
    })
  }

  const ncMap = new Map<string, number>()
  for (const nc of ncLogs) {
    const ym = nc.logged_at.slice(0, 7)
    ncMap.set(ym, (ncMap.get(ym) ?? 0) + nc.minutes)
  }

  const allMonths = [...new Set([...rMap.keys(), ...ncMap.keys()])].sort()

  return {
    repeating: allMonths.map((ym) => ({
      label: fmtMonth(ym),
      grammar: rMap.get(ym)?.grammar ?? 0,
      expression: rMap.get(ym)?.expression ?? 0,
    })),
    speaking: allMonths.map((ym) => ({
      label: fmtMonth(ym),
      speaking: rMap.get(ym)?.speaking ?? 0,
    })),
    nativeCamp: allMonths.map((ym) => ({
      label: fmtMonth(ym),
      minutes: ncMap.get(ym) ?? 0,
    })),
  }
}

// 全期間: 日次の実績値をそのまま表示。legend の合計 = 全期間の総合計になる
function buildAllTimeData(logs: PracticeLog[], ncLogs: NcLog[]): {
  repeating: LineChartPoint[]
  speaking: LineChartPoint[]
  nativeCamp: LineChartPoint[]
} {
  const sorted = [...logs].sort((a, b) => a.practiced_at.localeCompare(b.practiced_at))

  const ncDayMap = new Map<string, number>()
  for (const nc of ncLogs) {
    ncDayMap.set(nc.logged_at, (ncDayMap.get(nc.logged_at) ?? 0) + nc.minutes)
  }
  const sortedNcDays = [...ncDayMap.keys()].sort()

  return {
    repeating: sorted.map((l) => ({
      label: fmtDate(l.practiced_at),
      grammar: l.grammar_done_count,
      expression: l.expression_done_count,
    })),
    speaking: sorted.map((l) => ({
      label: fmtDate(l.practiced_at),
      speaking: l.speaking_count,
    })),
    nativeCamp: sortedNcDays.map((d) => ({
      label: fmtDate(d),
      minutes: ncDayMap.get(d)!,
    })),
  }
}

const repeatingSeries: LineChartSeries[] = [
  { key: "grammar",    label: "文法",     color: COLORS.grammar.main },
  { key: "expression", label: "フレーズ", color: COLORS.phrase.main },
]
const speakingSeries: LineChartSeries[] = [
  { key: "speaking", label: "スピーキング", color: COLORS.speaking.main },
]
const ncSeries: LineChartSeries[] = [
  { key: "minutes", label: "学習時間", color: COLORS.grammar.main },
]
const shadowingSeries: LineChartSeries[] = [
  { key: "count", label: "完了本数", color: COLORS.shadowing.main },
]

export function ReportCharts({
  logs,
  ncLogs,
  youtubeLogs,
}: {
  logs: PracticeLog[]
  ncLogs: NcLog[]
  youtubeLogs: YoutubeLog[]
}) {
  const [mode, setMode] = useState<"monthly" | "alltime">("monthly")

  const monthly = buildMonthlyData(logs, ncLogs)
  const alltime = buildAllTimeData(logs, ncLogs)
  const data = mode === "monthly" ? monthly : alltime
  const shadowingData = buildShadowingData(youtubeLogs, mode)

  return (
    <Tabs value={mode} onValueChange={(v) => setMode(v as "monthly" | "alltime")}>
      <TabsList>
        <TabsTrigger value="monthly">月次</TabsTrigger>
        <TabsTrigger value="alltime">全期間</TabsTrigger>
      </TabsList>

      <TabsContent value={mode} className="space-y-4 mt-4">
        <LineChart
          title="リピーティング"
          series={repeatingSeries}
          data={data.repeating}
          unit="回"
        />
        <LineChart
          title="スピーキング"
          series={speakingSeries}
          data={data.speaking}
          unit="回"
        />
        <LineChart
          title="Native Camp 学習時間"
          series={ncSeries}
          data={data.nativeCamp}
          unit="分"
        />
        <LineChart
          title="シャドーイング 完了本数"
          series={shadowingSeries}
          data={shadowingData}
          unit="本"
        />
      </TabsContent>
    </Tabs>
  )
}
