"use client";

import * as React from "react";
import { RefreshCwIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useAgentsState } from "@/components/agents/agents-store";
import { useCompleteNavigationWhenReady } from "@/components/navigation/navigation-pending";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/lib/query/query-keys";
import { cn } from "@/lib/utils";

import { LogsCallTable } from "./logs-call-table";

export default function LogsPage() {
  const { agents, ready: agentsReady } = useAgentsState();
  const queryClient = useQueryClient();
  const [days, setDays] = React.useState("7");
  const [agentId, setAgentId] = React.useState("");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [contentReady, setContentReady] = React.useState(false);

  useCompleteNavigationWhenReady(contentReady);

  const onReadyChange = React.useCallback((ready: boolean) => {
    setContentReady(ready);
  }, []);

  const voiceAgents = React.useMemo(
    () => agents.filter((a) => /^ag_\d+$/.test(a.id)),
    [agents],
  );

  const refresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.callLogs({
          days: Number(days),
          agentId: agentId || undefined,
        }),
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, days, agentId]);

  if (!contentReady) {
    return (
      <LogsCallTable days={days} agentId={agentId} onReadyChange={onReadyChange} />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 pt-4 md:pt-6">
      <PageHeader
        eyebrow="Observe"
        title="Logs"
        description="Voice calls for agents and workflows in your workspace."
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

      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label className="text-muted-foreground/80 text-[10px] font-medium uppercase tracking-[0.1em]">
            Time range
          </Label>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="bg-card/50 h-9 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-[200px] gap-1.5">
          <Label className="text-muted-foreground/80 text-[10px] font-medium uppercase tracking-[0.1em]">
            Agent
          </Label>
          <Select
            value={agentId || "__all__"}
            onValueChange={(v) => setAgentId(v === "__all__" ? "" : v)}
            disabled={!agentsReady}
          >
            <SelectTrigger className="bg-card/50 h-9 text-xs">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All agents</SelectItem>
              {voiceAgents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-border/50 bg-card overflow-hidden rounded-xl border">
        <LogsCallTable days={days} agentId={agentId} onReadyChange={onReadyChange} />
      </div>
    </div>
  );
}
