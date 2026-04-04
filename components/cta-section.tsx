"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, MessageSquare, Mic, ChevronRight } from "lucide-react"

interface Props {
  grammarsInProgress: number
  expressionsInProgress: number
  grammar完了: number
  expression完了: number
}

export function CTASection({
  grammarsInProgress,
  expressionsInProgress,
  grammar完了,
  expression完了,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* 文法リピーティング */}
        <Link href="/repeating/grammar">
          <Card className="cursor-pointer bg-card border hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all group">
            <CardContent className="flex items-center gap-3 p-4 border-l-4 border-blue-500 dark:border-blue-400 rounded-l-md">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-2.5 group-hover:bg-blue-100 dark:group-hover:bg-blue-800/40 transition-colors shrink-0">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground">文法リピーティング</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  練習中 {grammarsInProgress} / 完了 {grammar完了}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
            </CardContent>
          </Card>
        </Link>

        {/* フレーズリピーティング */}
        <Link href="/repeating/expression">
          <Card className="cursor-pointer bg-card border hover:border-green-500 dark:hover:border-green-400 hover:shadow-md transition-all group">
            <CardContent className="flex items-center gap-3 p-4 border-l-4 border-green-500 dark:border-green-400 rounded-l-md">
              <div className="rounded-lg bg-green-50 dark:bg-green-900/30 p-2.5 group-hover:bg-green-100 dark:group-hover:bg-green-800/40 transition-colors shrink-0">
                <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground">フレーズリピーティング</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  練習中 {expressionsInProgress} / 完了 {expression完了}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0 group-hover:text-green-500 dark:group-hover:text-green-400 transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* スピーキング（準備中） */}
      <Card className="bg-card border opacity-60">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-lg bg-muted p-2.5 shrink-0">
            <Mic className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-muted-foreground">スピーキング</p>
            <p className="text-xs text-muted-foreground mt-0.5">自分の考えを英語で生成する練習</p>
          </div>
          <Badge
            variant="outline"
            className="ml-auto shrink-0 text-xs text-muted-foreground border-border"
          >
            準備中
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}
