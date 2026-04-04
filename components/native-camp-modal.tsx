"use client"

import { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { upsertNativeCampLog } from "@/app/actions/practice"
import { CalendarIcon } from "lucide-react"

function formatDate(str: string): string {
  const [y, m, d] = str.split("-")
  return `${y}/${m}/${d}`
}

export function NativeCampModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const today = new Date().toISOString().split("T")[0]
  const [date, setDate] = useState(today)
  const [calendarOpen, setCalendarOpen] = useState(false)
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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">日付</label>
            <button
              type="button"
              onClick={() => setCalendarOpen((v) => !v)}
              className="flex items-center gap-2 w-full h-10 rounded-md border border-input bg-background px-3 text-sm hover:bg-muted/50 transition-colors"
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              {formatDate(date)}
            </button>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">回数</label>
            <Input
              type="number"
              min={0}
              value={count}
              onChange={(e) => setCount(Math.max(0, parseInt(e.target.value) || 0))}
            />
            <p className="text-xs text-muted-foreground">
              {count === 0 ? "お休み" : `${minutes}分`}
            </p>
          </div>
        </div>

        {calendarOpen && (
          <DatePicker
            value={date}
            onChange={(v) => {
              setDate(v)
              setCalendarOpen(false)
            }}
          />
        )}

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
