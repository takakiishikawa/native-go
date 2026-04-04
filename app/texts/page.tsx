"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog } from "@/components/ui/dialog"
import { toast } from "sonner"
import { saveGrammar, saveExpressions, updateLessonStatus } from "@/app/actions/practice"
import type { Lesson, ExtractResult, ExtractedGrammar, ExtractedExpression } from "@/lib/types"
import { Loader2, Star, BookOpen, MessageSquare, Plus } from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type LessonStats = { total: number; done: number; started: number }

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseLessonNo(no: string): number[] {
  return no.split("-").map(Number)
}

function sortLessons(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level
    const ap = parseLessonNo(a.lesson_no)
    const bp = parseLessonNo(b.lesson_no)
    for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
      const diff = (ap[i] ?? 0) - (bp[i] ?? 0)
      if (diff !== 0) return diff
    }
    return 0
  })
}

// ─── Components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Lesson["status"] }) {
  const styles: Record<Lesson["status"], string> = {
    未登録: "border-transparent bg-[#F1F5F9] text-[#64748B]",
    練習中: "border-transparent bg-[#FFFBEB] text-[#F59E0B]",
    習得済み: "border-transparent bg-[#ECFDF5] text-[#10B981]",
  }
  return (
    <Badge variant="outline" className={styles[status]}>
      {status}
    </Badge>
  )
}

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
        />
      ))}
    </span>
  )
}

