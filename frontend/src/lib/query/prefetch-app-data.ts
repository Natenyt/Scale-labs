import type { QueryClient } from "@tanstack/react-query";

import { fetchCallLogs } from "@/lib/calls/call-logs-api";
import { hasBackendApi } from "@/lib/api/env";
import { isDemoSession } from "@/lib/demo/constants";
import { fetchMetrics } from "@/lib/metrics/metrics-api";
import { fetchPhoneNumbers } from "@/lib/phone-numbers/phone-numbers-api";
import { queryKeys } from "@/lib/query/query-keys";

// Capped at 14: the Vapi plan only exposes the last 14 days of call history,
// so a wider window makes the metrics/logs endpoints 400 and blanks the
// dashboard. Backend also clamps (settings.VAPI_MAX_HISTORY_DAYS) as a backstop.
export const DASHBOARD_METRICS_DAYS = 14;
export const DASHBOARD_LOGS_DAYS = 14;
export const DASHBOARD_LOGS_LIMIT = 8;
export const DEFAULT_LOGS_DAYS = 7;

const METRICS_STALE_MS = 5 * 60 * 1000;
const CALL_LOGS_STALE_MS = 2 * 60 * 1000;
const PHONE_NUMBERS_STALE_MS = 2 * 60 * 1000;

/** Warm caches for dashboard + common Observe/Connect pages (non-blocking). */
export function prefetchObservePages(queryClient: QueryClient): void {
  if (!hasBackendApi() && !isDemoSession()) return;

  void queryClient.prefetchQuery({
    queryKey: queryKeys.metrics({ days: DASHBOARD_METRICS_DAYS, step: "day" }),
    queryFn: () => fetchMetrics({ days: DASHBOARD_METRICS_DAYS, step: "day" }),
    staleTime: METRICS_STALE_MS,
  });

  void queryClient.prefetchQuery({
    queryKey: queryKeys.callLogs({
      days: DASHBOARD_LOGS_DAYS,
      limit: DASHBOARD_LOGS_LIMIT,
    }),
    queryFn: () =>
      fetchCallLogs({ days: DASHBOARD_LOGS_DAYS, limit: DASHBOARD_LOGS_LIMIT }),
    staleTime: CALL_LOGS_STALE_MS,
  });

  void queryClient.prefetchQuery({
    queryKey: queryKeys.phoneNumbers(),
    queryFn: fetchPhoneNumbers,
    staleTime: PHONE_NUMBERS_STALE_MS,
  });
}

export function prefetchMetricsPage(queryClient: QueryClient): void {
  if (!hasBackendApi() && !isDemoSession()) return;
  void queryClient.prefetchQuery({
    queryKey: queryKeys.metrics({ days: DASHBOARD_METRICS_DAYS, step: "day" }),
    queryFn: () => fetchMetrics({ days: DASHBOARD_METRICS_DAYS, step: "day" }),
    staleTime: METRICS_STALE_MS,
  });
}

export function prefetchLogsPage(queryClient: QueryClient): void {
  if (!hasBackendApi() && !isDemoSession()) return;
  void queryClient.prefetchQuery({
    queryKey: queryKeys.callLogs({ days: DEFAULT_LOGS_DAYS }),
    queryFn: () => fetchCallLogs({ days: DEFAULT_LOGS_DAYS }),
    staleTime: CALL_LOGS_STALE_MS,
  });
}

export function prefetchPhoneNumbersPage(queryClient: QueryClient): void {
  if (!hasBackendApi() && !isDemoSession()) return;
  void queryClient.prefetchQuery({
    queryKey: queryKeys.phoneNumbers(),
    queryFn: fetchPhoneNumbers,
    staleTime: PHONE_NUMBERS_STALE_MS,
  });
}
