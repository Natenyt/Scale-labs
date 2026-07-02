"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  Loader2Icon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSquadsQuery } from "@/lib/query/use-squads-query";
import type { SquadRow } from "@/lib/squads/types";

function memberCount(s: SquadRow): number {
  return (s.graph?.nodes ?? []).length;
}

function memberNames(s: SquadRow): string {
  const names = (s.graph?.nodes ?? [])
    .map((n) => n.agentName)
    .filter((v): v is string => Boolean(v));
  return names.join(" → ");
}

export default function SquadsPage() {
  const { data: squads, isLoading, isError, error } = useSquadsQuery();

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Build"
        title="Squads"
        description="Teams of agents that hand off to each other mid-call — reception to booking, triage to specialist."
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/squads/new">
              <PlusIcon className="size-4" />
              New squad
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-muted-foreground grid place-items-center py-24 text-sm">
          <Loader2Icon className="size-4 animate-spin" />
        </div>
      ) : isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error instanceof Error ? error.message : "Could not load squads."}
        </div>
      ) : !squads || squads.length === 0 ? (
        <div className="border-border/60 flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20 text-center">
          <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
            <UsersIcon className="size-5" />
          </div>
          <div className="grid gap-1">
            <h2 className="text-base font-medium">No squads yet</h2>
            <p className="text-muted-foreground mx-auto max-w-sm text-sm">
              Build a squad on the canvas: drop in your agents and connect them
              with handoff rules. The first agent answers; the rest join when
              their condition is met.
            </p>
          </div>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/squads/new">
              <PlusIcon className="size-4" />
              New squad
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {squads.map((s) => (
            <Link
              key={s.id}
              href={`/squads/${s.id}`}
              className="group border-input bg-card hover:bg-accent/40 focus-visible:ring-ring rounded-xl border p-4 transition focus-visible:ring-2 focus-visible:outline-none"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="bg-sky-500/10 text-sky-300 flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <UsersIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.name}</div>
                    <div className="text-muted-foreground truncate text-[11px]">
                      {memberNames(s) || "No members"}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0 tabular-nums">
                  {memberCount(s)} agents
                </Badge>
              </div>
              <div className="text-muted-foreground/80 mt-3 flex items-center gap-1 text-xs">
                <span className="group-hover:text-foreground transition">
                  Open builder
                </span>
                <ArrowRightIcon className="size-3 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
