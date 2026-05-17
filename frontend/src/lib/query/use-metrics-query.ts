"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { hasBackendApi } from "@/lib/api/env";
import { isDemoSession } from "@/lib/demo/constants";
import { fetchMetrics } from "@/lib/metrics/metrics-api";
import { queryKeys } from "@/lib/query/query-keys";

const METRICS_STALE_MS = 5 * 60 * 1000;

export function useMetricsQuery(options: {
  days: number;
  step: "day" | "week";
  agentId?: string;
}) {
  const { days, step, agentId } = options;
  return useQuery({
    queryKey: queryKeys.metrics({ days, step, agentId }),
    queryFn: () =>
      fetchMetrics({
        days,
        step,
        agentId: agentId || undefined,
      }),
    enabled: hasBackendApi() || isDemoSession(),
    staleTime: METRICS_STALE_MS,
    placeholderData: keepPreviousData,
  });
}
