"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, MessageSquare, Mic, ChevronRight } from "lucide-react"

interface Props {
  grammarsInProgress: number
  expressionsInProgress: number
  grammarDone: number
  expressionDone: number
}

export function CTASection({
  grammarsInProgress,
  expressionsInProgress,
  grammarDone,
  expressionDone,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* 文法リピーティング */}
        <Link href="/repeating/grammar">
          <Card className="cursor-pointer bg-card border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/30 p-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-800/40 transition-colors shrink-0">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-base text-foreground">文法リピーティング</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  練習中 {grammarsInProgress} / 完了 {grammarDone}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
            </CardContent>
          </Card>
        </Link>

        {/* フレーズリピーティング */}
        <Link href="/repeating/expression">
          <Card className="cursor-pointer bg-card border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-xl bg-teal-50 dark:bg-teal-900/30 p-3 group-hover:bg-teal-100 dark:group-hover:bg-teal-800/40 transition-colors shrink-0">
                <MessageSquare className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-base text-foreground">フレーズリピーティング</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  練習中 {expressionsInProgress} / 完了 {expressionDone}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* スピーキング */}
      <Link href="/speaking">
        <Card className="cursor-pointer bg-card border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/30 p-3 group-hover:bg-amber-100 dark:group-hover:bg-amber-800/40 transition-colors shrink-0">
              <Mic className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-base text-foreground">スピーキング</p>
              <p className="text-sm text-muted-foreground mt-0.5">画像を見ながら英語で説明する練習</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
