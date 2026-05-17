"use client";

import * as React from "react";
import { Area, AreaChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const ACCENT: Record<string, string> = {
  minutes: "var(--color-chart-1)",
  calls: "var(--color-chart-2)",
  cost: "var(--color-chart-3)",
  avg: "var(--color-chart-4)",
};

type SparkPoint = { date: string; value: number };

export function MetricKpiCard({
  title,
  value,
  accent = "minutes",
  sparkline,
  className,
}: {
  title: string;
  value: string;
  accent?: keyof typeof ACCENT;
  sparkline: SparkPoint[];
  className?: string;
}) {
  const color = ACCENT[accent] ?? ACCENT.minutes;
  const chartConfig = {
    value: { label: title, color },
  } satisfies ChartConfig;

  return (
    <Card
      size="sm"
      className={cn(
        "ring-1 overflow-hidden",
        className,
      )}
      style={{
        boxShadow: `inset 0 -24px 48px -32px color-mix(in oklch, ${color} 35%, transparent)`,
      }}
    >
      <CardHeader className="pb-0">
        <CardTitle className="text-muted-foreground text-xs font-normal">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        {sparkline.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-[3/1] h-12 w-full"
            initialDimension={{ width: 200, height: 48 }}
          >
            <AreaChart data={sparkline} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill-${accent}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={`url(#fill-${accent})`}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="bg-muted/30 h-12 rounded-md" />
        )}
      </CardContent>
    </Card>
  );
}
