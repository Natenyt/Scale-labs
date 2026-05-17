"use client";

import * as React from "react";

import { useAgents } from "@/components/agents/agents-store";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkflows } from "@/components/workflows/workflows-store";

export type AssignmentValue = {
  mode: "none" | "agent" | "workflow";
  agentId: string;
  workflowId: string;
};

export function AssignmentFields({
  value,
  onChange,
  disabled,
}: {
  value: AssignmentValue;
  onChange: (v: AssignmentValue) => void;
  disabled?: boolean;
}) {
  const { agents, ready: agentsReady } = useAgents();
  const { workflows, ready: workflowsReady } = useWorkflows();

  const voiceAgents = React.useMemo(
    () => agents.filter((a) => /^ag_\d+$/.test(a.id)),
    [agents],
  );
  const syncedWorkflows = React.useMemo(
    () => workflows.filter((w) => /^wf_\d+$/.test(w.id)),
    [workflows],
  );

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label className="text-xs">Who answers incoming calls?</Label>
        <Select
          value={value.mode}
          onValueChange={(mode) =>
            onChange({
              mode: mode as AssignmentValue["mode"],
              agentId: mode === "agent" ? value.agentId : "",
              workflowId: mode === "workflow" ? value.workflowId : "",
            })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nobody yet</SelectItem>
            <SelectItem value="agent">An agent</SelectItem>
            <SelectItem value="workflow">A workflow</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value.mode === "agent" ? (
        <div className="grid gap-1.5">
          <Label className="text-xs">Which agent?</Label>
          <Select
            value={value.agentId || "__pick__"}
            onValueChange={(id) =>
              onChange({ ...value, agentId: id === "__pick__" ? "" : id })
            }
            disabled={disabled || !agentsReady}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__pick__">Select agent</SelectItem>
              {voiceAgents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {value.mode === "workflow" ? (
        <div className="grid gap-1.5">
          <Label className="text-xs">Which workflow?</Label>
          <Select
            value={value.workflowId || "__pick__"}
            onValueChange={(id) =>
              onChange({ ...value, workflowId: id === "__pick__" ? "" : id })
            }
            disabled={disabled || !workflowsReady}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select workflow" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__pick__">Select workflow</SelectItem>
              {syncedWorkflows.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
