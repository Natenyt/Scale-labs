"use client";

import * as React from "react";
import { Area, AreaChart } from "recharts";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  delta,
  className,
}: {
  title: string;
  value: string;
  accent?: keyof typeof ACCENT;
  sparkline: SparkPoint[];
  delta?: { label: string; positive?: boolean };
  className?: string;
}) {
  const color = ACCENT[accent] ?? ACCENT.minutes;
  const chartConfig = {
    value: { label: title, color },
  } satisfies ChartConfig;

  return (
    <Card size="sm" className={cn("flex flex-col gap-2", className)}>
      <CardHeader className="pb-0">
        <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]">
          {title}
        </p>
      </CardHeader>
      <CardContent className="grid gap-2.5">
        <div className="flex items-baseline gap-2">
          <p className="text-[26px] font-semibold tabular-nums leading-none tracking-[-0.02em]">
            {value}
          </p>
          {delta ? (
            <span
              className={cn(
                "text-[11px] font-medium tabular-nums",
                delta.positive
                  ? "text-emerald-400"
                  : delta.positive === false
                    ? "text-destructive"
                    : "text-muted-foreground",
              )}
            >
              {delta.label}
            </span>
          ) : null}
        </div>
        {sparkline.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-[4/1] h-10 w-full"
            initialDimension={{ width: 200, height: 40 }}
          >
            <AreaChart data={sparkline} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill-${accent}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={`url(#fill-${accent})`}
                strokeWidth={1.25}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="bg-muted/20 h-10 rounded-md" />
        )}
      </CardContent>
    </Card>
  );
}
