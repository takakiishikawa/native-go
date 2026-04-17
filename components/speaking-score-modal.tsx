"use client"

import { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateButton } from "@/components/ui/date-button"
import { saveSpeakingScore, deleteSpeakingScore } from "@/app/actions/practice"
import { Trash2 } from "lucide-react"
import type { SpeakingScore } from "@/lib/types"

export function SpeakingScoreModal({
  open,
  onClose,
  initialScores,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  initialScores: SpeakingScore[]
  onSaved?: () => void
}) {
  const today = new Date().toISOString().split("T")[0]
  const [date, setDate] = useState(today)
  const [score, setScore] = useState(70)
  const [saving, setSaving] = useState(false)
  const [scores, setScores] = useState(
    [...initialScores].sort((a, b) => b.tested_at.localeCompare(a.tested_at))
  )

  async function handleSave() {
    setSaving(true)
    try {
      const newScore = await saveSpeakingScore(date, score)
      if (newScore) {
        setScores((prev) =>
          [newScore as SpeakingScore, ...prev].sort((a, b) =>
            b.tested_at.localeCompare(a.tested_at)
          )
        )
        onSaved?.()
      }
    } catch {}
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await deleteSpeakingScore(id)
    setScores((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <Dialog open={open} onClose={onClose} title="Speaking スコア記録">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">日付</label>
            <DateButton value={date} onChange={setDate} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">スコア（0〜100）</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) =>
                setScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))
              }
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>

        {scores.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              過去の記録
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {scores.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md bg-muted px-3 py-2"
                >
                  <span className="text-sm text-muted-foreground">
                    {s.tested_at.replace(/-/g, "/")}
                  </span>
                  <span className="text-sm font-semibold ml-auto mr-3">{s.score}点</span>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="削除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
