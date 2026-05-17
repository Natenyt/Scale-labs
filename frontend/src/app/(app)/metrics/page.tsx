"use client";

import * as React from "react";
import { RefreshCwIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useAgentsState } from "@/components/agents/agents-store";
import { useCompleteNavigationWhenReady } from "@/components/navigation/navigation-pending";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchMetrics } from "@/lib/metrics/metrics-api";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

import { MetricsPageBody } from "./metrics-page-body";

export default function MetricsPage() {
  const { agents, ready: agentsReady } = useAgentsState();
  const queryClient = useQueryClient();
  const [days, setDays] = React.useState("30");
  const [step, setStep] = React.useState("day");
  const [agentId, setAgentId] = React.useState("");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [contentReady, setContentReady] = React.useState(false);

  useCompleteNavigationWhenReady(contentReady);

  const voiceAgents = React.useMemo(
    () => agents.filter((a) => /^ag_\d+$/.test(a.id)),
    [agents],
  );

  const onReadyChange = React.useCallback((ready: boolean) => {
    setContentReady(ready);
  }, []);

  const refresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.fetchQuery({
        queryKey: queryKeys.metrics({
          days: Number(days),
          step,
          agentId: agentId || undefined,
        }),
        queryFn: () =>
          fetchMetrics({
            days: Number(days),
            step: step as "day" | "week",
            agentId: agentId || undefined,
            fresh: true,
          }),
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, days, step, agentId]);

  if (!contentReady) {
    return (
      <MetricsPageBody
        days={days}
        step={step}
        agentId={agentId}
        onReadyChange={onReadyChange}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Metrics</h1>
          <p className="text-muted-foreground text-sm">
            Voice usage and cost for agents in your workspace.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRefreshing}
          onClick={() => void refresh()}
        >
          <RefreshCwIcon
            className={cn("size-4", isRefreshing && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      <div className="border-border/60 bg-card/30 flex flex-wrap items-end gap-4 rounded-xl border p-4">
        <div className="grid gap-1.5">
          <Label className="text-xs">Time range</Label>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Grouped by</Label>
          <Select value={step} onValueChange={setStep}>
            <SelectTrigger className="h-9 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Days</SelectItem>
              <SelectItem value="week">Weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-[200px] gap-1.5">
          <Label className="text-xs">Assistant</Label>
          <Select
            value={agentId || "__all__"}
            onValueChange={(v) => setAgentId(v === "__all__" ? "" : v)}
            disabled={!agentsReady}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All assistants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All assistants</SelectItem>
              {voiceAgents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <MetricsPageBody
        days={days}
        step={step}
        agentId={agentId}
        onReadyChange={onReadyChange}
      />
    </div>
  );
}
