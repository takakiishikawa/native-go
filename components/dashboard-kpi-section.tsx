"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Tag,
} from "@takaki/go-design-system";
import { Pencil } from "lucide-react";
import type { SpeakingScore } from "@/lib/types";

const NativeCampModal = dynamic(
  () =>
    import("@/components/native-camp-modal").then((m) => ({
      default: m.NativeCampModal,
    })),
  { ssr: false },
);
const SpeakingScoreModal = dynamic(
  () =>
    import("@/components/speaking-score-modal").then((m) => ({
      default: m.SpeakingScoreModal,
    })),
  { ssr: false },
);

export type DashboardKpi = {
  title: string;
  value: string;
  /** 達成率 (105 → 105%)。null/undefinedの時は表示しない */
  ratio?: number | null;
  /** 先週との差分（符号付き）。null/undefinedの時は表示しない */
  weekDiff?: number | null;
  /** weekDiff の単位 (回, 分 等) */
  diffUnit?: string;
};

const NC_INDEX = 2;
const SPEAKING_SCORE_INDEX = 4;

function EditIconButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      className="p-1 rounded-md text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
      aria-label="編集"
      variant="ghost"
    >
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  );
}

function KpiCardItem({
  card,
  actions,
}: {
  card: DashboardKpi;
  actions?: React.ReactNode;
}) {
  const ratioTagColor =
    card.ratio != null && card.ratio >= 100 ? "success" : "default";
  const diffTagColor =
    card.weekDiff != null && card.weekDiff > 0 ? "success" : "default";
  const showFooter = card.ratio != null || card.weekDiff != null;

  return (
    <Card className="@container/card relative shadow-xs bg-gradient-to-t from-primary/5 to-card">
      {actions && <div className="absolute top-2 right-2 z-10">{actions}</div>}
      <CardHeader className="pb-2">
        <CardDescription>{card.title}</CardDescription>
        <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
          {card.value}
        </CardTitle>
      </CardHeader>
      {showFooter && (
        <CardFooter className="flex-wrap items-center gap-2 pt-0 text-sm">
          {card.ratio != null && <Tag color={ratioTagColor}>{card.ratio}%</Tag>}
          {card.weekDiff != null && (
            <Tag color={diffTagColor}>
              先週比 {card.weekDiff > 0 ? "+" : ""}
              {card.weekDiff}
              {card.diffUnit ?? ""}
            </Tag>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

export function DashboardKpiSection({
  cards,
  initialScores,
}: {
  cards: DashboardKpi[];
  initialScores: SpeakingScore[];
}) {
  const [ncOpen, setNcOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);

  return (
    <>
      <div className="@xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 gap-3">
        {cards.map((card, i) => {
          let actions: React.ReactNode;
          if (i === NC_INDEX)
            actions = <EditIconButton onClick={() => setNcOpen(true)} />;
          else if (i === SPEAKING_SCORE_INDEX)
            actions = <EditIconButton onClick={() => setScoreOpen(true)} />;
          return <KpiCardItem key={i} card={card} actions={actions} />;
        })}
      </div>
      <NativeCampModal open={ncOpen} onClose={() => setNcOpen(false)} />
      <SpeakingScoreModal
        open={scoreOpen}
        onClose={() => setScoreOpen(false)}
        initialScores={initialScores}
      />
    </>
  );
}
