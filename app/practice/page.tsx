"use client";

import { useRouter } from "next/navigation";
import { PageHeader, Button } from "@takaki/go-design-system";
import { BookOpen, MessageSquare, Mic, Play } from "lucide-react";

function PracticeCard({
  onClick,
  icon,
  title,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Button
      onClick={onClick}
      className="group w-full text-left flex flex-col items-center gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-card px-4 py-5 hover:border-[var(--color-border-default)] hover:shadow-sm transition-all"
    >
      <span className="text-muted-foreground">{icon}</span>
      <p className="text-[15px] font-medium text-foreground text-center leading-snug">
        {title}
      </p>
    </Button>
  );
}

export default function PracticePage() {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="練習を始める"
        description="練習するカテゴリを選んでください"
      />
      <div className="grid grid-cols-4 gap-3">
        <PracticeCard
          onClick={() => router.push("/repeating/grammar")}
          icon={<BookOpen className="h-5 w-5" />}
          title="文法練習"
        />
        <PracticeCard
          onClick={() => router.push("/repeating/expression")}
          icon={<MessageSquare className="h-5 w-5" />}
          title="フレーズ練習"
        />
        <PracticeCard
          onClick={() => router.push("/speaking")}
          icon={<Mic className="h-5 w-5" />}
          title="スピーキング"
        />
        <PracticeCard
          onClick={() => router.push("/shadowing")}
          icon={<Play className="h-5 w-5" />}
          title="シャドーイング"
        />
      </div>
    </div>
  );
}