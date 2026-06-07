"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Agent, Language } from "@/lib/agents/types";

import { FieldRow, SectionShell } from "./section-shell";

type Props = {
  agent: Agent;
  onChange: (patch: Partial<Agent>) => void;
};

export function SectionIdentity({ agent, onChange }: Props) {
  return (
    <SectionShell
      id="identity"
      title="Identity"
      description="Basic information so your team can find and recognize this agent."
    >
      <FieldRow
        label="Name"
        description="Shown in the dashboard and in your call logs."
        htmlFor="agent-identity-name"
      >
        <Input
          id="agent-identity-name"
          value={agent.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </FieldRow>

      <FieldRow
        label="Description"
        description="A short note about what this agent does."
        htmlFor="agent-identity-description"
      >
        <Textarea
          id="agent-identity-description"
          value={agent.description}
          rows={3}
          placeholder="e.g. Handles inbound support questions for premium customers."
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </FieldRow>

      <FieldRow
        label="Primary language"
        description="Sets the voice catalog the agent speaks in."
        htmlFor="agent-identity-language"
      >
        <Select
          value={agent.language}
          onValueChange={(v) => onChange({ language: v as Language })}
        >
          <SelectTrigger id="agent-identity-language" className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ru">Russian</SelectItem>
            <SelectItem value="uz">Uzbek</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow
        label="Tags"
        description="Comma-separated. Useful for filtering in the agents list."
        htmlFor="agent-identity-tags"
      >
        <Input
          id="agent-identity-tags"
          value={agent.tags.join(", ")}
          placeholder="e.g. support, inbound"
          onChange={(e) =>
            onChange({
              tags: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
        />
      </FieldRow>

    </SectionShell>
  );
}
