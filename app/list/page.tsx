"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Badge, DataTable,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@takaki/go-design-system"
import type { ColumnDef } from "@tanstack/react-table"
import type { Grammar, Expression } from "@/lib/types"
import { Star } from "lucide-react"

type GrammarWithLesson = Grammar & { lessons: { lesson_no: string } | null }
type ExpressionWithLesson = Expression & { lessons: { lesson_no: string } | null }

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= value ? "fill-[var(--color-warning)] text-[color:var(--color-warning)]" : "text-muted-foreground"}`}
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

  const columns = useMemo((): ColumnDef<GrammarWithLesson>[] => [
    {
      id: "lesson_no",
      header: "テキストID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.lessons?.lesson_no ?? "—"}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "文法名",
      cell: ({ row }) => (
        <button
          onClick={() => setSelected(row.original)}
          className="font-medium text-left hover:underline text-foreground"
        >
          {row.original.name}
        </button>
      ),
    },
    {
      accessorKey: "summary",
      header: "概要",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm line-clamp-1 max-w-xs block">
          {row.original.summary.split("\n")[0]}
        </span>
      ),
    },
    {
      accessorKey: "frequency",
      header: "頻度",
      cell: ({ row }) => <StarRating value={row.original.frequency} />,
    },
    {
      accessorKey: "play_count",
      header: "回数",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.play_count} / 10</span>,
    },
  ], [])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">読み込み中...</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">全 {items.length} 件</span>
        <span className="inline-flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full bg-[color:var(--color-success-subtle)] text-[color:var(--color-success)]">
          完了 {items.filter((i) => i.play_count >= 10).length}
        </span>
      </div>

      <DataTable
        columns={columns}
        data={items}
        searchable={{ columnId: "name", placeholder: "文法名で検索..." }}
        pageSize={20}
        emptyMessage="文法が登録されていません"
      />

      {selected && (
        <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selected.name}</DialogTitle>
            </DialogHeader>
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
          </DialogContent>
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

  const columns = useMemo((): ColumnDef<ExpressionWithLesson>[] => [
    {
      id: "lesson_no",
      header: "テキストID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.lessons?.lesson_no ?? "—"}</span>
      ),
    },
    {
      accessorKey: "category",
      header: "種別",
      cell: ({ row }) => <Badge variant="outline" className="text-xs">{row.original.category}</Badge>,
    },
    {
      accessorKey: "expression",
      header: "フレーズ",
      cell: ({ row }) => (
        <button
          onClick={() => setSelected(row.original)}
          className="font-medium text-left hover:underline text-foreground"
        >
          {row.original.expression}
        </button>
      ),
    },
    {
      accessorKey: "meaning",
      header: "意味",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm line-clamp-1 max-w-xs block">{row.original.meaning}</span>
      ),
    },
    {
      accessorKey: "frequency",
      header: "頻度",
      cell: ({ row }) => <StarRating value={row.original.frequency} />,
    },
    {
      accessorKey: "play_count",
      header: "回数",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.play_count} / 10</span>,
    },
  ], [])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">読み込み中...</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">全 {items.length} 件</span>
        <span className="inline-flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full bg-[color:var(--color-success-subtle)] text-[color:var(--color-success)]">
          完了 {items.filter((i) => i.play_count >= 10).length}
        </span>
      </div>

      <DataTable
        columns={columns}
        data={items}
        searchable={{ columnId: "expression", placeholder: "フレーズで検索..." }}
        pageSize={20}
        emptyMessage="フレーズが登録されていません"
      />

      {selected && (
        <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selected.expression}</DialogTitle>
            </DialogHeader>
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
                            ? "bg-[color:var(--color-grammar)]/10 text-[color:var(--color-grammar)]"
                            : "bg-[color:var(--color-phrase)]/10 text-[color:var(--color-phrase)]"
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
          </DialogContent>
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
