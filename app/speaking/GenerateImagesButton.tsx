"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, ImageIcon } from "lucide-react"
import { toast } from "sonner"

const BATCH_SIZE = 3

export function GenerateImagesButton({ items }: { items: { id: string; name: string }[] }) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  async function handleGenerate() {
    setLoading(true)
    setProgress(0)
    let totalFailed = 0
    let firstError: string | undefined

    try {
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE)

        try {
          const res = await fetch("/api/generate-images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: batch }),
          })

          // Read as text first to handle non-JSON responses (e.g. timeout HTML page)
          const text = await res.text()
          let data: { error?: string; results?: { status: string; reason?: string }[] }
          try {
            data = JSON.parse(text)
          } catch {
            throw new Error(`サーバーエラー (HTTP ${res.status})`)
          }

          if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

          const failed = (data.results ?? []).filter((r) => r.status === "error")
          totalFailed += failed.length
          if (failed.length > 0 && !firstError) firstError = failed[0]?.reason ?? "APIエラー"
        } catch (e) {
          totalFailed += batch.length
          if (!firstError) firstError = e instanceof Error ? e.message : "APIエラー"
        }

        setProgress(Math.min(i + BATCH_SIZE, items.length))
      }

      if (totalFailed > 0) {
        toast.error(`${totalFailed}件の生成に失敗: ${firstError}`)
      } else {
        toast.success("画像生成完了！ページを更新してください")
      }
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  const label = loading
    ? `生成中... (${progress}/${items.length}件)`
    : `画像を生成 (${items.length}件)`

  return (
    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
      {label}
    </Button>
  )
}
