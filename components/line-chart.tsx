"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export type LineChartSeries = { key: string; label: string; color: string }
export type LineChartPoint = { label: string; [key: string]: string | number }

interface TooltipEntry {
  dataKey?: string | number
  value?: number
}

function CustomTooltip({
  active,
  payload,
  unit,
  series,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  unit: string
  series: LineChartSeries[]
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-[6px] border px-3 py-2 text-xs shadow-md"
      style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
    >
      {series.map((s) => {
        const entry = payload.find((p) => p.dataKey === s.key)
        if (!entry) return null
        return (
          <p key={s.key} style={{ color: s.color }}>
            {s.label}: <strong>{entry.value ?? 0}{unit}</strong>
          </p>
        )
      })}
    </div>
  )
}

export function LineChart({
  title,
  series,
  data,
  unit,
  emptyText = "データが溜まるとグラフが表示されます",
}: {
  title: string
  series: LineChartSeries[]
  data: LineChartPoint[]
  unit: string
  emptyText?: string
}) {
  const hasData = data.length > 0

  return (
    <Card className="shadow-none border border-[var(--border-subtle,rgba(0,0,0,0.08))]">
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-[13px] font-medium text-[var(--text-tertiary,#A0A09D)] uppercase tracking-[0.05em]">
          {title}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1.5">
          {series.map((s) => {
            const total = data.reduce((sum, d) => sum + ((d[s.key] as number) ?? 0), 0)
            return (
              <span key={s.key} className="flex items-center gap-1.5 text-[15px] font-medium" style={{ color: s.color }}>
                <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                {s.label}{" "}<span className="tabular-nums">{total}{unit}</span>
              </span>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4 pt-2">
        {!hasData ? (
          <div className="h-[160px] flex items-center justify-center text-xs text-[var(--text-tertiary,#A0A09D)]">
            {emptyText}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <ReLineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              ))}
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--text-tertiary, #A0A09D)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <Tooltip
                content={(props) => (
                  <CustomTooltip
                    active={props.active}
                    payload={props.payload as unknown as TooltipEntry[] | undefined}
                    unit={unit}
                    series={series}
                  />
                )}
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              />
            </ReLineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
