"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchCallLogDetail } from "@/lib/calls/call-logs-api";
import { hasBackendApi } from "@/lib/api/env";
import { queryKeys } from "@/lib/query/query-keys";

const CALL_LOG_DETAIL_STALE_MS = 10 * 60 * 1000;

export function useCallLogQuery(callId: string) {
  return useQuery({
    queryKey: queryKeys.callLog(callId),
    queryFn: () => fetchCallLogDetail(callId),
    enabled: hasBackendApi() && Boolean(callId),
    staleTime: CALL_LOG_DETAIL_STALE_MS,
  });
}
