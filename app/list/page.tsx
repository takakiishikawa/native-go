"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Dialog } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Grammar, Expression } from "@/lib/types"

type GrammarWithLesson = Grammar & { lessons: { lesson_no: string } | null }
type ExpressionWithLesson = Expression & { lessons: { lesson_no: string } | null }
import { Star } from "lucide-react"

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
        />
      ))}
    </span>
  )
}

function sortByLessonNo<T extends { lessons: { lesson_no: string } | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aN = a.lessons?.lesson_no ?? ""
    const bN = b.lessons?.lesson_no ?? ""
    const ap = aN.split("-").map(Number)
    const bp = bN.split("-").map(Number)
    for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
      const diff = (ap[i] ?? 0) - (bp[i] ?? 0)
      if (diff !== 0) return diff
    }
    return 0
  })
}

function GrammarTab() {
  const supabase = createClient()
  const [items, setItems] = useState<GrammarWithLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<GrammarWithLesson | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("grammar")
        .select("*, lessons(lesson_no)")
      setItems(sortByLessonNo((data ?? []) as GrammarWithLesson[]))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">読み込み中...</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">全 {items.length} 件</span>
        <span className="inline-flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          完了 {items.filter((i) => i.play_count >= 10).length}
        </span>
      </div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">テキストID</TableHead>
              <TableHead>文法名</TableHead>
              <TableHead>概要</TableHead>
              <TableHead>頻度</TableHead>
              <TableHead>回数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelected(item)}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {item.lessons?.lesson_no ?? "—"}
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{item.summary.split("\n")[0]}{item.summary.includes("\n") ? "..." : ""}</TableCell>
                <TableCell><StarRating value={item.frequency} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.play_count} / 10</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selected && (
        <Dialog open={!!selected} onClose={() => setSelected(null)} title={selected.name}>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">簡易解説</p>
              <p className="text-sm">{selected.summary}</p>
            </div>
            {selected.detail && (
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">詳細解説</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.detail}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">例文</p>
              <ul className="space-y-2">
                {selected.examples.split("\n").filter(Boolean).map((ex, i) => (
                  <li key={i} className="rounded-lg bg-muted px-3 py-2 text-sm">{ex}</li>
                ))}
              </ul>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}

function PhraseTab() {
  const supabase = createClient()
  const [items, setItems] = useState<ExpressionWithLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ExpressionWithLesson | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("expressions")
        .select("*, lessons(lesson_no)")
      setItems(sortByLessonNo((data ?? []) as ExpressionWithLesson[]))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">読み込み中...</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">全 {items.length} 件</span>
        <span className="inline-flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          完了 {items.filter((i) => i.play_count >= 10).length}
        </span>
      </div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">テキストID</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>フレーズ</TableHead>
              <TableHead>意味</TableHead>
              <TableHead>頻度</TableHead>
              <TableHead>回数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelected(item)}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {item.lessons?.lesson_no ?? "—"}
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{item.category}</Badge></TableCell>
                <TableCell className="font-medium">{item.expression}</TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{item.meaning.split("\n")[0]}{item.meaning.includes("\n") ? "..." : ""}</TableCell>
                <TableCell><StarRating value={item.frequency} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.play_count} / 10</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selected && (
        <Dialog open={!!selected} onClose={() => setSelected(null)} title={selected.expression}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground whitespace-pre-line">{selected.meaning}</p>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">会話</p>
              <div className="space-y-2">
                {selected.conversation.split("\n").filter(Boolean).map((line, i) => {
                  const isA = line.startsWith("A:")
                  return (
                    <div
                      key={i}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        isA
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200"
                          : "bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200"
                      }`}
                    >
                      {line}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2 border-t">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">使用頻度</span>
                <StarRating value={selected.frequency} />
              </div>
              <span className="text-xs text-muted-foreground">
                練習回数: {selected.play_count} / 10
              </span>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}

export default function ListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[25px] font-medium">文法・フレーズ</h1>
        <p className="text-sm text-muted-foreground mt-1">登録済みの文法・フレーズを確認できます</p>
      </div>

      <Tabs defaultValue="grammar">
        <TabsList>
          <TabsTrigger value="grammar">文法</TabsTrigger>
          <TabsTrigger value="phrase">フレーズ</TabsTrigger>
        </TabsList>
        <TabsContent value="grammar" className="mt-4">
          <GrammarTab />
        </TabsContent>
        <TabsContent value="phrase" className="mt-4">
          <PhraseTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
