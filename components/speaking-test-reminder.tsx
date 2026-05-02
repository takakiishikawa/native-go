"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@takaki/go-design-system";
import { Info } from "lucide-react";
import type { SpeakingScore } from "@/lib/types";

const SpeakingScoreModal = dynamic(
  () =>
    import("@/components/speaking-score-modal").then((m) => ({
      default: m.SpeakingScoreModal,
    })),
  { ssr: false },
);

function hasScoreThisMonth(scores: SpeakingScore[]): boolean {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return scores.some((s) => s.tested_at.startsWith(ym));
}

export function SpeakingTestReminder({
  testDay,
  initialScores,
}: {
  testDay: number;
  initialScores: SpeakingScore[];
}) {
  const [justSaved, setJustSaved] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  if (justSaved || hasScoreThisMonth(initialScores)) return null;

  return (
    <>
      <div
        role="alert"
        className="flex items-center justify-between gap-4 rounded-md border bg-[color:var(--color-info-subtle)] border-[color:var(--color-info)] text-foreground px-4 py-3"
      >
        <div className="flex items-start gap-3 min-w-0">
          <Info className="mt-0.5 size-4 shrink-0 text-[color:var(--color-info)]" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-sm font-medium leading-tight">
              今月の NC AI Speaking Test
            </p>
            <p className="text-sm text-muted-foreground">
              毎月 {testDay} 日が受検日です。スコアを記録すると非表示になります。
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setModalOpen(true)}
          className="shrink-0"
        >
          スコアを記録
        </Button>
      </div>
      <SpeakingScoreModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialScores={initialScores}
        onSaved={() => {
          setJustSaved(true);
          setModalOpen(false);
        }}
      />
    </>
  );
}
