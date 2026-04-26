"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  type ChartConfig,
} from "@takaki/go-design-system";

interface RechartsChartProps {
  data: Record<string, unknown>[];
  config: ChartConfig;
  xKey: string;
  yKeys: string[];
  lineKeys: string[];
  baseline?: number;
  yDomain?: [number | string, number | string];
}

function RechartsChart({
  data,
  config,
  xKey,
  yKeys,
  lineKeys,
  baseline,
  yDomain,
}: RechartsChartProps) {
  return (
    <div className="h-[160px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
          />
          <YAxis
            domain={yDomain ?? ["auto", "auto"]}
            tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--color-border)",
            }}
          />
          {yKeys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              name={config[key]?.label as string | undefined}
              fill={(config[key]?.color as string | undefined) ?? "var(--color-primary)"}
              radius={[2, 2, 0, 0]}
            />
          ))}
          {lineKeys.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={config[key]?.label as string | undefined}
              stroke={(config[key]?.color as string | undefined) ?? "var(--color-primary)"}
              strokeWidth={1.5}
              dot={false}
            />
          ))}
          {baseline !== undefined && (
            <ReferenceLine y={baseline} stroke="var(--color-border)" strokeDasharray="4 2" />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

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
