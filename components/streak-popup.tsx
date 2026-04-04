"use client"

import { useEffect, useState } from "react"

function getMessage(streak: number): string {
  if (streak >= 30) return `${streak}日連続！もう生活の一部になってるね。この調子で。`
  if (streak >= 14) return `${streak}日連続練習中！本当の習慣になってきた証拠だよ。`
  if (streak >= 7) return `${streak}日連続！1週間以上続いてる。それだけで十分すごい。`
  return `${streak}日連続で練習中！いいね、その積み重ねが確実に力になってる。`
}

export function StreakPopup({ streak }: { streak: number }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (streak < 3) return
    const today = new Date().toISOString().split("T")[0]
    const key = `streak_shown_${today}`
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, "1")
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [streak])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4 pointer-events-none"
      style={{ animation: "fadeIn 0.3s ease" }}
    >
      <div
        className="pointer-events-auto bg-background border rounded-2xl shadow-2xl px-6 py-5 max-w-sm w-full flex items-start gap-4"
        style={{ animation: "slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        <span className="text-3xl select-none">🔥</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground leading-snug">{getMessage(streak)}</p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  )
}
