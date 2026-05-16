/**
 * 12週間（7行×12列＝84セル）のアクティビティヒートマップ。
 * Claude Design「A · Studio」の配色をそのまま採用したモノトーンランプ。
 * cells: 84要素。値 -1 = 未来日 / 0 = 練習なし / 1-3 = 練習量レベル。
 * 列方向（grid-flow-col）に古い週→新しい週で並ぶ。
 */

// Studio: ['#f1ede5', '#dfd6c2', '#a39a87', '#1a1814']
const HEAT = [
  "bg-[#f1ede5] dark:bg-[#262430]",
  "bg-[#dfd6c2] dark:bg-[#3b3747]",
  "bg-[#a39a87] dark:bg-[#6e697d]",
  "bg-[#1a1814] dark:bg-[#eceaf2]",
];

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
    <div className="flex h-full flex-col rounded-xl border border-[var(--color-border-default)] bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
          12週間のアクティビティ
        </h3>
        <p className="text-[12px] text-muted-foreground">
          <span className="font-semibold text-foreground">{streak}</span>
          日連続 · 最長 {longest}日
        </p>
      </div>

      <div
        className="mt-5 grid flex-1"
        style={{
          gridTemplateColumns: "repeat(12, 1fr)",
          gridTemplateRows: "repeat(7, 1fr)",
          gridAutoFlow: "column",
          gap: "4px",
          minHeight: "120px",
        }}
      >
        {cells.map((level, i) => (
          <div
            key={i}
            className={
              level < 0
                ? `${HEAT[0]} opacity-40`
                : HEAT[Math.min(level, 3)]
            }
            style={{ borderRadius: "2px" }}
          />
        ))}
      </div>

      <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {monthLabels.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>
    </div>
  );
}
