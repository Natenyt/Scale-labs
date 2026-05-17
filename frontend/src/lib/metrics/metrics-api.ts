import { apiFetch } from "@/lib/api/client";

export type ChartSeriesMeta = { key: string; label: string };

export type ChartBlock = {
  data: Array<Record<string, string | number>>;
  series: ChartSeriesMeta[];
};

export type MetricsKpis = {
  totalMinutes: number;
  totalMinutesLabel: string;
  callCount: number;
  callCountLabel: string;
  totalCost: number;
  totalCostLabel: string;
  avgCost: number;
  avgCostLabel: string;
  sparklines: {
    minutes: Array<{ date: string; value: number }>;
    calls: Array<{ date: string; value: number }>;
    cost: Array<{ date: string; value: number }>;
  };
};

export type UnsuccessfulCall = {
  id: string;
  resourceName: string;
  startedAt: string | null;
  customerNumber: string;
  statusLabel: string;
};

export type MetricsDashboard = {
  kpis: MetricsKpis;
  charts: {
    endedReason: ChartBlock;
    durationByAssistant: ChartBlock;
    costBreakdown: ChartBlock;
    callsByType: ChartBlock;
    avgDuration: ChartBlock;
    costOverTime: ChartBlock;
    successEval: ChartBlock;
    concurrency: ChartBlock;
  };
  unsuccessfulCalls: UnsuccessfulCall[];
  meta: {
    days: number;
    step: string;
    callsSampled: number;
    callsSampleLimit: number;
  };
};

export async function fetchMetrics(options?: {
  days?: number;
  step?: "day" | "week";
  agentId?: string;
  /** Bypass Django metrics cache (use on explicit Refresh). */
  fresh?: boolean;
}): Promise<MetricsDashboard> {
  const params = new URLSearchParams();
  if (options?.days != null) params.set("days", String(options.days));
  if (options?.step) params.set("step", options.step);
  if (options?.agentId) params.set("agent_id", options.agentId);
  if (options?.fresh) params.set("fresh", "1");
  const qs = params.toString();
  return apiFetch<MetricsDashboard>(
    qs ? `/api/v1/metrics/?${qs}` : "/api/v1/metrics/",
  );
}
