"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Loader2, Star } from "lucide-react"

const SCORE_LABELS = [
  { label: "画像の描写度",    icon: "🖼️" },
  { label: "推奨文法の使用",  icon: "📝" },
  { label: "表現の豊かさ",    icon: "✨" },
  { label: "流暢さ・話した量", icon: "🎙️" },
  { label: "全体の自然さ",    icon: "🌐" },
]

// Parse structured comment: [GOOD]...\n[UPGRADE]...\n[GRAMMAR]...
function parseComment(raw: string) {
  const goodMatch = raw.match(/\[GOOD\]([\s\S]*?)(?=\[UPGRADE\]|\[GRAMMAR\]|$)/)
  const upgradeMatch = raw.match(/\[UPGRADE\]([\s\S]*?)(?=\[GRAMMAR\]|$)/)
  const grammarMatch = raw.match(/\[GRAMMAR\]([\s\S]*)$/)
  if (goodMatch && upgradeMatch && grammarMatch) {
    return {
      goodPoint: goodMatch[1].trim(),
      upgrade: upgradeMatch[1].trim(),
      grammarNote: grammarMatch[1].trim(),
    }
  }
  return null
}

function StarRow({ score }: { score: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
        />
      ))}
    </span>
  )
}

function TotalStars({ total }: { total: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-6 w-6 ${i <= Math.round(total) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
        />
      ))}
      <span className="text-xl font-bold ml-1">{total}</span>
      <span className="text-muted-foreground">/ 5</span>
    </div>
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
    const { data: next } = await supabase
      .from("grammar")
      .select("id")
      .not("image_url", "is", null)
      .or("play_count.is.null,play_count.lt.10")
      .neq("id", grammarId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

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
        <h1 className="text-2xl font-bold">評価結果</h1>
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

      {/* Total score */}
      <div className="rounded-xl border bg-card p-5 space-y-1">
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">総合評価</p>
        <TotalStars total={data.total_score} />
      </div>

      {/* Score breakdown */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">内訳</p>
        {SCORE_LABELS.map(({ label, icon }, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-base w-5 text-center">{icon}</span>
            <span className="text-sm text-muted-foreground flex-1">{label}</span>
            <StarRow score={data.scores[i] ?? 0} />
            <span className="text-sm font-medium w-4 text-right tabular-nums">{data.scores[i] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Comment */}
      {data.comment && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">コメント</p>
          {sections ? (
            <div className="space-y-3 text-sm leading-relaxed">
              <div>
                <p className="font-medium text-green-600 dark:text-green-400 mb-0.5">✓ グッドポイント</p>
                <p className="text-foreground">{sections.goodPoint}</p>
              </div>
              <div>
                <p className="font-medium text-blue-600 dark:text-blue-400 mb-0.5">↑ アップグレード提案</p>
                <p className="text-foreground">{sections.upgrade}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground mb-0.5">◎ 文法について</p>
                <p className="text-foreground">{sections.grammarNote}</p>
              </div>
            </div>
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
          {nextLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
