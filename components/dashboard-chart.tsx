"use client";

import { useId } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@takaki/go-design-system";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const TARGET_KEY = "_target";

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
  const uid = useId().replace(/:/g, "");
  const allKeys = [...yKeys, ...lineKeys];
  const hasData = data.some((d) => allKeys.some((k) => (d[k] as number) > 0));

  const augmentedData =
    baseline != null
      ? data.map((d) => ({ ...d, [TARGET_KEY]: baseline }))
      : data;

  const augmentedConfig: ChartConfig =
    baseline != null
      ? {
          ...config,
          [TARGET_KEY]: {
            label: "1日平均",
            color: "var(--color-muted-foreground)",
          },
        }
      : config;

  return (
    <Card className="shadow-sm border border-[var(--color-border-default)]">
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-[13px] font-medium text-muted-foreground uppercase tracking-[0.05em]">
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
                className="flex items-center gap-1.5 text-[15px] font-medium"
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
          <ChartContainer config={augmentedConfig} className="h-[160px] w-full">
            <ComposedChart
              data={augmentedData}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <defs>
                {yKeys.map((key) => {
                  const color =
                    (config[key]?.color as string | undefined) ??
                    "var(--color-primary)";
                  return (
                    <linearGradient
                      key={key}
                      id={`${uid}-${key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid vertical={false} strokeOpacity={0.15} />
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={30}
                domain={yDomain ?? [0, "auto"]}
                tickCount={4}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              {yKeys.map((key) => {
                const color =
                  (config[key]?.color as string | undefined) ??
                  "var(--color-primary)";
                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={1.5}
                    fill={`url(#${uid}-${key})`}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                );
              })}
              {lineKeys.map((key) => {
                const color =
                  (config[key]?.color as string | undefined) ??
                  "var(--color-muted-foreground)";
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={1.5}
                    strokeOpacity={0.45}
                    strokeDasharray="4 3"
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                );
              })}
              {baseline != null && (
                <Line
                  type="monotone"
                  dataKey={TARGET_KEY}
                  stroke="var(--color-muted-foreground)"
                  strokeOpacity={0.5}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
