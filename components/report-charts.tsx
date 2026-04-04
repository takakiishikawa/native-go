"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { LineChart, type LineChartPoint, type LineChartSeries } from "@/components/line-chart"
import type { SpeakingScore } from "@/lib/types"

type PracticeLog = {
  practiced_at: string
  grammar_done_count: number
  expression_done_count: number
  speaking_count: number
  native_camp_count: number
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-")
  return `${y}/${m}`
}

function fmtDate(str: string): string {
  const [, m, d] = str.split("-")
  return `${m}/${d}`
}

function buildMonthlyData(logs: PracticeLog[]): {
  repeating: LineChartPoint[]
  speaking: LineChartPoint[]
  nativeCamp: LineChartPoint[]
} {
  const map = new Map<string, { grammar: number; expression: number; speaking: number; nc: number }>()

  for (const l of logs) {
    const ym = l.practiced_at.slice(0, 7)
    const existing = map.get(ym) ?? { grammar: 0, expression: 0, speaking: 0, nc: 0 }
    map.set(ym, {
      grammar: existing.grammar + (l.grammar_done_count ?? 0),
      expression: existing.expression + (l.expression_done_count ?? 0),
      speaking: existing.speaking + (l.speaking_count ?? 0),
      nc: existing.nc + (l.native_camp_count ?? 0),
    })
  }

  const months = [...map.keys()].sort()

  return {
    repeating: months.map((ym) => ({
      label: fmtMonth(ym),
      grammar: map.get(ym)!.grammar,
      expression: map.get(ym)!.expression,
    })),
    speaking: months.map((ym) => ({
      label: fmtMonth(ym),
      speaking: map.get(ym)!.speaking,
    })),
    nativeCamp: months.map((ym) => ({
      label: fmtMonth(ym),
      minutes: map.get(ym)!.nc * 25,
    })),
  }
}

function buildCumulativeData(logs: PracticeLog[]): {
  repeating: LineChartPoint[]
  speaking: LineChartPoint[]
  nativeCamp: LineChartPoint[]
} {
  const sorted = [...logs].sort((a, b) => a.practiced_at.localeCompare(b.practiced_at))

  let cumGrammar = 0
  let cumExpression = 0
  let cumSpeaking = 0
  let cumNc = 0

  const repeating: LineChartPoint[] = []
  const speaking: LineChartPoint[] = []
  const nativeCamp: LineChartPoint[] = []

  for (const l of sorted) {
    cumGrammar += l.grammar_done_count ?? 0
    cumExpression += l.expression_done_count ?? 0
    cumSpeaking += l.speaking_count ?? 0
    cumNc += l.native_camp_count ?? 0
    const label = fmtDate(l.practiced_at)
    repeating.push({ label, grammar: cumGrammar, expression: cumExpression })
    speaking.push({ label, speaking: cumSpeaking })
    nativeCamp.push({ label, minutes: cumNc * 25 })
  }

  return { repeating, speaking, nativeCamp }
}

const repeatingSeries: LineChartSeries[] = [
  { key: "grammar", label: "文法", color: "#3B82F6" },
  { key: "expression", label: "フレーズ", color: "#10B981" },
]
const speakingSeries: LineChartSeries[] = [
  { key: "speaking", label: "Speaking", color: "#3B82F6" },
]
const ncSeries: LineChartSeries[] = [
  { key: "minutes", label: "学習時間", color: "#10B981" },
]

export function ReportCharts({
  logs,
  scores,
}: {
  logs: PracticeLog[]
  scores: SpeakingScore[]
}) {
  const [mode, setMode] = useState<"monthly" | "cumulative">("monthly")

  const monthly = buildMonthlyData(logs)
  const cumulative = buildCumulativeData(logs)

  const data = mode === "monthly" ? monthly : cumulative

  const scoreChartData: LineChartPoint[] = [...scores]
    .sort((a, b) => a.tested_at.localeCompare(b.tested_at))
    .map((s) => {
      const [, m, d] = s.tested_at.split("-")
      return { label: `${m}/${d}`, score: s.score }
    })

  return (
    <div className="space-y-6">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "monthly" | "cumulative")}>
        <TabsList>
          <TabsTrigger value="monthly">月次</TabsTrigger>
          <TabsTrigger value="cumulative">累計</TabsTrigger>
        </TabsList>

        <TabsContent value={mode} className="space-y-4 mt-4">
          <LineChart
            title="リピーティング"
            series={repeatingSeries}
            data={data.repeating}
            unit="回"
          />
          <LineChart
            title="Speaking 練習回数"
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
        </TabsContent>
      </Tabs>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Speaking スコア推移
        </h2>
        <LineChart
          title="Speaking スコア"
          series={[{ key: "score", label: "スコア", color: "#10B981" }]}
          data={scoreChartData}
          unit="点"
          emptyText="スコアを記録するとグラフが表示されます"
        />
      </div>
    </div>
  )
}
