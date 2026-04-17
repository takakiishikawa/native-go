"use client"

import Link from "next/link"
import { BookOpen, MessageSquare, Mic, Play, ChevronRight } from "lucide-react"

interface Props {
  grammarsInProgress: number
  expressionsInProgress: number
  grammarDone: number
  expressionDone: number
  speakingInProgress: number
  speakingDone: number
}

function CTACard({
  href,
  icon,
  iconBg,
  iconColor,
  label,
  sub,
}: {
  href: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  label: string
  sub: string
}) {
  return (
    <Link href={href}>
      <div className="group flex items-center gap-3 rounded-[12px] border border-[var(--border-subtle,rgba(0,0,0,0.08))] bg-card px-4 py-3 hover:border-[var(--border-default,rgba(0,0,0,0.12))] hover:shadow-sm transition-all cursor-pointer">
        <div className={`rounded-[8px] p-2 shrink-0 transition-colors ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-foreground">{label}</p>
          <p className="text-[13px] text-muted-foreground mt-0.5">{sub}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  )
}

export function CTASection({
  grammarsInProgress,
  expressionsInProgress,
  grammarDone,
  expressionDone,
  speakingInProgress,
  speakingDone,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <CTACard
        href="/repeating/grammar"
        icon={<BookOpen className="h-4 w-4" />}
        iconBg="bg-accent"
        iconColor="text-primary"
        label="文法リピーティング"
        sub={`練習中 ${grammarsInProgress} / 完了 ${grammarDone}`}
      />
      <CTACard
        href="/repeating/expression"
        icon={<MessageSquare className="h-4 w-4" />}
        iconBg="bg-[#F0FDFA] dark:bg-[#0D9488]/10"
        iconColor="text-[#0D9488] dark:text-[#14B8A6]"
        label="フレーズリピーティング"
        sub={`練習中 ${expressionsInProgress} / 完了 ${expressionDone}`}
      />
      <CTACard
        href="/speaking"
        icon={<Mic className="h-4 w-4" />}
        iconBg="bg-[#FFFBEB] dark:bg-[#D97706]/10"
        iconColor="text-[#D97706] dark:text-[#F59E0B]"
        label="スピーキング"
        sub={`練習中 ${speakingInProgress} / 完了 ${speakingDone}`}
      />
      <CTACard
        href="/shadowing"
        icon={<Play className="h-4 w-4" />}
        iconBg="bg-[#FEF2F2] dark:bg-[#DC2626]/10"
        iconColor="text-[#DC2626] dark:text-[#EF4444]"
        label="シャドーイング"
        sub="YouTubeで練習する"
      />
    </div>
  )
}
