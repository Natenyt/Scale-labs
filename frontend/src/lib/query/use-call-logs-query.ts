"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchCallLogs } from "@/lib/calls/call-logs-api";
import { hasBackendApi } from "@/lib/api/env";
import { isDemoSession } from "@/lib/demo/constants";
import { queryKeys } from "@/lib/query/query-keys";

const CALL_LOGS_STALE_MS = 2 * 60 * 1000;

export function useCallLogsQuery(options: {
  days: number;
  limit?: number;
  agentId?: string;
}) {
  const { days, limit, agentId } = options;
  return useQuery({
    queryKey: queryKeys.callLogs({ days, limit, agentId }),
    queryFn: () =>
      fetchCallLogs({
        days,
        limit,
        agentId: agentId || undefined,
      }),
    enabled: hasBackendApi() || isDemoSession(),
    staleTime: CALL_LOGS_STALE_MS,
    placeholderData: keepPreviousData,
  });
}
