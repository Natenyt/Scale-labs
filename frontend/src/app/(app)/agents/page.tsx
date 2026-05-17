"use client";

import * as React from "react";
import Link from "next/link";
import { BotIcon, PlusIcon } from "lucide-react";
import { useCompleteNavigationWhenReady } from "@/components/navigation/navigation-pending";
import { AgentCard } from "@/components/agents/agent-card";
import {
  AgentsToolbar,
  type AgentsFilter,
} from "@/components/agents/agents-toolbar";
import { NewAgentDialog } from "@/components/agents/new-agent-dialog";
import { useAgents } from "@/components/agents/agents-store";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { hasBackendApi } from "@/lib/api/env";
import { isDemoSession } from "@/lib/demo/constants";
import { getAccessToken } from "@/lib/api/tokens";

const DEFAULT_FILTER: AgentsFilter = {
  query: "",
  language: "all",
  status: "all",
};

function matchesFilter(
  agent: { name: string; description: string; language: string; status: string },
  filter: AgentsFilter,
) {
  const q = filter.query.trim().toLowerCase();
  if (q) {
    const hay = `${agent.name} ${agent.description}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filter.language !== "all" && agent.language !== filter.language) return false;
  if (filter.status !== "all" && agent.status !== filter.status) return false;
  return true;
}

export default function AgentsPage() {
  const { agents, ready, apiAgentsLoadFailed } = useAgents();
  const [filter, setFilter] = React.useState<AgentsFilter>(DEFAULT_FILTER);
  const [createOpen, setCreateOpen] = React.useState(false);

  const filtered = React.useMemo(
    () => agents.filter((a) => matchesFilter(a, filter)),
    [agents, filter],
  );

  const isDemo = isDemoSession();
  const needsSignIn =
    hasBackendApi() && !getAccessToken()?.trim() && !isDemo;
  const needsApi = !hasBackendApi() && !isDemo;

  const pageReady = isDemo || needsApi || ready;
  useCompleteNavigationWhenReady(pageReady);

  if (!pageReady) {
    return null;
  }

  const liveCount = agents.filter((a) => a.status === "live").length;
  const draftCount = agents.length - liveCount;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 pt-4 md:pt-6">
      <PageHeader
        eyebrow="Build"
        title="Agents"
        description="Voice agents that talk to your customers, anchored to your CRM."
        actions={
          agents.length > 0 ? (
            <Button onClick={() => setCreateOpen(true)} className="h-9">
              <PlusIcon className="size-3.5" />
              New agent
            </Button>
          ) : null
        }
      />

      {agents.length > 0 ? (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="tabular-nums">
            <span className="text-foreground font-medium">{agents.length}</span>{" "}
            total
          </span>
          <span className="bg-border/60 h-3 w-px" />
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span className="text-foreground font-medium">{liveCount}</span> live
          </span>
          <span className="bg-border/60 h-3 w-px" />
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <span className="size-1.5 rounded-full bg-muted-foreground/50" />
            <span className="text-foreground font-medium">{draftCount}</span> draft
          </span>
        </div>
      ) : null}

      <AgentsToolbar
        filter={filter}
        onFilterChange={setFilter}
        onCreate={() => setCreateOpen(true)}
        showCreate={false}
      />

      {needsApi ? (
        <div className="border-border/50 bg-muted/20 rounded-lg border px-4 py-3 text-sm">
          Set <code className="font-mono text-xs">NEXT_PUBLIC_API_BASE_URL</code> in{" "}
          <code className="font-mono text-xs">.env.local</code> to load agents from your
          workspace API.
        </div>
      ) : null}

      {needsSignIn ? (
        <div className="border-border/50 bg-muted/20 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Sign in to view and create agents for your organization.
          </span>
          <Button asChild size="sm" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      ) : null}

      {apiAgentsLoadFailed ? (
        <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border px-4 py-3 text-sm">
          Could not load agents from the API. Check that the backend is running, CORS
          allows this origin, and you are signed in with an active organization.
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="border-border/40 grid place-items-center gap-3 rounded-xl border border-dashed px-6 py-20 text-center">
          <div className="bg-muted/60 flex size-12 items-center justify-center rounded-xl">
            <BotIcon className="text-muted-foreground size-5" />
          </div>
          <div className="grid gap-1">
            <p className="text-sm font-medium">
              {agents.length === 0 ? "No agents yet" : "No agents match your filters"}
            </p>
            <p className="text-muted-foreground mx-auto max-w-sm text-xs leading-relaxed">
              {agents.length === 0
                ? "Create a voice agent for your organization. The platform provisions it on the voice runtime using your server configuration."
                : "Try clearing search or filters."}
            </p>
          </div>
          {agents.length === 0 && !needsSignIn && !needsApi ? (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="mt-2">
              <PlusIcon className="size-3.5" />
              New agent
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      <NewAgentDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
