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
            unit={unit}
          />
        )}
      </CardContent>
    </Card>
  );
}
