"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Tag,
} from "@takaki/go-design-system";
import type { SpeakingScore } from "@/lib/types";

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

function KpiCardItem({ card }: { card: DashboardKpi }) {
  const ratioTagColor =
    card.ratio != null && card.ratio >= 100 ? "success" : "default";
  const diffTagColor =
    card.weekDiff != null && card.weekDiff > 0 ? "success" : "default";
  const showFooter = card.ratio != null || card.weekDiff != null;

  return (
    <Card className="@container/card relative shadow-xs">
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
  const [scoreOpen, setScoreOpen] = useState(false);

  return (
    <>
      <div className="@xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 gap-3">
        {cards.map((card, i) => (
          <KpiCardItem key={i} card={card} />
        ))}
      </div>
      <SpeakingScoreModal
        open={scoreOpen}
        onClose={() => setScoreOpen(false)}
        initialScores={initialScores}
      />
    </>
  );
}
