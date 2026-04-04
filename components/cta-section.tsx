"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
          <Card className="cursor-pointer border-2 border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition-all group">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-100 p-2.5 group-hover:bg-blue-200 transition-colors">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-blue-900">文法リピーティング</p>
                <p className="text-xs text-blue-600/70 mt-0.5">
                  練習中 {grammarsInProgress} / Done {grammarDone}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-blue-400 ml-auto shrink-0 group-hover:text-blue-600 transition-colors" />
            </CardContent>
          </Card>
        </Link>

        {/* フレーズリピーティング */}
        <Link href="/repeating/expression">
          <Card className="cursor-pointer border-2 border-green-200 bg-green-50/40 hover:border-green-400 hover:bg-green-50 hover:shadow-md transition-all group">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-green-100 p-2.5 group-hover:bg-green-200 transition-colors">
                <MessageSquare className="h-5 w-5 text-[#10B981]" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-green-900">フレーズリピーティング</p>
                <p className="text-xs text-green-600/70 mt-0.5">
                  練習中 {expressionsInProgress} / Done {expressionDone}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-green-400 ml-auto shrink-0 group-hover:text-green-600 transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* スピーキング（準備中） */}
      <Card className="border-2 border-neutral-200 bg-neutral-50/50">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-lg bg-neutral-100 p-2.5">
            <Mic className="h-5 w-5 text-neutral-400" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-neutral-500">スピーキング</p>
            <p className="text-xs text-neutral-400 mt-0.5">自分の考えを英語で生成する練習</p>
          </div>
          <Badge
            variant="outline"
            className="ml-auto shrink-0 text-xs text-neutral-400 border-neutral-200"
          >
            準備中
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}
