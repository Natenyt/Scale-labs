import { apiFetch } from "@/lib/api/client";

export type CallLogSummary = {
  id: string;
  startedAt: string | null;
  type: string;
  typeRaw: string;
  endedReason: string;
  durationSeconds: number | null;
  durationLabel: string;
  cost: number | null;
  costLabel: string;
  resourceName: string;
  customerNumber: string;
};

export type TranscriptLine = {
  role: "assistant" | "user" | "system";
  text: string;
  at: string | null;
};

export type CallLogEntry = {
  time: string | null;
  level: string;
  category: string;
  message: string;
};

export type CostLineItem = {
  label: string;
  amount: number;
  amountLabel: string;
  percent: number;
};

export type CallCostDetail = {
  total: number;
  totalLabel: string;
  durationSeconds: number | null;
  durationLabel: string;
  items: CostLineItem[];
};

export type CallLogDetail = CallLogSummary & {
  recordingUrl: string | null;
  transcript: TranscriptLine[];
  logs: CallLogEntry[];
  costDetail: CallCostDetail;
};

export async function fetchCallLogs(options?: {
  days?: number;
  limit?: number;
  agentId?: string;
}): Promise<CallLogSummary[]> {
  const params = new URLSearchParams();
  if (options?.days != null) params.set("days", String(options.days));
  if (options?.limit != null) params.set("limit", String(options.limit));
  if (options?.agentId) params.set("agent_id", options.agentId);
  const qs = params.toString();
  const data = await apiFetch<{ results: CallLogSummary[] }>(
    qs ? `/api/v1/call-logs/?${qs}` : "/api/v1/call-logs/",
  );
  return data.results ?? [];
}

export async function fetchCallLogDetail(callId: string): Promise<CallLogDetail> {
  const encoded = encodeURIComponent(callId);
  return apiFetch<CallLogDetail>(`/api/v1/call-logs/${encoded}/`);
}
