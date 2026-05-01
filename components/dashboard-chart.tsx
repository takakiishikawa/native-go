"use client";

import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  type ChartConfig,
} from "@takaki/go-design-system";

const RechartsChart = dynamic(
  () =>
    import("./recharts-line-chart").then((m) => ({
      default: m.RechartsLineChart,
    })),
  {
    ssr: false,
    loading: () => <div className="h-[160px]" />,
  },
);

interface DashboardChartProps {
  title: string;
  data: Record<string, unknown>[];
  config: ChartConfig;
  xKey: string;
  yKeys: string[];
  lineKeys?: string[];
  unit?: string;
  baseline?: number;
  yDomain?: [number | string, number | string];
  emptyText?: string;
}

export function DashboardChart({
  title,
  data,
  config,
  xKey,
  yKeys,
  lineKeys = [],
  unit = "",
  baseline,
  yDomain,
  emptyText,
}: DashboardChartProps) {
  const allKeys = [...yKeys, ...lineKeys];
  const hasData = data.some((d) => allKeys.some((k) => (d[k] as number) > 0));

  return (
    <Card className="border border-border border border-[var(--color-border-default)]">
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-[0.05em]">
          {title}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1.5">
          {yKeys.map((key) => {
            const total = data.reduce(
              (sum, d) => sum + ((d[key] as number) ?? 0),
              0,
            );
            const color =
              (config[key]?.color as string | undefined) ??
              "var(--color-primary)";
            return (
              <span
                key={key}
                className="flex items-center gap-1.5 text-sm font-medium"
                style={{ color }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: color }}
                />
                {config[key]?.label}{" "}
                <span className="tabular-nums">
                  {total}
                  {unit}
                </span>
              </span>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4 pt-2">
        {!hasData ? (
          <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">
            {emptyText ?? "データが溜まるとグラフが表示されます"}
          </div>
        ) : (
          <RechartsChart
            data={data}
            config={config}
            xKey={xKey}
            yKeys={yKeys}
            lineKeys={lineKeys}
            baseline={baseline}
            yDomain={yDomain}
          />
        )}
      </CardContent>
    </Card>
  );
}
