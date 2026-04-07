"use client"

import { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateButton } from "@/components/ui/date-button"
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
  const [error, setError] = useState("")

  const minutes = count * 25

  async function handleSave() {
    setSaving(true)
    setError("")
    const result = await upsertNativeCampLog(date, count)
    setSaving(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Native Camp 記録">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">日付</label>
            <DateButton value={date} onChange={setDate} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">回数</label>
            <Input
              type="number"
              min={0}
              value={count}
              onChange={(e) => setCount(Math.max(0, parseInt(e.target.value) || 0))}
            />
            <p className="text-sm text-muted-foreground">
              {count === 0 ? "お休み" : `${minutes}分`}
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
