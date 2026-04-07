"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, MessageSquare } from "lucide-react"

export default function PracticePage() {
  const router = useRouter()

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">練習</h1>
        <p className="text-muted-foreground mt-1">練習するカテゴリを選んでください</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className="cursor-pointer bg-card border hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all group"
          onClick={() => router.push("/repeating/grammar")}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-800/40 transition-colors shrink-0">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl text-foreground">文法練習</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-base text-muted-foreground">
              文法パターンをリピーティングで練習します
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer bg-card border hover:border-teal-500 dark:hover:border-teal-400 hover:shadow-md transition-all group"
          onClick={() => router.push("/repeating/expression")}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal-50 dark:bg-teal-900/30 p-3 group-hover:bg-teal-100 dark:group-hover:bg-teal-800/40 transition-colors shrink-0">
                <MessageSquare className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              </div>
              <CardTitle className="text-xl text-foreground">フレーズ練習</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-base text-muted-foreground">
              フレーズを会話形式で練習します
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
