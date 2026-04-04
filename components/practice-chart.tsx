"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type DataPoint = { date: string; grammar: number; expression: number }

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

export function PracticeChart({ data }: { data: DataPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const totalGrammar = data.reduce((s, d) => s + d.grammar, 0)
  const totalExpression = data.reduce((s, d) => s + d.expression, 0)
  const total = totalGrammar + totalExpression

  const hasData = data.some((d) => d.grammar > 0 || d.expression > 0)

  const W = 500
  const H = 160
  const pt = 16, pb = 28, pl = 4, pr = 4
  const iw = W - pl - pr
  const ih = H - pt - pb

  const maxVal = Math.max(...data.map((d) => Math.max(d.grammar, d.expression)), 1)

  const x = (i: number) => pl + (i / (data.length - 1)) * iw
  const y = (v: number) => pt + (1 - v / maxVal) * ih
  const baseY = pt + ih

  const gPts: [number, number][] = data.map((d, i) => [x(i), y(d.grammar)])
  const ePts: [number, number][] = data.map((d, i) => [x(i), y(d.expression)])

  const gLine = smoothPath(gPts)
  const eLine = smoothPath(ePts)
  const gArea = `${gLine} L ${x(data.length - 1)},${baseY} L ${x(0)},${baseY} Z`
  const eArea = `${eLine} L ${x(data.length - 1)},${baseY} L ${x(0)},${baseY} Z`

  const hovered = hoveredIdx !== null ? data[hoveredIdx] : null
  const segW = iw / (data.length - 1)

  const showIndices = [0, Math.floor((data.length - 1) / 2), data.length - 1]

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-muted-foreground">
              日次練習数（14日間）
            </CardTitle>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-5xl font-bold tracking-tight">
                {hovered ? hovered.grammar + hovered.expression : total}
              </span>
              <span className="text-lg text-muted-foreground">回</span>
              {hovered && (
                <span className="text-sm text-muted-foreground ml-1">{hovered.date.slice(5)}</span>
              )}
            </div>
            <div className="flex gap-5 mt-2 text-sm">
              <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />
                文法 {hovered ? hovered.grammar : totalGrammar}
              </span>
              <span className="flex items-center gap-1.5 text-green-600 font-medium">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
                フレーズ {hovered ? hovered.expression : totalExpression}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {!hasData ? (
          <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">
            練習ログが溜まるとグラフが表示されます
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ height: 160 }}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <defs>
              <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="eGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.5, 1].map((frac) => (
              <line
                key={frac}
                x1={pl} y1={pt + (1 - frac) * ih}
                x2={W - pr} y2={pt + (1 - frac) * ih}
                stroke="gray" strokeOpacity="0.1" strokeWidth="1"
              />
            ))}

            {/* Area fills */}
            <path d={gArea} fill="url(#gGrad)" />
            <path d={eArea} fill="url(#eGrad)" />

            {/* Lines */}
            <path d={gLine} fill="none" stroke="#2563EB" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />
            <path d={eLine} fill="none" stroke="#10B981" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />

            {/* Hover vertical line + dots */}
            {hoveredIdx !== null && (
              <>
                <line
                  x1={x(hoveredIdx)} y1={pt}
                  x2={x(hoveredIdx)} y2={baseY}
                  stroke="gray" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 2"
                />
                <circle cx={x(hoveredIdx)} cy={y(data[hoveredIdx].grammar)}
                  r="5" fill="#2563EB" stroke="white" strokeWidth="2" />
                <circle cx={x(hoveredIdx)} cy={y(data[hoveredIdx].expression)}
                  r="5" fill="#10B981" stroke="white" strokeWidth="2" />
              </>
            )}

            {/* Invisible hover targets per data point */}
            {data.map((_, i) => (
              <rect
                key={i}
                x={x(i) - segW / 2}
                y={pt}
                width={segW}
                height={ih}
                fill="transparent"
                style={{ cursor: "crosshair" }}
                onMouseEnter={() => setHoveredIdx(i)}
              />
            ))}

            {/* X axis labels */}
            {showIndices.map((i) => (
              <text
                key={i}
                x={x(i)} y={H - 6}
                textAnchor="middle" fontSize="9" fill="gray" opacity="0.55"
              >
                {data[i].date.slice(5)}
              </text>
            ))}
          </svg>
        )}
      </CardContent>
    </Card>
  )
}
