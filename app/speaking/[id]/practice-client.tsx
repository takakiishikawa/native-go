"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

const DURATION = 30

type State = "idle" | "recording" | "evaluating"

// Circular countdown SVG
function CountdownRing({ remaining, total }: { remaining: number; total: number }) {
  const r = 44
  const circumference = 2 * Math.PI * r
  const progress = remaining / total
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="6"
          className="text-muted/30" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ${remaining <= 10 ? "text-red-500" : "text-blue-500"}`}
        />
      </svg>
      <span className={`absolute text-3xl font-bold tabular-nums ${remaining <= 10 ? "text-red-500" : "text-foreground"}`}>
        {remaining}
      </span>
    </div>
  )
}

export function PracticeClient({
  grammarId,
  grammarName,
  grammarSummary,
  imageUrl,
}: {
  grammarId: string
  grammarName: string
  grammarSummary: string
  imageUrl: string
}) {
  const router = useRouter()
  const [state, setState] = useState<State>("idle")
  const [remaining, setRemaining] = useState(DURATION)
  const [transcript, setTranscript] = useState("")
  const [supported, setSupported] = useState(true)

  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcriptRef = useRef("")
  const stoppedRef = useRef(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR = window.SpeechRecognition || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
      if (!SR) setSupported(false)
    }
    return () => {
      timerRef.current && clearInterval(timerRef.current)
      recognitionRef.current?.abort()
    }
  }, [])

  const evaluate = useCallback(async (text: string) => {
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
      }
    } catch {
      router.push("/speaking")
    }
  }, [grammarId, grammarName, router])

  function startRecording() {
    const SR = window.SpeechRecognition || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    if (!SR) return

    stoppedRef.current = false
    transcriptRef.current = ""
    setTranscript("")
    setRemaining(DURATION)
    setState("recording")

    const recognition = new SR()
    recognition.lang = "en-US"
    recognition.continuous = true
    recognition.interimResults = true
    recognitionRef.current = recognition

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = ""
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + " "
      }
      transcriptRef.current = final
      setTranscript(final)
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
        stoppedRef.current = true
        evaluate(transcriptRef.current)
      }
    }, 1000)
  }

  function stopEarly() {
    stoppedRef.current = true
    timerRef.current && clearInterval(timerRef.current)
    evaluate(transcriptRef.current)
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
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold">{grammarName}</h1>
        <p className="text-sm text-muted-foreground">{grammarSummary}</p>
      </div>

      {/* Image */}
      <div className="rounded-xl overflow-hidden aspect-[4/3] bg-muted">
        <img src={imageUrl} alt={grammarName} className="w-full h-full object-cover" />
      </div>

      {/* Timer + controls */}
      {state === "idle" && (
        <div className="flex flex-col items-center gap-4 pt-2">
          <p className="text-sm text-muted-foreground">画像を見ながら英語で説明してください（30秒）</p>
          <Button size="lg" onClick={startRecording} className="gap-2 px-8">
            🎤 マイクを押して開始
          </Button>
        </div>
      )}

      {state === "recording" && (
        <div className="flex flex-col items-center gap-4">
          <CountdownRing remaining={remaining} total={DURATION} />
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-red-500">録音中</span>
          </div>
          {transcript && (
            <p className="text-xs text-muted-foreground text-center max-w-xs line-clamp-3">
              {transcript}
            </p>
          )}
          <Button variant="outline" size="lg" onClick={stopEarly} className="gap-2 px-8">
            停止して評価
          </Button>
        </div>
      )}

      {state === "evaluating" && (
        <div className="flex flex-col items-center gap-3 pt-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-muted-foreground">AIが評価中...</p>
        </div>
      )}

      {/* Quit link */}
      {state !== "evaluating" && (
        <div className="flex justify-center">
          <button
            onClick={() => router.push("/speaking")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            途中終了
          </button>
        </div>
      )}
    </div>
  )
}
