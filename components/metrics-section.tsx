"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeCampModal } from "@/components/native-camp-modal"
import { SpeakingScoreModal } from "@/components/speaking-score-modal"
import { PencilSquareIcon } from "@heroicons/react/24/outline"
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown } from "lucide-react"
import type { SpeakingScore } from "@/lib/types"

interface Props {
  weeklyRepeating: number
  weeklyGrammar: number
  weeklyExpression: number
  weeklySpeaking: number
  weeklyNativeCampCount: number
  weeklyShadowing: number
  repeatingDiff: number | null
  speakingDiff: number | null
  ncCountDiff: number | null
  shadowingDiff: number | null
  latestScore: number | null
  scoreDiff: number | null
  initialScores: SpeakingScore[]
}

function DiffBadge({ diff, unit = "" }: { diff: number | null; unit?: string }) {
  if (diff === null) return null
  if (diff === 0) return (
    <span className="text-sm text-muted-foreground">前7日比 ±0{unit}</span>
  )
  const positive = diff > 0
  return (
    <span className={`flex items-center gap-0.5 text-sm font-medium ${positive ? "text-[#16A34A]" : "text-destructive"}`}>
      {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      前7日比 {positive ? "+" : ""}{diff}{unit}
    </span>
  )
}

export function MetricsSection({
  weeklyRepeating,
  weeklyGrammar,
  weeklyExpression,
  weeklySpeaking,
  weeklyNativeCampCount,
  weeklyShadowing,
  repeatingDiff,
  speakingDiff,
  ncCountDiff,
  shadowingDiff,
  latestScore,
  scoreDiff,
  initialScores,
}: Props) {
  const [ncOpen, setNcOpen] = useState(false)
  const [scoreOpen, setScoreOpen] = useState(false)

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {/* リピーティング */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              リピーティング（7日間）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{weeklyRepeating}</span>
              <span className="text-base text-muted-foreground">回</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              文法 {weeklyGrammar} / フレーズ {weeklyExpression}
            </p>
            <div className="mt-1.5">
              <DiffBadge diff={repeatingDiff} />
            </div>
          </CardContent>
        </Card>

        {/* スピーキング */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              スピーキング（7日間）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{weeklySpeaking}</span>
              <span className="text-base text-muted-foreground">回</span>
            </div>
            <div className="mt-1.5">
              <DiffBadge diff={speakingDiff} />
            </div>
          </CardContent>
        </Card>

        {/* Native Camp */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Native Camp（7日間）
              </CardTitle>
              <button
                onClick={() => setNcOpen(true)}
                className="rounded-md p-1 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="記録を追加"
              >
                <PencilSquareIcon className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{weeklyNativeCampCount * 25}</span>
              <span className="text-base text-muted-foreground">分</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {weeklyNativeCampCount}回
            </p>
            <div className="mt-1.5">
              <DiffBadge diff={ncCountDiff !== null ? ncCountDiff * 25 : null} unit="分" />
            </div>
          </CardContent>
        </Card>

        {/* シャドーイング */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              シャドーイング（7日間）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{weeklyShadowing}</span>
              <span className="text-base text-muted-foreground">本</span>
            </div>
            <div className="mt-1.5">
              <DiffBadge diff={shadowingDiff} />
            </div>
          </CardContent>
        </Card>

        {/* Speaking スコア */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                NC AI Speaking Test
              </CardTitle>
              <button
                onClick={() => setScoreOpen(true)}
                className="rounded-md p-1 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="スコアを記録"
              >
                <PencilSquareIcon className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {latestScore !== null ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{latestScore}</span>
                  <span className="text-base text-muted-foreground">点</span>
                </div>
                {scoreDiff !== null && (
                  <p
                    className={`text-sm mt-1 flex items-center gap-0.5 ${
                      scoreDiff >= 0 ? "text-[#16A34A]" : "text-destructive"
                    }`}
                  >
                    {scoreDiff >= 0 ? (
                      <ArrowUp className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5" />
                    )}
                    前回比 {scoreDiff >= 0 ? "+" : ""}
                    {scoreDiff}点
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground pt-1">未記録</p>
            )}
          </CardContent>
        </Card>
      </div>

      <NativeCampModal open={ncOpen} onClose={() => setNcOpen(false)} />
      <SpeakingScoreModal
        open={scoreOpen}
        onClose={() => setScoreOpen(false)}
        initialScores={initialScores}
      />
    </>
  )
}
