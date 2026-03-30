"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { incrementGrammarPlayCount } from "@/app/actions/practice"
import type { Grammar } from "@/lib/types"
import { Play, Square, ChevronLeft, ChevronRight, Star, CheckCircle2 } from "lucide-react"

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

export default function GrammarRepeatingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [items, setItems] = useState<Grammar[]>([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentLine, setCurrentLine] = useState(-1)
  const [rate, setRate] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [showComplete, setShowComplete] = useState(false)
  const cancelRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("grammar")
        .select("*")
        .lt("play_count", 10)
        .order("created_at", { ascending: true })
      setItems(data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelRef.current = true
      audioRef.current?.pause()
    }
  }, [])

  useEffect(() => {
    if (!showComplete) return
    const timer = setTimeout(() => router.push("/"), 3000)
    return () => clearTimeout(timer)
  }, [showComplete, router])

  const stopSpeech = useCallback(() => {
    cancelRef.current = true
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlaying(false)
    setCurrentLine(-1)
  }, [])

  const speakLine = useCallback(
    async (text: string, lineIndex: number, speakRate: number): Promise<void> => {
      if (cancelRef.current) return
      setCurrentLine(lineIndex)
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, rate: speakRate }),
        })
        if (!response.ok || cancelRef.current) return
        const { audioContent } = await response.json()
        await new Promise<void>((resolve) => {
          if (cancelRef.current) { resolve(); return }
          const audio = new Audio(`data:audio/mp3;base64,${audioContent}`)
          audioRef.current = audio
          audio.onended = () => resolve()
          audio.onerror = () => resolve()
          audio.play().catch(() => resolve())
        })
      } catch {
        // continue on error
      }
    },
    []
  )

  const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

  const handlePlay = useCallback(async () => {
    if (items.length === 0) return
    cancelRef.current = false
    setPlaying(true)

    let localItems = [...items]
    let localIndex = index
    const playRate = rate
    const initialCount = localItems.length
    let playCount = 0

    while (localItems.length > 0 && !cancelRef.current && playCount < initialCount) {
      const item = localItems[localIndex]
      const examples = item.examples.split("\n").filter(Boolean)

      for (let i = 0; i < examples.length; i++) {
        if (cancelRef.current) break
        await speakLine(examples[i], i, playRate)
        if (i < examples.length - 1 && !cancelRef.current) {
          await pause(100)
        }
      }

      if (cancelRef.current) break

      setCurrentLine(-1)
      playCount++
      incrementGrammarPlayCount(item.id) // fire and forget for faster transition
      const updatedCount = item.play_count + 1

      if (updatedCount >= 10) {
        localItems = localItems.filter((_, idx) => idx !== localIndex)
        if (localItems.length === 0) {
          setItems([])
          setIndex(0)
          setPlaying(false)
          setShowComplete(true)
          return
        }
        localIndex = Math.min(localIndex, localItems.length - 1)
      } else {
        localItems = localItems.map((it, idx) =>
          idx === localIndex ? { ...it, play_count: updatedCount } : it
        )
        localIndex = (localIndex + 1) % localItems.length
      }

      setItems([...localItems])
      setIndex(localIndex)
      await pause(50)
    }

    if (!cancelRef.current) {
      setPlaying(false)
      setCurrentLine(-1)
      setShowComplete(true)
    }
  }, [items, index, rate, speakLine])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        読み込み中...
      </div>
    )
  }

  if (items.length === 0 && !showComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
        <p className="text-lg">練習中の文法はありません</p>
        <p className="text-sm">すべて完了しました！</p>
      </div>
    )
  }

  const current = items[index]
  const examples = current?.examples.split("\n").filter(Boolean) ?? []

  return (
    <>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">文法リピーティング</h1>
            <p className="text-muted-foreground mt-1">
              {index + 1} / {items.length} 件
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground text-xs"
              onClick={() => { stopSpeech(); router.push("/practice") }}
            >
              途中終了
            </Button>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {current?.play_count} / 10 回
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{current?.name}</CardTitle>
              <StarRating value={current?.frequency ?? 0} />
            </div>
            <p className="text-muted-foreground whitespace-pre-line">{current?.summary}</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium mb-3">例文:</p>
            <ul className="space-y-2">
              {examples.map((ex, i) => (
                <li
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                    i === currentLine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {ex}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              場面: {current?.usage_scene}
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm text-muted-foreground whitespace-nowrap">速度</span>
            <Slider
              min={60}
              max={140}
              step={10}
              value={[Math.round(rate * 100)]}
              onValueChange={([v]) => setRate(v / 100)}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground w-10">{rate.toFixed(1)}x</span>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => { stopSpeech(); setIndex((i) => Math.max(0, i - 1)) }}
            disabled={index === 0 || playing}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {playing ? (
            <Button onClick={stopSpeech} variant="destructive" size="lg">
              <Square className="mr-2 h-4 w-4" />
              停止
            </Button>
          ) : (
            <Button onClick={handlePlay} size="lg">
              <Play className="mr-2 h-4 w-4" />
              再生
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() => { stopSpeech(); setIndex((i) => Math.min(items.length - 1, i + 1)) }}
            disabled={index === items.length - 1 || playing}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showComplete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center space-y-4 max-w-sm mx-4 shadow-xl">
            <div className="rounded-full bg-green-100 p-4 w-20 h-20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">お疲れ様でした！</h2>
            <p className="text-muted-foreground">文法リピーティング 1周完了</p>
            <Button onClick={() => router.push("/")} className="w-full">
              トップへ戻る
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
