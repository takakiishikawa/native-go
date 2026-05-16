"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@takaki/go-design-system";

/**
 * 12週間（7行×12列＝84セル）のアクティビティヒートマップ。
 * Claude Design「A · Studio」の配色をそのまま採用したモノトーンランプ。
 * 列方向（grid-flow-col）に古い週→新しい週で並ぶ。
 * GitHub のように hover で日付と回数を tooltip 表示する。
 */

// Studio: ['#f1ede5', '#dfd6c2', '#a39a87', '#1a1814']
const HEAT = [
  "bg-[#f1ede5] dark:bg-[#262430]",
  "bg-[#dfd6c2] dark:bg-[#3b3747]",
  "bg-[#a39a87] dark:bg-[#6e697d]",
  "bg-[#1a1814] dark:bg-[#eceaf2]",
];

export type HeatmapCell = {
  date: string;
  count: number;
  future: boolean;
};

function level(count: number): number {
  if (count <= 0) return 0;
  if (count < 10) return 1;
  if (count < 25) return 2;
  return 3;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(date + "T00:00:00"));
}

export function ActivityHeatmap({
  cells,
  monthLabels,
  streak,
  longest,
}: {
  cells: HeatmapCell[];
  monthLabels: string[];
  streak: number;
  longest: number;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-[var(--color-border-default)] bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
          12週間のアクティビティ
        </h3>
        <p className="text-[12px] text-muted-foreground">
          <span className="font-semibold text-foreground">{streak}</span>
          日連続 · 最長 {longest}日
        </p>
      </div>

      <TooltipProvider delayDuration={0}>
        <div
          className="mt-6 grid flex-1"
          style={{
            gridTemplateColumns: "repeat(12, 1fr)",
            gridTemplateRows: "repeat(7, 1fr)",
            gridAutoFlow: "column",
            gap: "4px",
            minHeight: "112px",
          }}
        >
          {cells.map((c, i) => {
            const lv = c.future ? -1 : level(c.count);
            const label = c.future
              ? formatDate(c.date)
              : c.count > 0
                ? `${c.count}回 · ${formatDate(c.date)}`
                : `練習なし · ${formatDate(c.date)}`;
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div
                    className={`${
                      lv < 0 ? `${HEAT[0]} opacity-40` : HEAT[lv]
                    } cursor-default ring-foreground/40 transition-shadow hover:ring-1`}
                    style={{ borderRadius: "2px" }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[12px]">
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {monthLabels.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>
    </div>
  );
}
