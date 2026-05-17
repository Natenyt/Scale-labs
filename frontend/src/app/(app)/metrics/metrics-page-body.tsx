"use client";

import * as React from "react";
import Link from "next/link";

import { MetricKpiCard } from "@/components/metrics/metric-kpi-card";
import {
  MetricsAreaChart,
  MetricsStackedBarChart,
} from "@/components/metrics/metrics-chart-card";
import { QueryErrorCard } from "@/components/query/query-error-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasBackendApi } from "@/lib/api/env";
import { useMetricsQuery } from "@/lib/query/use-metrics-query";
import { cn } from "@/lib/utils";

function formatCallTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function MetricsPageBody({
  days,
  step,
  agentId,
  onReadyChange,
}: {
  days: string;
  step: string;
  agentId: string;
  onReadyChange: (ready: boolean) => void;
}) {
  const daysNum = Number(days);
  const stepVal = step as "day" | "week";
  const { data, isPending, isLoading, isFetching, error } = useMetricsQuery({
    days: daysNum,
    step: stepVal,
    agentId: agentId || undefined,
  });

  const ready = !hasBackendApi() || Boolean(data) || Boolean(error);

  React.useLayoutEffect(() => {
    onReadyChange(ready);
  }, [ready, onReadyChange]);

  if (!hasBackendApi()) {
    return <QueryErrorCard message="API is not configured." />;
  }

  if (!ready && (isPending || isLoading)) {
    return null;
  }

  if (error) {
    return (
      <QueryErrorCard
        message={error instanceof Error ? error.message : "Could not load metrics"}
      />
    );
  }

  if (!data) {
    return <QueryErrorCard message="Could not load metrics" />;
  }

  const { kpis, charts, unsuccessfulCalls } = data;

  return (
    <div className={cn("grid gap-8", isFetching && "opacity-80 transition-opacity")}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricKpiCard
          title="Total call minutes"
          value={kpis.totalMinutesLabel}
          accent="minutes"
          sparkline={kpis.sparklines.minutes}
        />
        <MetricKpiCard
          title="Number of calls"
          value={kpis.callCountLabel}
          accent="calls"
          sparkline={kpis.sparklines.calls}
        />
        <MetricKpiCard
          title="Total spent"
          value={kpis.totalCostLabel}
          accent="cost"
          sparkline={kpis.sparklines.cost}
        />
        <MetricKpiCard
          title="Average cost per call"
          value={kpis.avgCostLabel}
          accent="avg"
          sparkline={kpis.sparklines.cost}
        />
      </div>

      <section className="grid gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Call Analysis</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <MetricsStackedBarChart
            title="Reason call ended"
            block={charts.endedReason}
            yLabel="Count"
          />
          <MetricsStackedBarChart
            title="Average call duration by assistant"
            block={charts.durationByAssistant}
            yLabel="Min"
          />
          <MetricsStackedBarChart
            title="Cost breakdown"
            block={charts.costBreakdown}
            yLabel="Cost ($)"
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <MetricsStackedBarChart
          title="Call count over time"
          block={charts.callsByType}
          yLabel="Count"
        />
        <MetricsAreaChart
          title="Average call duration"
          block={charts.avgDuration}
          yLabel="Min"
        />
        <MetricsAreaChart
          title="Cost over time"
          block={charts.costOverTime}
          yLabel="Cost ($)"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <MetricsStackedBarChart
          title="Success evaluation"
          block={charts.successEval}
          yLabel="Calls"
        />
        <Card size="sm" className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unsuccessful calls</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-2 pb-4">
            {unsuccessfulCalls.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No unsuccessful calls in this period.
              </p>
            ) : (
              <ul className="divide-border/60 flex flex-1 flex-col divide-y">
                {unsuccessfulCalls.map((call) => (
                  <li key={call.id} className="flex items-start justify-between gap-2 py-3">
                    <div className="min-w-0 grid gap-0.5">
                      <p className="truncate text-sm font-medium">{call.resourceName}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatCallTime(call.startedAt)} · {call.customerNumber}
                      </p>
                    </div>
                    <Badge variant="destructive" className="shrink-0 text-[10px]">
                      {call.statusLabel}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="link" size="sm" className="mt-auto h-auto px-0">
              <Link href="/logs">View more</Link>
            </Button>
          </CardContent>
        </Card>
        <MetricsAreaChart
          title="Number of concurrent calls"
          block={charts.concurrency}
          yLabel="Concurrent"
        />
      </section>

      {data.meta.callsSampled >= data.meta.callsSampleLimit ? (
        <p className="text-muted-foreground text-center text-xs">
          Charts use up to {data.meta.callsSampleLimit} recent org calls plus Vapi analytics.
          Run more tests or narrow the date range for accuracy.
        </p>
      ) : null}
    </div>
  );
}
