"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import { useNavigationSettled } from "@/components/navigation/navigation-pending";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ChartBlock } from "@/lib/metrics/metrics-api";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function buildConfig(series: ChartBlock["series"]): ChartConfig {
  const config: ChartConfig = {};
  series.forEach((s, i) => {
    config[s.key] = {
      label: s.label,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  });
  return config;
}

function ChartPlotPlaceholder() {
  return <Skeleton className="h-[220px] w-full rounded-md" />;
}

function formatDateLabel(date: string): string {
  if (date.includes("W")) return date;
  try {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return date;
  }
}

export function MetricsStackedBarChart({
  title,
  block,
  className,
  yLabel,
}: {
  title: string;
  block: ChartBlock;
  className?: string;
  yLabel?: string;
}) {
  const config = React.useMemo(() => buildConfig(block.series), [block.series]);
  const hasData = block.data.length > 0 && block.series.length > 0;
  const chartReady = useNavigationSettled();

  return (
    <Card size="sm" className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="min-h-[220px] flex-1 pb-4">
        {!hasData ? (
          <p className="text-muted-foreground flex h-[200px] items-center justify-center text-sm">
            No data for this period.
          </p>
        ) : !chartReady ? (
          <ChartPlotPlaceholder />
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[220px] w-full">
            <BarChart data={block.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickFormatter={formatDateLabel}
                fontSize={10}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={10}
                label={
                  yLabel
                    ? { value: yLabel, angle: -90, position: "insideLeft", fontSize: 10 }
                    : undefined
                }
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {block.series.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  stackId="a"
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  radius={[0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function MetricsAreaChart({
  title,
  block,
  className,
  yLabel,
}: {
  title: string;
  block: ChartBlock;
  className?: string;
  yLabel?: string;
}) {
  const config = React.useMemo(() => buildConfig(block.series), [block.series]);
  const hasData = block.data.length > 0 && block.series.length > 0;
  const chartReady = useNavigationSettled();

  return (
    <Card size="sm" className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="min-h-[220px] flex-1 pb-4">
        {!hasData ? (
          <p className="text-muted-foreground flex h-[200px] items-center justify-center text-sm">
            No data available for this period.
          </p>
        ) : !chartReady ? (
          <ChartPlotPlaceholder />
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[220px] w-full">
            <AreaChart data={block.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickFormatter={formatDateLabel}
                fontSize={10}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={10}
                label={
                  yLabel
                    ? { value: yLabel, angle: -90, position: "insideLeft", fontSize: 10 }
                    : undefined
                }
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {block.series.length > 1 ? (
                <ChartLegend content={<ChartLegendContent />} />
              ) : null}
              {block.series.map((s, i) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  stackId={block.series.length > 1 ? "a" : undefined}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
