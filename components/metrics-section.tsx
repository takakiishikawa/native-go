"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeCampModal } from "@/components/native-camp-modal"
import { SpeakingScoreModal } from "@/components/speaking-score-modal"
import { PencilSquareIcon } from "@heroicons/react/24/outline"
import { ArrowUp, ArrowDown } from "lucide-react"
import type { SpeakingScore } from "@/lib/types"

interface Props {
  weeklyRepeating: number
  weeklyGrammar: number
  weeklyExpression: number
  weeklySpeaking: number
  weeklyNativeCampCount: number
  latestScore: number | null
  scoreDiff: number | null
  initialScores: SpeakingScore[]
}

export function MetricsSection({
  weeklyRepeating,
  weeklyGrammar,
  weeklyExpression,
  weeklySpeaking,
  weeklyNativeCampCount,
  latestScore,
  scoreDiff,
  initialScores,
}: Props) {
  const [ncOpen, setNcOpen] = useState(false)
  const [scoreOpen, setScoreOpen] = useState(false)

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
            <p className="text-xs text-muted-foreground mt-1">
              文法 {weeklyGrammar} / フレーズ {weeklyExpression}
            </p>
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
              <span className="text-4xl font-bold">{weeklyNativeCampCount}</span>
              <span className="text-base text-muted-foreground">回</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {weeklyNativeCampCount * 25}分
            </p>
          </CardContent>
        </Card>

        {/* Speaking スコア */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Speaking スコア
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
                    className={`text-xs mt-1 flex items-center gap-0.5 ${
                      scoreDiff >= 0 ? "text-[#10B981]" : "text-destructive"
                    }`}
                  >
                    {scoreDiff >= 0 ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
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
