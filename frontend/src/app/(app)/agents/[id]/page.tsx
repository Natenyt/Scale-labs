"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";

import { useAgents } from "@/components/agents/agents-store";
import { AgentVoiceSessionProvider } from "@/components/agents/detail/voice-session-context";
import { RightRail } from "@/components/agents/detail/right-rail";
import { SectionBehavior } from "@/components/agents/detail/section-behavior";
import { SectionCallBehavior } from "@/components/agents/detail/section-call-behavior";
import { SectionCrm } from "@/components/agents/detail/section-crm";
import { SectionIdentity } from "@/components/agents/detail/section-identity";
import { SectionTools } from "@/components/agents/detail/section-tools";
import { SectionVoice } from "@/components/agents/detail/section-voice";
import { Button } from "@/components/ui/button";
import type { Agent } from "@/lib/agents/types";

export default function AgentDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { getAgent, updateAgent, ready } = useAgents();
  const agent = getAgent(id);

  const onChange = React.useCallback(
    (patch: Partial<Agent>) => {
      if (!agent) return;
      updateAgent(agent.id, patch);
    },
    [agent, updateAgent],
  );

  if (!ready) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
        <Loader2Icon className="size-4 animate-spin" />
        Loading agent…
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="grid gap-4 py-12">
        <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5">
          <Link href="/agents">
            <ArrowLeftIcon className="size-4" />
            Back to agents
          </Link>
        </Button>
        <p className="text-muted-foreground text-sm">
          This agent was not found in your workspace. It may have been deleted or you may
          need to sign in again.
        </p>
      </div>
    );
  }

  return (
    <AgentVoiceSessionProvider agentRecordId={agent.id}>
    <div className="flex flex-1 flex-col gap-6 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href="/agents">
            <ArrowLeftIcon className="size-4" />
            Agents
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{agent.name}</h1>
          <p className="text-muted-foreground text-sm">
            Configure voice, behavior, tools, and CRM context for this agent.
          </p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-6">
          <SectionIdentity agent={agent} onChange={onChange} />
          <SectionVoice agent={agent} onChange={onChange} />
          <SectionBehavior agent={agent} onChange={onChange} />
          <SectionTools agent={agent} onChange={onChange} />
          <SectionCrm agent={agent} onChange={onChange} />
          <SectionCallBehavior agent={agent} onChange={onChange} />
        </div>
        <RightRail agent={agent} onChange={onChange} />
      </div>
    </div>
    </AgentVoiceSessionProvider>
  );
}
