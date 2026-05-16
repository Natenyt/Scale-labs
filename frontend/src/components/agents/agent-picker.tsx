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

type Props = {
  value: string;
  onValueChange: (agentId: string) => void;
  label?: string;
  placeholder?: string;
  /** Only agents with a linked voice assistant (for calls/chat). */
  requireVoiceLink?: boolean;
  disabled?: boolean;
  id?: string;
};

export function AgentPicker({
  value,
  onValueChange,
  label = "Agent",
  placeholder = "Select an agent",
  requireVoiceLink = true,
  disabled = false,
  id = "agent-picker",
}: Props) {
  const { agents, ready } = useAgents();

  const options = React.useMemo(() => {
    return agents.filter((a) => {
      if (!requireVoiceLink) return true;
      if (/^ag_\d+$/.test(a.id)) return true;
      return Boolean((a.vapiAssistantId ?? "").trim());
    });
  }, [agents, requireVoiceLink]);

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value || undefined}
        onValueChange={onValueChange}
        disabled={disabled || !ready}
      >
        <SelectTrigger id={id} className="h-9 w-full">
          <SelectValue placeholder={ready ? placeholder : "Loading agents…"} />
        </SelectTrigger>
        <SelectContent>
          {options.length === 0 ? (
            <SelectItem value="__none" disabled>
              {requireVoiceLink
                ? "No agents with voice linked yet"
                : "No agents in this workspace"}
            </SelectItem>
          ) : (
            options.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

