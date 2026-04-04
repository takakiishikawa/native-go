"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, ImageIcon } from "lucide-react"
import { toast } from "sonner"

export function GenerateImagesButton({ items }: { items: { id: string; name: string }[] }) {
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      const failed = (data.results ?? []).filter((r: { status: string }) => r.status === "error")
      if (failed.length > 0) {
        toast.error(`${failed.length}件の生成に失敗: ${failed[0]?.reason ?? "APIエラー"}`)
      } else {
        toast.success("画像生成完了！ページを更新してください")
      }
    } catch (e: unknown) {
      toast.error(`画像生成に失敗: ${e instanceof Error ? e.message : "不明なエラー"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
      {loading ? "生成中..." : `画像を生成 (${items.length}件)`}
    </Button>
  )
}
