"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@takaki/go-design-system"
import { Loader2, CheckCircle2, Volume2, BookOpen } from "lucide-react"

const SCORE_LABELS = ["語彙", "文法", "流暢さ", "発音"]

function getSection(raw: string, tag: string) {
  const m = raw.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)(?=\\[|$)`))
  return m ? m[1].trim() : null
}

function parseComment(raw: string) {
  const good = getSection(raw, "GOOD")
  if (!good) return null
  return {
    good,
    grammarBefore: getSection(raw, "GRAMMAR_BEFORE"),
    grammarAfter: getSection(raw, "GRAMMAR_AFTER"),
    phraseBefore: getSection(raw, "PHRASE_BEFORE"),
    phraseAfter: getSection(raw, "PHRASE_AFTER"),
    example1: getSection(raw, "EXAMPLE1"),
    example2: getSection(raw, "EXAMPLE2"),
  }
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.min(100, Math.max(0, score))
  const color =
    pct >= 80 ? "bg-[color:var(--color-grammar)]" :
    pct >= 60 ? "bg-[color:var(--color-grammar)]/70" :
    pct >= 40 ? "bg-[color:var(--color-warning)]" : "bg-destructive"

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums">
          {score}<span className="text-xs text-muted-foreground font-normal"> / 100</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function BeforeAfterCard({ before, after, type }: { before: string | null; after: string | null; type: "grammar" | "phrase" }) {
  if (!before || !after || before === "-" || after === "-") return null
  const label = type === "grammar" ? "文法" : "フレーズ"
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="grid grid-cols-[1fr_16px_1fr] items-center gap-1.5">
        <div className="rounded-lg bg-muted/60 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 mb-1">Before</p>
          <p className="text-sm leading-snug text-muted-foreground">{before}</p>
        </div>
        <span className="text-muted-foreground text-center text-sm">→</span>
        <div className="rounded-lg bg-[color:var(--color-grammar)]/10 border border-[color:var(--color-grammar)]/30 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-grammar)]/70 mb-1">After</p>
          <p className="text-sm leading-snug text-foreground">{after}</p>
        </div>
      </div>
    </div>
  )
}

function SpeakButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false)

  function speak() {
    if (typeof window === "undefined" || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = "en-US"
    u.rate = 0.9
    u.onstart = () => setSpeaking(true)
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }

  return (
    <button
      onClick={speak}
      className={`flex-shrink-0 p-1.5 rounded-full transition-colors ${
        speaking ? "text-[color:var(--color-grammar)]" : "text-muted-foreground hover:text-foreground"
      }`}
      aria-label="音声を再生"
    >
      <Volume2 className="h-4 w-4" />
    </button>
  )
}

type LogData = {
  scores: number[]
  total_score: number
  comment: string
  grammar: { name: string; summary: string; image_url: string | null } | null
}

function ResultContent() {
  const searchParams = useSearchParams()
  const params = useParams()
  const router = useRouter()
  const logId = searchParams.get("log")
  const grammarId = params.id as string
  const [data, setData] = useState<LogData | null>(null)
  const [loading, setLoading] = useState(true)
  const [nextLoading, setNextLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!logId) { router.replace("/speaking"); return }

    supabase
      .from("speaking_logs")
      .select("scores, total_score, comment, grammar:grammar_id(name, summary, image_url)")
      .eq("id", logId)
      .single()
      .then(({ data: log }) => {
        if (!log) { router.replace("/speaking"); return }
        setData({
          scores: log.scores as number[],
          total_score: log.total_score,
          comment: log.comment,
          grammar: Array.isArray(log.grammar) ? log.grammar[0] : log.grammar as LogData["grammar"],
        })
        setLoading(false)
      })
  }, [logId, router])

  async function goToNext() {
    setNextLoading(true)

    const { data: curr } = await supabase
      .from("grammar")
      .select("created_at")
      .eq("id", grammarId)
      .single()

    let next: { id: string } | null = null

    if (curr) {
      const { data } = await supabase
        .from("grammar")
        .select("id")
        .not("image_url", "is", null)
        .or("play_count.is.null,play_count.lt.10")
        .lt("created_at", curr.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      next = data
    }

    if (next?.id) {
      router.push(`/speaking/${next.id}`)
    } else {
      router.push("/speaking")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const sections = parseComment(data.comment)

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-[25px] font-medium">評価結果</h1>
        {data.grammar && (
          <p className="text-base text-muted-foreground mt-0.5">{data.grammar.name}</p>
        )}
      </div>

      {/* Thumbnail */}
      {data.grammar?.image_url && (
        <div className="rounded-xl overflow-hidden aspect-[4/3] bg-muted w-40">
          <img src={data.grammar.image_url} alt="" className="w-full h-full object-contain" />
        </div>
      )}

      {/* Score breakdown */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">スコア</p>
        {SCORE_LABELS.map((label, i) => (
          <ScoreBar key={label} label={label} score={data.scores[i] ?? 0} />
        ))}
      </div>

      {/* Feedback */}
      {data.comment && (
        <div className="rounded-lg border bg-card p-5 space-y-5">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">スピーキングを改善しましょう</p>

          {sections ? (
            <>
              {/* Good point */}
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[color:var(--color-success)]" />
                <p className="text-sm leading-relaxed text-foreground">{sections.good}</p>
              </div>

              {/* Before / After cards */}
              {(sections.grammarBefore || sections.grammarAfter) && (
                <BeforeAfterCard
                  before={sections.grammarBefore}
                  after={sections.grammarAfter}
                  type="grammar"
                />
              )}
              {(sections.phraseBefore || sections.phraseAfter) && (
                <BeforeAfterCard
                  before={sections.phraseBefore}
                  after={sections.phraseAfter}
                  type="phrase"
                />
              )}

              {/* Example sentences */}
              {(sections.example1 || sections.example2) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">こう言うと自然</p>
                  </div>
                  <div className="space-y-2">
                    {[sections.example1, sections.example2].filter(Boolean).map((ex, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/30 px-3 py-2.5">
                        <span className="text-xs font-bold text-muted-foreground/50 mt-0.5 shrink-0">{i + 1}</span>
                        <p className="text-sm leading-relaxed flex-1">{ex}</p>
                        <SpeakButton text={ex!} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-foreground leading-relaxed">{data.comment}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push("/speaking")} className="flex-1">
          一覧に戻る
        </Button>
        <Button onClick={goToNext} disabled={nextLoading} className="flex-1">
          {nextLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          次へ進む
        </Button>
      </div>
    </div>
  )
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ResultContent />
    </Suspense>
  )
}
