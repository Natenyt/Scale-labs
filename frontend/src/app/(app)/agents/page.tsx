"use client";

import * as React from "react";
import Link from "next/link";
import { BotIcon } from "lucide-react";
import { useCompleteNavigationWhenReady } from "@/components/navigation/navigation-pending";
import { AgentCard } from "@/components/agents/agent-card";
import {
  AgentsToolbar,
  type AgentsFilter,
} from "@/components/agents/agents-toolbar";
import { NewAgentDialog } from "@/components/agents/new-agent-dialog";
import { useAgents } from "@/components/agents/agents-store";
import { Button } from "@/components/ui/button";
import { hasBackendApi } from "@/lib/api/env";
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

  const needsSignIn = hasBackendApi() && !getAccessToken()?.trim();
  const needsApi = !hasBackendApi();

  const pageReady = needsApi || ready;
  useCompleteNavigationWhenReady(pageReady);

  if (!pageReady) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <AgentsToolbar
        filter={filter}
        onFilterChange={setFilter}
        onCreate={() => setCreateOpen(true)}
      />

      {needsApi ? (
        <div className="border-border/60 bg-muted/20 rounded-lg border px-4 py-3 text-sm">
          Set <code className="font-mono text-xs">NEXT_PUBLIC_API_BASE_URL</code> in{" "}
          <code className="font-mono text-xs">.env.local</code> to load agents from your
          workspace API.
        </div>
      ) : null}

      {needsSignIn ? (
        <div className="border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
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
        <div className="border-border/40 grid place-items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
          <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
            <BotIcon className="text-muted-foreground size-6" />
          </div>
          <div className="grid gap-1">
            <p className="text-sm font-medium">
              {agents.length === 0 ? "No agents yet" : "No agents match your filters"}
            </p>
            <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
              {agents.length === 0
                ? "Create a voice agent for your organization. The platform provisions Vapi using your server configuration."
                : "Try clearing search or filters."}
            </p>
          </div>
          {agents.length === 0 && !needsSignIn && !needsApi ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
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
