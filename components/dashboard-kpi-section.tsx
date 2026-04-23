"use client";

import { useState } from "react";
import { SectionCards, type KpiCard } from "@takaki/go-design-system";
import { NativeCampModal } from "@/components/native-camp-modal";
import { SpeakingScoreModal } from "@/components/speaking-score-modal";
import { Pencil } from "lucide-react";
import type { SpeakingScore } from "@/lib/types";

type BaseCard = Omit<KpiCard, "actions">;

// KpiCards配列内のインデックス（page.tsxの順番と一致させる）
// 0:リピーティング 1:スピーキング練習 2:NativeCamp 3:シャドーイング 4:NC AI Speaking Test
const NC_INDEX = 2;
const SPEAKING_SCORE_INDEX = 4;

function EditIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1 rounded-md text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
      aria-label="編集"
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
  );
}

export function DashboardKpiSection({
  cards,
  initialScores,
}: {
  cards: BaseCard[];
  initialScores: SpeakingScore[];
}) {
  const [ncOpen, setNcOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);

  const enriched: KpiCard[] = cards.map((card, i) => {
    if (i === NC_INDEX) {
      return {
        ...card,
        actions: <EditIconButton onClick={() => setNcOpen(true)} />,
      };
    }
    if (i === SPEAKING_SCORE_INDEX) {
      return {
        ...card,
        actions: <EditIconButton onClick={() => setScoreOpen(true)} />,
      };
    }
    return card;
  });

  return (
    <>
      <SectionCards cards={enriched} />
      <NativeCampModal open={ncOpen} onClose={() => setNcOpen(false)} />
      <SpeakingScoreModal
        open={scoreOpen}
        onClose={() => setScoreOpen(false)}
        initialScores={initialScores}
      />
    </>
  );
}
