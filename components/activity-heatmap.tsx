import { Card } from "@takaki/go-design-system";
import { Flame } from "lucide-react";

/**
 * 12週間（7×12=84セル）のアクティビティヒートマップ。
 * cells: 84要素。値 -1 = 未来日 / 0 = 練習なし / 1-3 = 練習量レベル。
 * 列方向（grid-flow-col）に古い週→新しい週で並ぶ。
 */
function cellStyle(level: number): React.CSSProperties {
  if (level < 0) return { background: "var(--color-surface-subtle)", opacity: 0.35 };
  if (level === 0) return { background: "var(--color-surface-subtle)" };
  return {
    background: "var(--color-primary)",
    opacity: level === 1 ? 0.3 : level === 2 ? 0.6 : 1,
  };
}

export function ActivityHeatmap({
  cells,
  monthLabels,
  streak,
  longest,
}: {
  cells: number[];
  monthLabels: string[];
  streak: number;
  longest: number;
}) {
  return (
    <Card className="border border-[var(--color-border-default)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            12週間のアクティビティ
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            <span className="font-medium text-foreground">
              {streak}日連続
            </span>
            <span>· 最長 {longest}日</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>少</span>
          {[0, 1, 2, 3].map((l) => (
            <span
              key={l}
              className="h-2.5 w-2.5 rounded-[2px]"
              style={cellStyle(l)}
            />
          ))}
          <span>多</span>
        </div>
      </div>

      <div
        className="mt-4 grid gap-[3px]"
        style={{
          gridTemplateColumns: "repeat(12, 1fr)",
          gridTemplateRows: "repeat(7, 1fr)",
          gridAutoFlow: "column",
        }}
      >
        {cells.map((level, i) => (
          <div
            key={i}
            className="aspect-square rounded-[3px]"
            style={cellStyle(level)}
          />
        ))}
      </div>

      <div className="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {monthLabels.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>
    </Card>
  );
}
