"use client"

import { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { upsertNativeCampLog } from "@/app/actions/practice"

export function NativeCampModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const today = new Date().toISOString().split("T")[0]
  const [date, setDate] = useState(today)
  const [count, setCount] = useState(1)
  const [saving, setSaving] = useState(false)

  const minutes = count * 25

  async function handleSave() {
    setSaving(true)
    await upsertNativeCampLog(date, count)
    setSaving(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Native Camp 記録">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">日付</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">回数</label>
          <Input
            type="number"
            min={1}
            value={count}
            onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
          />
          <p className="text-xs text-muted-foreground">自動計算：{minutes}分（回数 × 25分）</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "保存中..." : "保存"}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            キャンセル
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
