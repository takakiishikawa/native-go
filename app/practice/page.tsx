"use client"

import { useRouter } from "next/navigation"
import { BookOpen, MessageSquare, Mic, Play } from "lucide-react"

function PracticeCard({
  onClick,
  icon,
  iconBg,
  iconColor,
  title,
}: {
  onClick: () => void
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  title: string
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left flex flex-col items-center gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-card px-4 py-5 hover:border-[var(--color-border-default)] hover:shadow-sm transition-all"
    >
      <div className={`rounded-lg p-2.5 ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <p className="text-[15px] font-medium text-foreground text-center leading-snug">{title}</p>
    </button>
  )
}

export default function PracticePage() {
  const router = useRouter()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-[25px] font-medium">練習を始める</h1>
        <p className="text-sm text-muted-foreground mt-1">練習するカテゴリを選んでください</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <PracticeCard
          onClick={() => router.push("/repeating/grammar")}
          icon={<BookOpen className="h-5 w-5" />}
          iconBg="bg-accent"
          iconColor="text-primary"
          title="文法練習"
        />
        <PracticeCard
          onClick={() => router.push("/repeating/expression")}
          icon={<MessageSquare className="h-5 w-5" />}
          iconBg="bg-[color:var(--color-phrase)]/10"
          iconColor="text-[color:var(--color-phrase)]"
          title="フレーズ練習"
        />
        <PracticeCard
          onClick={() => router.push("/speaking")}
          icon={<Mic className="h-5 w-5" />}
          iconBg="bg-[color:var(--color-speaking)]/10"
          iconColor="text-[color:var(--color-speaking)]"
          title="スピーキング"
        />
        <PracticeCard
          onClick={() => router.push("/shadowing")}
          icon={<Play className="h-5 w-5" />}
          iconBg="bg-destructive/10"
          iconColor="text-destructive"
          title="シャドーイング"
        />
      </div>
    </div>
  )
}
