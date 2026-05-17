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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

/** Pick the first key on a row that isn't a series key (defensive x-axis resolution). */
function inferXKey(
  block: ChartBlock,
  fallback = "date",
): string {
  const first = block.data[0];
  if (!first) return fallback;
  if (fallback in first) return fallback;
  const seriesKeys = new Set(block.series.map((s) => s.key));
  for (const k of Object.keys(first)) {
    if (!seriesKeys.has(k)) return k;
  }
  return fallback;
}

function categoryTickFormatter(value: unknown): string {
  if (typeof value !== "string") return String(value);
  // Keep dates formatted; for categorical labels, truncate long strings.
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return formatDateLabel(value);
  return value.length > 14 ? `${value.slice(0, 13)}…` : value;
}

export function MetricsStackedBarChart({
  title,
  block,
  className,
  yLabel,
  xKey,
}: {
  title: string;
  block: ChartBlock;
  className?: string;
  yLabel?: string;
  xKey?: string;
}) {
  const config = React.useMemo(() => buildConfig(block.series), [block.series]);
  const hasData = block.data.length > 0 && block.series.length > 0;
  const chartReady = useNavigationSettled();
  const resolvedXKey = xKey ?? inferXKey(block);
  const isDateAxis = resolvedXKey === "date";

  return (
    <Card size="sm" className={cn("flex flex-col", className)}>
      <CardHeader className="pb-3">
        <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]">
          {title}
        </p>
      </CardHeader>
      <CardContent className="min-h-[240px] flex-1 pb-4">
        {!hasData ? (
          <p className="text-muted-foreground flex h-[220px] items-center justify-center text-sm">
            No data for this period.
          </p>
        ) : !chartReady ? (
          <ChartPlotPlaceholder />
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
            <BarChart
              data={block.data}
              margin={{ top: 8, right: 8, left: 0, bottom: isDateAxis ? 0 : 16 }}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.4} />
              <XAxis
                dataKey={resolvedXKey}
                tickLine={false}
                axisLine={false}
                tickFormatter={isDateAxis ? formatDateLabel : categoryTickFormatter}
                fontSize={10}
                interval={0}
                angle={isDateAxis ? 0 : -20}
                textAnchor={isDateAxis ? "middle" : "end"}
                height={isDateAxis ? 24 : 48}
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
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  stackId="a"
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  radius={[2, 2, 0, 0]}
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
  xKey,
}: {
  title: string;
  block: ChartBlock;
  className?: string;
  yLabel?: string;
  xKey?: string;
}) {
  const config = React.useMemo(() => buildConfig(block.series), [block.series]);
  const hasData = block.data.length > 0 && block.series.length > 0;
  const chartReady = useNavigationSettled();
  const resolvedXKey = xKey ?? inferXKey(block);
  const isDateAxis = resolvedXKey === "date";

  return (
    <Card size="sm" className={cn("flex flex-col", className)}>
      <CardHeader className="pb-3">
        <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]">
          {title}
        </p>
      </CardHeader>
      <CardContent className="min-h-[240px] flex-1 pb-4">
        {!hasData ? (
          <p className="text-muted-foreground flex h-[220px] items-center justify-center text-sm">
            No data available for this period.
          </p>
        ) : !chartReady ? (
          <ChartPlotPlaceholder />
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
            <AreaChart data={block.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.4} />
              <XAxis
                dataKey={resolvedXKey}
                tickLine={false}
                axisLine={false}
                tickFormatter={isDateAxis ? formatDateLabel : categoryTickFormatter}
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
