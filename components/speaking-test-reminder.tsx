"use client"

import { useEffect, useState } from "react"
import { SpeakingScoreModal } from "@/components/speaking-score-modal"
import type { SpeakingScore } from "@/lib/types"

export function SpeakingTestReminder({
  testDay,
  initialScores,
}: {
  testDay: number
  initialScores: SpeakingScore[]
}) {
  const [show, setShow] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const storageKey = () => {
    const now = new Date()
    return `nc_speaking_test_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  }

  useEffect(() => {
    const today = new Date().getDate()
    if (today !== testDay) return
    if (localStorage.getItem(storageKey())) return
    setShow(true)
  }, [testDay])

  function handleSaved() {
    localStorage.setItem(storageKey(), "1")
    setModalOpen(false)
    setShow(false)
  }

  if (!show) return null

  return (
    <>
      <div className="flex items-center justify-between rounded-[8px] border border-[var(--border-subtle,rgba(0,0,0,0.08))] bg-card px-4 py-3 text-[15px]">
        <span className="text-foreground">
          今月の NC AI Speaking Test の受検日です。記録しましょう。
        </span>
        <button
          onClick={() => setModalOpen(true)}
          className="ml-4 shrink-0 rounded-[6px] bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          記録する
        </button>
      </div>

      <SpeakingScoreModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialScores={initialScores}
        onSaved={handleSaved}
      />
    </>
  )
}
