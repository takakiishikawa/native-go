"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartConfig } from "@takaki/go-design-system";

interface RechartsLineChartProps {
  data: Record<string, unknown>[];
  config: ChartConfig;
  xKey: string;
  yKeys: string[];
  lineKeys: string[];
  baseline?: number;
  yDomain?: [number | string, number | string];
  unit?: string;
}

export function RechartsLineChart({
  data,
  config,
  xKey,
  yKeys,
  lineKeys,
  baseline,
  yDomain,
  unit,
}: RechartsLineChartProps) {
  return (
    <div className="h-[160px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        >
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
            allowDecimals={false}
            width={48}
            unit={unit}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--color-border)",
            }}
          />
          {yKeys.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={config[key]?.label as string | undefined}
              stroke={
                (config[key]?.color as string | undefined) ??
                "var(--color-primary)"
              }
              strokeWidth={2}
              dot={{ r: 2.5 }}
              activeDot={{ r: 4 }}
            />
          ))}
          {lineKeys.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={config[key]?.label as string | undefined}
              stroke={
                (config[key]?.color as string | undefined) ??
                "var(--color-primary)"
              }
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
            />
          ))}
          {baseline !== undefined && (
            <ReferenceLine
              y={baseline}
              stroke="var(--color-border)"
              strokeDasharray="4 2"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
