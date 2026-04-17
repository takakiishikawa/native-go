"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2 } from "lucide-react"
import type { PastLog } from "./page"

const DURATION = 30
const TOTAL_REQUIRED = 3

type State = "idle" | "recording" | "evaluating" | "error"

function CountdownRing({ remaining, total }: { remaining: number; total: number }) {
  const r = 44
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - remaining / total)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
          className={`transition-all duration-1000 ${remaining <= 10 ? "text-red-500" : "text-blue-500"}`}
        />
      </svg>
      <span className={`absolute text-3xl font-bold tabular-nums ${remaining <= 10 ? "text-red-500" : "text-foreground"}`}>
        {remaining}
      </span>
    </div>
  )
}

function parseGoodPoint(raw: string) {
  // Support both new format [GOOD] and old format [GOOD]/[UPGRADE]/[GRAMMAR]
  const m = raw.match(/\[GOOD\]([\s\S]*?)(?=\[|$)/)
  return m ? m[1].trim() : null
}

function PastFeedbackCard({ log, index }: { log: PastLog; index: number }) {
  const good = parseGoodPoint(log.comment)
  const label = index === 0 ? "前回のフィードバック" : `${index + 1}回前のフィードバック`
  const avg = Array.isArray(log.scores) && log.scores.length > 0
    ? Math.round(log.scores.reduce((a: number, b: number) => a + b, 0) / log.scores.length)
    : log.total_score

  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">{avg}<span className="font-normal">/100</span></span>
      </div>
      {good ? (
        <p className="flex items-start gap-1.5 text-xs leading-relaxed">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
          <span className="text-foreground">{good}</span>
        </p>
      ) : (
        <p className="text-xs text-foreground leading-relaxed line-clamp-3">{log.comment}</p>
      )}
    </div>
  )
}