function GrammarPreview({ item }: { item: ExtractedGrammar }) {
  return (
    <Card className="border-indigo-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-indigo-700">{item.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">文法</Badge>
            <StarRating value={item.frequency} />
          </div>
        </div>
        <CardDescription className="text-xs">{item.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5 text-xs">
        {item.detail && <p className="text-muted-foreground">{item.detail}</p>}
        <ul className="space-y-1">
          {item.examples.map((ex, i) => (
            <li key={i} className="text-muted-foreground pl-2 border-l-2 border-indigo-200">{ex}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function ExpressionPreview({ item }: { item: ExtractedExpression }) {
  return (
    <Card className="border-green-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-green-700">{item.expression}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{item.category}</Badge>
            <StarRating value={item.frequency} />
          </div>
        </div>
        <CardDescription className="text-xs">{item.meaning}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {item.conversation.map((line, i) => (
          <p
            key={i}
            className={`text-xs pl-2 ${
              line.startsWith("A:")
                ? "text-blue-700 border-l-2 border-blue-300"
                : "text-amber-700 border-l-2 border-amber-300"
            }`}
          >
            {line}
          </p>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── AddModal ────────────────────────────────────────────────────────────────

function LessonCombobox({
  lessons,
  value,
  onChange,
}: {
  lessons: Lesson[]
  value: string
  onChange: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = lessons.find((l) => l.id === value)
  const filtered = lessons.filter((l) =>
    `${l.lesson_no} ${l.topic}`.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="レッスン番号またはトピックで検索..."
        value={open ? query : (selected ? `${selected.lesson_no} — ${selected.topic}` : "")}
        onFocus={() => { setQuery(""); setOpen(true) }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-52 overflow-y-auto">
          {filtered.map((lesson) => (
            <button
              key={lesson.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              onMouseDown={() => {
                onChange(lesson.id)
                setOpen(false)
                setQuery("")
              }}
            >
              <span className="font-mono text-muted-foreground mr-2">{lesson.lesson_no}</span>
              {lesson.topic}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const LOADING_STEPS = [
  "テキストを解析中...",
  "文法テーマを特定中...",
  "フレーズを識別中...",
  "例文・会話例を生成中...",
  "内容を整形中...",
]

function AddModal({
  unregisteredLessons,
  onClose,
  onSaved,
}: {
  unregisteredLessons: Lesson[]
  onClose: () => void
  onSaved: () => void
}) {
  const [selectedLessonId, setSelectedLessonId] = useState("")
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<ExtractResult | null>(null)

  const selectedLesson = unregisteredLessons.find((l) => l.id === selectedLessonId)

  useEffect(() => {
    if (!loading) { setLoadingStep(0); return }
    const interval = setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1))
    }, 4000)
    return () => clearInterval(interval)
  }, [loading])

  async function handleExtract() {
    if (!selectedLessonId || !text.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error()
      setResult(await res.json())
    } catch {
      toast.error("抽出に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!result || !selectedLessonId) return
    setSaving(true)
    try {
      if (result.grammar.length > 0) await saveGrammar(result.grammar, selectedLessonId)
      if (result.expressions.length > 0) await saveExpressions(result.expressions, selectedLessonId)
      await updateLessonStatus(selectedLessonId, "練習中")
      toast.success(
        `文法 ${result.grammar.length}件・フレーズ ${result.expressions.length}件を保存しました`
      )
      onSaved()
      onClose()
    } catch {
      toast.error("保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} title="テキスト追加" className="max-w-2xl">
      <div className="space-y-5">

        {/* ── 抽出完了後: レッスン情報 + 結果のみ ── */}
        {result ? (
          <>
            {/* 対象レッスン（read-only） */}
            <div className="rounded-lg border bg-muted/40 px-4 py-3 flex items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground w-14 shrink-0">
                {selectedLesson?.lesson_no}
              </span>
              <span className="text-sm font-medium">{selectedLesson?.topic}</span>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                文法 {result.grammar.length}件・フレーズ {result.expressions.length}件 抽出
              </p>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />保存中...</>
                ) : (
                  "すべて保存"
                )}
              </Button>
            </div>

            {result.grammar.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">文法</p>
                {result.grammar.map((g, i) => <GrammarPreview key={i} item={g} />)}
              </div>
            )}

            {result.grammar.length > 0 && result.expressions.length > 0 && <Separator />}

            {result.expressions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">フレーズ</p>
                {result.expressions.map((e, i) => <ExpressionPreview key={i} item={e} />)}
              </div>
            )}
          </>
        ) : loading ? (
          /* ── 抽出中: プログレス表示 ── */
          <div className="py-6 space-y-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">{LOADING_STEPS[loadingStep]}</p>
              <p className="text-xs text-muted-foreground">通常15〜30秒かかります</p>
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-[3000ms] ease-out"
                  style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 85}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground px-0.5">
                {LOADING_STEPS.map((step, i) => (
                  <span
                    key={i}
                    className={`transition-colors ${i <= loadingStep ? "text-primary font-medium" : ""}`}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── 入力フォーム ── */
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">レッスン選択</label>
              {unregisteredLessons.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">未登録のレッスンがありません</p>
              ) : (
                <LessonCombobox
                  lessons={unregisteredLessons}
                  value={selectedLessonId}
                  onChange={setSelectedLessonId}
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">教材テキスト</label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Native Campの教材テキストをここに貼り付け..."
                className="min-h-36 font-mono text-xs"
              />
              <Button
                onClick={handleExtract}
                disabled={!selectedLessonId || !text.trim()}
                className="w-full"
              >
                文法・フレーズを自動抽出
              </Button>
            </div>
          </>
        )}

      </div>
    </Dialog>
  )
}

// ─── LessonList (view-only) ───────────────────────────────────────────────────

function LessonList({
  lessons,
  grammarMap,
  expressionMap,
}: {
  lessons: Lesson[]
  grammarMap: Map<string, LessonStats>
  expressionMap: Map<string, LessonStats>
}) {
  if (lessons.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        レッスンデータがありません
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {lessons.map((lesson) => {
        const g = grammarMap.get(lesson.id) ?? { total: 0, done: 0, started: 0 }
        const e = expressionMap.get(lesson.id) ?? { total: 0, done: 0, started: 0 }
        return (
          <div
            key={lesson.id}
            className="flex items-center gap-4 rounded-lg border px-4 py-3"
          >
            <span className="font-mono text-sm font-medium w-16 text-muted-foreground">
              {lesson.lesson_no}
            </span>
            <span className="flex-1 text-sm">{lesson.topic}</span>
            {(g.total > 0 || e.total > 0) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {g.total > 0 && (
                  <span className="flex items-center gap-0.5">
                    <BookOpen className="h-3 w-3" />
                    {g.done}/{g.total}
                  </span>
                )}
                {e.total > 0 && (
                  <span className="flex items-center gap-0.5">
                    <MessageSquare className="h-3 w-3" />
                    {e.done}/{e.total}
                  </span>
                )}
              </div>
            )}
            <StatusBadge status={lesson.status} />
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TextsPage() {
  const supabase = createClient()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [grammarMap, setGrammarMap] = useState<Map<string, LessonStats>>(new Map())
  const [expressionMap, setExpressionMap] = useState<Map<string, LessonStats>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  const loadData = useCallback(async () => {
    const [lessonsRes, grammarRes, expressionRes] = await Promise.all([
      supabase.from("lessons").select("*"),
      supabase.from("grammar").select("lesson_id, play_count"),
      supabase.from("expressions").select("lesson_id, play_count"),
    ])

    setLessons(sortLessons((lessonsRes.data as Lesson[]) ?? []))

    const gMap = new Map<string, LessonStats>()
    for (const g of grammarRes.data ?? []) {
      if (!g.lesson_id) continue
      const s = gMap.get(g.lesson_id) ?? { total: 0, done: 0, started: 0 }
      s.total++
      if (g.play_count >= 10) s.done++
      else if (g.play_count > 0) s.started++
      gMap.set(g.lesson_id, s)
    }
    setGrammarMap(gMap)

    const eMap = new Map<string, LessonStats>()
    for (const e of expressionRes.data ?? []) {
      if (!e.lesson_id) continue
      const s = eMap.get(e.lesson_id) ?? { total: 0, done: 0, started: 0 }
      s.total++
      if (e.play_count >= 10) s.done++
      else if (e.play_count > 0) s.started++
      eMap.set(e.lesson_id, s)
    }
    setExpressionMap(eMap)

    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const byLevel = (level: number) => lessons.filter((l) => l.level === level)

  const levelStatusSummary = (level: number) => {
    const lvl = byLevel(level)
    const done = lvl.filter((l) => l.status === "習得済み").length
    const inProgress = lvl.filter((l) => l.status === "練習中").length
    const unregistered = lvl.filter((l) => l.status === "未登録").length
    return { total: lvl.length, done, inProgress, unregistered }
  }

  const unregisteredLessons = lessons.filter((l) => l.status === "未登録")

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        読み込み中...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">テキスト</h1>
          <p className="text-muted-foreground mt-1">
            レッスンごとの文法・フレーズ登録状況
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          テキスト追加
        </Button>
      </div>

      <Tabs defaultValue="1">
        <TabsList>
          <TabsTrigger value="1">Level 1</TabsTrigger>
          <TabsTrigger value="2">Level 2</TabsTrigger>
          <TabsTrigger value="3">Level 3</TabsTrigger>
        </TabsList>

        {[1, 2, 3].map((lvl) => {
          const s = levelStatusSummary(lvl)
          return (
          <TabsContent key={lvl} value={String(lvl)} className="space-y-3 mt-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">
                {s.total}
                <span className="text-base font-normal text-muted-foreground ml-1">件</span>
              </span>
              <Badge className="border-transparent bg-[#FFFBEB] text-[#F59E0B] hover:bg-[#FFFBEB]">練習中 {s.inProgress}</Badge>
              <Badge className="border-transparent bg-[#ECFDF5] text-[#10B981] hover:bg-[#ECFDF5]">習得済み {s.done}</Badge>
              <Badge className="border-transparent bg-[#F1F5F9] text-[#64748B] hover:bg-[#F1F5F9]">未登録 {s.unregistered}</Badge>
            </div>
            <LessonList
              lessons={byLevel(lvl)}
              grammarMap={grammarMap}
              expressionMap={expressionMap}
            />
          </TabsContent>
          )
        })}
      </Tabs>

      {showAddModal && (
        <AddModal
          unregisteredLessons={unregisteredLessons}
          onClose={() => setShowAddModal(false)}
          onSaved={loadData}
        />
      )}
    </div>
  )
}
