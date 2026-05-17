"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";

import { useAgentsState } from "@/components/agents/agents-store";
import { useCompleteNavigationWhenReady } from "@/components/navigation/navigation-pending";
import { NeedsAttentionCard } from "@/components/dashboard/needs-attention-card";
import { PlanUsageCard } from "@/components/dashboard/plan-usage-card";
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card";
import { RecentCallsCard } from "@/components/dashboard/recent-calls-card";
import { WorkspaceHealthCard } from "@/components/dashboard/workspace-health-card";
import { useIntegrations } from "@/components/integrations/integrations-store";
import { MetricKpiCard } from "@/components/metrics/metric-kpi-card";
import { MetricsAreaChart } from "@/components/metrics/metrics-chart-card";
import { PageHeader } from "@/components/page-header";
import { QueryErrorCard } from "@/components/query/query-error-card";
import { useWorkflows } from "@/components/workflows/workflows-store";
import {
  DashboardChartSkeleton,
  MetricsKpiSkeletonRow,
  RecentCallsTableSkeleton,
} from "@/components/loading/page-skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { hasBackendApi } from "@/lib/api/env";
import { isDemoSession } from "@/lib/demo/constants";
import {
  greetingForHour,
  useActiveOrgName,
} from "@/lib/dashboard/use-active-org-name";
import { chartBlockFromSparkline, fetchMetrics } from "@/lib/metrics/metrics-api";
import { fetchCallLogs } from "@/lib/calls/call-logs-api";
import { fetchPhoneNumbers } from "@/lib/phone-numbers/phone-numbers-api";
import { queryKeys } from "@/lib/query/query-keys";
import {
  DASHBOARD_LOGS_DAYS,
  DASHBOARD_LOGS_LIMIT,
  DASHBOARD_METRICS_DAYS,
} from "@/lib/query/prefetch-app-data";
import { useCallLogsQuery } from "@/lib/query/use-call-logs-query";
import { useMetricsQuery } from "@/lib/query/use-metrics-query";
import { usePhoneNumbersQuery } from "@/lib/query/use-phone-numbers-query";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const orgName = useActiveOrgName();
  const queryClient = useQueryClient();
  const { agents } = useAgentsState();
  const { workflows } = useWorkflows();
  const { integrations } = useIntegrations();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const metricsQuery = useMetricsQuery({
    days: DASHBOARD_METRICS_DAYS,
    step: "day",
  });
  const logsQuery = useCallLogsQuery({
    days: DASHBOARD_LOGS_DAYS,
    limit: DASHBOARD_LOGS_LIMIT,
  });
  const phonesQuery = usePhoneNumbersQuery();

  const voiceAgentCount = React.useMemo(
    () => agents.filter((a) => /^ag_\d+$/.test(a.id)).length,
    [agents],
  );

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    return greetingForHour(hour);
  }, []);

  const metrics = metricsQuery.data;
  const kpis = metrics?.kpis;
  const recentCalls = logsQuery.data ?? [];
  const phoneNumberCount = phonesQuery.data?.length ?? 0;

  const metricsLoading =
    !metrics && (metricsQuery.isPending || metricsQuery.isLoading);
  const logsLoading =
    !logsQuery.data && (logsQuery.isPending || logsQuery.isLoading);

  const allFailed =
    hasBackendApi() &&
    metricsQuery.isError &&
    logsQuery.isError &&
    phonesQuery.isError &&
    !metrics &&
    !logsQuery.data &&
    !phonesQuery.data;

  const pageReady =
    isDemoSession() ||
    !hasBackendApi() ||
    allFailed ||
    (!metricsLoading && !logsLoading);

  useCompleteNavigationWhenReady(pageReady);

  const isFetching =
    metricsQuery.isFetching || logsQuery.isFetching || phonesQuery.isFetching;

  const refresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.fetchQuery({
          queryKey: queryKeys.metrics({
            days: DASHBOARD_METRICS_DAYS,
            step: "day",
          }),
          queryFn: () =>
            fetchMetrics({
              days: DASHBOARD_METRICS_DAYS,
              step: "day",
              fresh: true,
            }),
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.callLogs({
            days: DASHBOARD_LOGS_DAYS,
            limit: DASHBOARD_LOGS_LIMIT,
          }),
          queryFn: () =>
            fetchCallLogs({
              days: DASHBOARD_LOGS_DAYS,
              limit: DASHBOARD_LOGS_LIMIT,
            }),
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.phoneNumbers(),
          queryFn: fetchPhoneNumbers,
        }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  if (!hasBackendApi() && !isDemoSession()) {
    return <QueryErrorCard message="API is not configured." />;
  }

  if (allFailed) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 pt-4 md:pt-6">
        <QueryErrorCard message="Could not load dashboard data. Try refresh." />
      </div>
    );
  }

  if (!pageReady) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 pt-4 md:pt-6">
      <PageHeader
        eyebrow={orgName}
        title={greeting}
        description="Usage, calls, and workspace health at a glance."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            onClick={() => void refresh()}
          >
            <RefreshCwIcon
              className={cn("size-3.5", isRefreshing && "animate-spin")}
            />
            Refresh
          </Button>
        }
      />

      <div className={cn("grid gap-10", isFetching && "opacity-90 transition-opacity")}>
        <section className="grid gap-4 lg:grid-cols-3">
          <PlanUsageCard
            className="lg:col-span-2"
            voiceMinutesLast30Days={kpis?.totalMinutes ?? null}
          />
          <WorkspaceHealthCard
            agents={voiceAgentCount}
            workflows={workflows.length}
            phoneNumbers={phoneNumberCount}
            integrations={integrations.length}
          />
        </section>

        {metricsQuery.isError && !metrics ? (
          <QueryErrorCard
            message={
              metricsQuery.error instanceof Error
                ? metricsQuery.error.message
                : "Could not load metrics"
            }
          />
        ) : metricsLoading ? (
          <MetricsKpiSkeletonRow />
        ) : kpis ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricKpiCard
              title="Call minutes · 30d"
              value={kpis.totalMinutesLabel}
              accent="minutes"
              sparkline={kpis.sparklines.minutes}
            />
            <MetricKpiCard
              title="Total calls"
              value={kpis.callCountLabel}
              accent="calls"
              sparkline={kpis.sparklines.calls}
            />
            <MetricKpiCard
              title="Voice spend"
              value={kpis.totalCostLabel}
              accent="cost"
              sparkline={kpis.sparklines.cost}
            />
            <MetricKpiCard
              title="Avg · cost per call"
              value={kpis.avgCostLabel}
              accent="avg"
              sparkline={kpis.sparklines.cost}
            />
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-3">
          {metricsLoading ? (
            <DashboardChartSkeleton className="lg:col-span-2" />
          ) : metrics ? (
            <MetricsAreaChart
              title="Call volume"
              block={chartBlockFromSparkline(
                metrics.kpis.sparklines.calls,
                "calls",
                "Calls",
              )}
              yLabel="Calls"
              className="lg:col-span-2"
            />
          ) : (
            <div className="bg-muted/20 border-border/40 min-h-[280px] rounded-xl border lg:col-span-2" />
          )}
          <div className="grid gap-4">
            <QuickActionsCard />
            {metricsLoading ? (
              <Card size="sm">
                <CardHeader>
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent className="grid gap-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ) : (
              <NeedsAttentionCard calls={metrics?.unsuccessfulCalls ?? []} />
            )}
          </div>
        </section>

        {logsQuery.isError && !logsQuery.data ? (
          <QueryErrorCard
            message={
              logsQuery.error instanceof Error
                ? logsQuery.error.message
                : "Could not load recent calls"
            }
          />
        ) : logsLoading ? (
          <RecentCallsTableSkeleton />
        ) : (
          <RecentCallsCard calls={recentCalls} />
        )}
      </div>
    </div>
  );
}