export function PracticeClient({
  grammarId,
  grammarName,
  grammarSummary,
  imageUrl,
  completedCount,
  pastLogs,
}: {
  grammarId: string
  grammarName: string
  grammarSummary: string
  imageUrl: string
  completedCount: number
  pastLogs: PastLog[]
}) {
  const router = useRouter()
  const [state, setState] = useState<State>("idle")
  const [remaining, setRemaining] = useState(DURATION)
  const [finalText, setFinalText] = useState("")
  const [interimText, setInterimText] = useState("")
  const [errorDetail, setErrorDetail] = useState("")
  const [supported, setSupported] = useState(true)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcriptRef = useRef("")
  const stoppedRef = useRef(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any
      const SR = w.SpeechRecognition || w.webkitSpeechRecognition
      if (!SR) setSupported(false)
    }
    return () => {
      timerRef.current && clearInterval(timerRef.current)
      recognitionRef.current?.abort()
    }
  }, [])

  const evaluate = useCallback(async (text: string) => {
    if (stoppedRef.current) return
    stoppedRef.current = true

    setState("evaluating")
    timerRef.current && clearInterval(timerRef.current)
    recognitionRef.current?.abort()

    try {
      const res = await fetch("/api/speaking-eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grammarId, grammarName, speechText: text }),
      })
      const data = await res.json()
      if (data.logId) {
        router.push(`/speaking/${grammarId}/result?log=${data.logId}`)
      } else {
        const msg = data.error ?? `HTTP ${res.status}`
        console.error("speaking-eval error:", msg)
        setErrorDetail(msg)
        setState("error")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("speaking-eval fetch error:", msg)
      setErrorDetail(msg)
      setState("error")
    }
  }, [grammarId, grammarName, router])

  function startRecording() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return

    stoppedRef.current = false
    transcriptRef.current = ""
    setFinalText("")
    setInterimText("")
    setErrorDetail("")
    setRemaining(DURATION)
    setState("recording")

    const recognition = new SR()
    recognition.lang = "en-US"
    recognition.continuous = true
    recognition.interimResults = true
    recognitionRef.current = recognition

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let final = ""
      let interim = ""
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + " "
        } else {
          interim += event.results[i][0].transcript
        }
      }
      transcriptRef.current = final
      setFinalText(final)
      setInterimText(interim)
    }

    recognition.onerror = () => {
      if (!stoppedRef.current) evaluate(transcriptRef.current)
    }

    recognition.start()

    let count = DURATION
    timerRef.current = setInterval(() => {
      count--
      setRemaining(count)
      if (count <= 0) {
        clearInterval(timerRef.current!)
        evaluate(transcriptRef.current)
      }
    }, 1000)
  }

  function stopEarly() {
    if (stoppedRef.current) return
    timerRef.current && clearInterval(timerRef.current)
    evaluate(transcriptRef.current)
  }

  function retry() {
    stoppedRef.current = false
    setState("idle")
    setRemaining(DURATION)
    setFinalText("")
    setInterimText("")
    setErrorDetail("")
    transcriptRef.current = ""
  }

  if (!supported) {
    return (
      <div className="max-w-lg mx-auto space-y-4 text-center pt-16">
        <p className="text-muted-foreground">
          このブラウザは音声認識に対応していません。
          <br />Chrome または Edge をお使いください。
        </p>
        <Button variant="outline" onClick={() => router.push("/speaking")}>一覧に戻る</Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="-mt-2 flex items-center justify-between gap-2">
        <h1 className="font-semibold text-base line-clamp-1">{grammarName}</h1>
        <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
          {completedCount} / {TOTAL_REQUIRED} 回
        </span>
      </div>

      {/* Image */}
      <div className="-mx-6 bg-muted/30 flex items-center justify-center overflow-hidden max-h-[60vh]">
        <img src={imageUrl} alt={grammarName} className="w-full max-h-[60vh] object-contain" />
      </div>

      <div className="max-w-lg mx-auto space-y-3">
        {/* Grammar summary */}
        <p className="text-sm text-muted-foreground leading-relaxed">{grammarSummary}</p>

        {/* Past feedback (shown on 2nd / 3rd session) */}
        {pastLogs.length > 0 && state === "idle" && (
          <div className="space-y-2">
            {pastLogs.map((log, i) => (
              <PastFeedbackCard key={i} log={log} index={i} />
            ))}
          </div>
        )}

        {/* Controls */}
        {state === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <Button size="lg" onClick={startRecording} className="gap-2 px-8">
              🎤 録音スタート
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/speaking")}>
              途中終了
            </Button>
          </div>
        )}

        {state === "recording" && (
          <div className="flex flex-col items-center gap-3">
            <CountdownRing remaining={remaining} total={DURATION} />
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-red-500">録音中</span>
            </div>
            <div className="w-full rounded-lg border bg-muted/20 px-4 py-3 min-h-[56px]">
              {finalText || interimText ? (
                <p className="text-sm leading-relaxed">
                  <span className="text-foreground">{finalText}</span>
                  <span className="text-muted-foreground italic">{interimText}</span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic">話してください...</p>
              )}
            </div>
            <Button variant="outline" size="lg" onClick={stopEarly} className="gap-2 px-8">
              停止して評価
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                stoppedRef.current = true
                timerRef.current && clearInterval(timerRef.current)
                recognitionRef.current?.abort()
                router.push("/speaking")
              }}
            >
              途中終了
            </Button>
          </div>
        )}

        {state === "evaluating" && (
          <div className="flex flex-col items-center gap-3 pt-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-muted-foreground">AIが評価中...</p>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center gap-3 pt-2">
            <p className="text-sm text-destructive text-center">評価中にエラーが発生しました。</p>
            {errorDetail && (
              <p className="text-xs text-muted-foreground text-center break-all max-w-xs">{errorDetail}</p>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={retry}>もう一度試す</Button>
              <Button variant="outline" onClick={() => router.push("/speaking")}>一覧に戻る</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
