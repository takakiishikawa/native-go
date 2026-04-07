"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { incrementExpressionPlayCount } from "@/app/actions/practice"
import type { Expression } from "@/lib/types"
import { Play, Square, ChevronLeft, ChevronRight, Star, CheckCircle2, Loader2 } from "lucide-react"
import { ConversationLines } from "@/components/conversation-lines"

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${i <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
        />
      ))}
    </span>
  )
}

export default function ExpressionRepeatingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [items, setItems] = useState<Expression[]>([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentLine, setCurrentLine] = useState(-1)
  const [rate, setRate] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [showComplete, setShowComplete] = useState(false)
  const [aiComment, setAiComment] = useState("")
  const [commentLoading, setCommentLoading] = useState(false)
  const cancelRef = useRef(false)
  const userCancelledRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const resumeLineRef = useRef(0)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("expressions")
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

  const fetchComment = useCallback(async () => {
    setCommentLoading(true)
    try {
      const res = await fetch("/api/repeating-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "expression" }),
      })
      const data = await res.json()
      if (data.comment) setAiComment(data.comment)
    } catch {
      // silently fail
    } finally {
      setCommentLoading(false)
    }
  }, [])

  const stopSpeech = useCallback(() => {
    cancelRef.current = true
    userCancelledRef.current = true
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
      resumeLineRef.current = lineIndex
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
    userCancelledRef.current = false
    setPlaying(true)

    let localItems = [...items]
    let localIndex = index
    const playRate = rate
    const initialCount = localItems.length
    let playCount = 0
    let startLine = resumeLineRef.current

    while (localItems.length > 0 && !cancelRef.current && playCount < initialCount) {
      const item = localItems[localIndex]
      const lines = item.conversation.split("\n").filter(Boolean)
      const fromLine = startLine
      startLine = 0 // subsequent items always start from line 0

      for (let i = fromLine; i < lines.length; i++) {
        if (cancelRef.current) break
        const ttsText = lines[i].replace(/^[AB]:\s*/i, "")
        await speakLine(ttsText, i, playRate)
        if (!cancelRef.current) {
          await pause(10)
        }
      }

      if (cancelRef.current) break

      resumeLineRef.current = 0
      setCurrentLine(-1)
      playCount++
      incrementExpressionPlayCount(item.id) // fire and forget for faster transition

      // Update play_count locally for display only — never remove items mid-session
      localItems = localItems.map((it, idx) =>
        idx === localIndex ? { ...it, play_count: it.play_count + 1 } : it
      )
      localIndex = (localIndex + 1) % localItems.length

      setItems([...localItems])
      setIndex(localIndex)
      await pause(50)
    }

    setPlaying(false)
    setCurrentLine(-1)
    if (!userCancelledRef.current) {
      setShowComplete(true)
      fetchComment()
    }
  }, [items, index, rate, speakLine, fetchComment])

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
        <p className="text-lg">練習中のフレーズはありません</p>
        <p className="text-sm">すべて完了しました！</p>
      </div>
    )
  }

  const current = items[index]
  const lines = current?.conversation.split("\n").filter(Boolean) ?? []

  return (
    <>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">フレーズリピーティング</h1>
            <p className="text-muted-foreground mt-1">
              {index + 1} / {items.length} 件
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
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
              <div>
                <Badge variant="outline" className="mb-2">{current?.category}</Badge>
                <CardTitle className="text-3xl">{current?.expression}</CardTitle>
              </div>
              <StarRating value={current?.frequency ?? 0} />
            </div>
            <p className="text-lg text-muted-foreground whitespace-pre-line leading-relaxed">{current?.meaning?.replace(/\\n/g, "\n")}</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-muted-foreground mb-3">会話</p>
            <ConversationLines lines={lines} currentLine={currentLine} />
            <p className="text-base text-muted-foreground mt-4">
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
            onClick={() => { stopSpeech(); resumeLineRef.current = 0; setIndex((i) => Math.max(0, i - 1)) }}
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
            onClick={() => { stopSpeech(); resumeLineRef.current = 0; setIndex((i) => Math.min(items.length - 1, i + 1)) }}
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
            <p className="text-muted-foreground">フレーズリピーティング 1周完了</p>
            {commentLoading ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : aiComment ? (
              <p className="text-sm text-foreground leading-relaxed">{aiComment}</p>
            ) : null}
            <Button onClick={() => router.push("/")} className="w-full">
              トップへ戻る
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
