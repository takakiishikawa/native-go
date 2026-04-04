"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export type LineChartSeries = {
  key: string
  label: string
  color: string
}

export type LineChartPoint = { label: string; [key: string]: string | number }

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
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const getVal = (d: LineChartPoint, key: string): number => (d[key] as number) ?? 0

  const hasData = data.length > 0

  const W = 500, H = 160
  const pt = 16, pb = 28, pl = 4, pr = 4
  const iw = W - pl - pr
  const ih = H - pt - pb
  const baseY = pt + ih

  const maxVal = Math.max(...data.flatMap((d) => series.map((s) => getVal(d, s.key))), 1)

  const xPos = (i: number) =>
    data.length <= 1 ? pl + iw / 2 : pl + (i / (data.length - 1)) * iw
  const yPos = (v: number) => pt + (1 - v / maxVal) * ih

  function smoothPath(pts: [number, number][]): string {
    if (pts.length === 0) return ""
    if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`
    let d = `M ${pts[0][0]},${pts[0][1]}`
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]
      const [x1, y1] = pts[i]
      const cpx = (x0 + x1) / 2
      d += ` C ${cpx},${y0} ${cpx},${y1} ${x1},${y1}`
    }
    return d
  }

  const segW = data.length <= 1 ? iw : iw / (data.length - 1)
  const showLabelIndices =
    data.length <= 4
      ? data.map((_, i) => i)
      : [0, Math.floor((data.length - 1) / 2), data.length - 1]

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm">
          {series.map((s) => (
            <span
              key={s.key}
              className="flex items-center gap-1.5 font-medium"
              style={{ color: s.color }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: s.color }}
              />
              {s.label}{" "}
              {hoveredIdx !== null
                ? getVal(data[hoveredIdx], s.key)
                : data.reduce((sum, d) => sum + getVal(d, s.key), 0)}
              {unit}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {!hasData ? (
          <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ height: 160 }}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`lc-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                </linearGradient>
              ))}
            </defs>

            {[0, 0.5, 1].map((frac) => (
              <line
                key={frac}
                x1={pl} y1={pt + (1 - frac) * ih}
                x2={W - pr} y2={pt + (1 - frac) * ih}
                stroke="gray" strokeOpacity="0.1" strokeWidth="1"
              />
            ))}

            {series.map((s) => {
              const pts: [number, number][] = data.map((d, i) => [xPos(i), yPos(getVal(d, s.key))])
              const line = smoothPath(pts)
              const area = `${line} L ${xPos(data.length - 1)},${baseY} L ${xPos(0)},${baseY} Z`
              return (
                <g key={s.key}>
                  <path d={area} fill={`url(#lc-grad-${s.key})`} />
                  <path
                    d={line} fill="none" stroke={s.color} strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                </g>
              )
            })}

            {hoveredIdx !== null && (
              <>
                <line
                  x1={xPos(hoveredIdx)} y1={pt}
                  x2={xPos(hoveredIdx)} y2={baseY}
                  stroke="gray" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 2"
                />
                {series.map((s) => (
                  <circle
                    key={s.key}
                    cx={xPos(hoveredIdx)} cy={yPos(getVal(data[hoveredIdx], s.key))}
                    r="5" fill={s.color} stroke="white" strokeWidth="2"
                  />
                ))}
              </>
            )}

            {data.map((_, i) => (
              <rect
                key={i}
                x={xPos(i) - segW / 2} y={pt}
                width={segW} height={ih}
                fill="transparent"
                style={{ cursor: "crosshair" }}
                onMouseEnter={() => setHoveredIdx(i)}
              />
            ))}

            {showLabelIndices.map((i) => (
              <text key={i} x={xPos(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="gray" opacity="0.55">
                {data[i].label}
              </text>
            ))}
          </svg>
        )}
      </CardContent>
    </Card>
  )
}
