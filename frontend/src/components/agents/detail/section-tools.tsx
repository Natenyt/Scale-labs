"use client";

import {
  MessageSquareIcon,
  PhoneForwardedIcon,
  SearchIcon,
  VoicemailIcon,
  type LucideIcon,
} from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { TOOLS, type Agent, type ToolId } from "@/lib/agents/types";

import { SectionShell, ToggleRow } from "./section-shell";

const TOOL_ICONS: Record<ToolId, LucideIcon> = {
  query: SearchIcon,
  transfer_call: PhoneForwardedIcon,
  send_sms: MessageSquareIcon,
  voicemail: VoicemailIcon,
};

type Props = {
  agent: Agent;
  onChange: (patch: Partial<Agent>) => void;
};

export function SectionTools({ agent, onChange }: Props) {
  const toggle = (id: ToolId, checked: boolean) => {
    const next = { ...agent.enabledTools, [id]: checked };
    const patch: Partial<Agent> = { enabledTools: next };
    // Keep the dedicated voicemail-detection toggle in sync with the Tools
    // voicemail capability so call-behavior settings reflect reality.
    if (id === "voicemail") {
      patch.voicemailDetection = checked;
    }
    onChange(patch);
  };

  return (
    <SectionShell
      id="tools"
      title="Tools"
      description="The four capabilities a standalone agent can use at runtime. Custom CRM tools (save / update / read) live in workflows."
    >
      <div className="grid">
        {TOOLS.map((tool) => {
          const Icon = TOOL_ICONS[tool.id];
          return (
            <ToggleRow
              key={tool.id}
              icon={<Icon className="size-4" />}
              title={tool.name}
              description={tool.description}
              control={
                <Switch
                  checked={agent.enabledTools[tool.id]}
                  onCheckedChange={(v) => toggle(tool.id, v)}
                  aria-label={`Toggle ${tool.name}`}
                />
              }
            />
          );
        })}
      </div>
    </SectionShell>
  );
}
