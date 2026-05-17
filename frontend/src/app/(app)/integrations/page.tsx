"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleAlertIcon,
  ClockIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";

import { useIntegrations } from "@/components/integrations/integrations-store";
import { useCompleteNavigationWhenReady } from "@/components/navigation/navigation-pending";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api/client";
import { hasBackendApi } from "@/lib/api/env";
import { cn } from "@/lib/utils";
import {
  deleteNotionToolsOnVapi,
  resyncNotionTools,
} from "@/lib/integrations/notion/sync-client";
import {
  NOTION_INTEGRATION_LIMIT,
  type IntegrationKind,
  type NotionIntegration,
} from "@/lib/integrations/types";

type KindCard = {
  kind: IntegrationKind;
  name: string;
  letter: string;
  tone: string;
  description: string;
  status: "live" | "coming-soon";
};

const KINDS: KindCard[] = [
  {
    kind: "notion",
    name: "Notion",
    letter: "N",
    tone: "bg-zinc-200/10 text-zinc-100 ring-zinc-200/20",
    description:
      "Bind agents to a Notion database. Agents load context at the start of a call, and workflows get five auto-generated tools (save, find, search, update, delete) for your flows.",
    status: "live",
  },
  {
    kind: "hubspot",
    name: "HubSpot",
    letter: "H",
    tone: "bg-orange-500/15 text-orange-300 ring-orange-500/20",
    description: "Pull contacts and deals from HubSpot into agent context.",
    status: "coming-soon",
  },
  {
    kind: "bitrix24",
    name: "Bitrix24",
    letter: "B",
    tone: "bg-sky-500/15 text-sky-300 ring-sky-500/20",
    description: "Sync with Bitrix24 contacts, deals and activity logs.",
    status: "coming-soon",
  },
];

export default function IntegrationsPage() {
  const {
    byKind,
    ready,
    notionRemainingSlots,
    deleteIntegration,
    setSyncStatus,
    setVapiTools,
  } = useIntegrations();
  const notionConnections = byKind("notion") as NotionIntegration[];
  const notionCard = KINDS[0];

  useCompleteNavigationWhenReady(ready);

  const handleResync = React.useCallback(
    (record: NotionIntegration) => {
      void resyncNotionTools(record, { setSyncStatus, setVapiTools });
    },
    [setSyncStatus, setVapiTools],
  );

  const handleDelete = React.useCallback(
    async (record: NotionIntegration) => {
      if (hasBackendApi()) {
        try {
          await apiFetch(`/api/v1/integrations/notion/${record.id}/`, {
            method: "DELETE",
          });
        } catch {
          /* row may already be gone; still drop from local cache */
        }
      } else {
        void deleteNotionToolsOnVapi(record);
      }
      deleteIntegration(record.id);
    },
    [deleteIntegration],
  );

  if (!ready) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 pt-4 md:pt-6">
      <PageHeader
        eyebrow="Connect"
        title="Integrations"
        description="Connect your CRM so agents can read context at the start of a call. Saving an integration provisions workflow tools your agents can call during a conversation."
      />

      <Card>
        <CardHeader className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-lg text-sm font-semibold",
              notionCard.tone,
            )}
          >
            {notionCard.letter}
          </div>
          <div className="grid gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              {notionCard.name}
              <span className="text-emerald-400 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em]">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              {notionCard.description}
            </CardDescription>
          </div>
          <NotionAddButton remainingSlots={notionRemainingSlots} />
        </CardHeader>

        <CardContent className="divide-border/40 -mx-0 grid gap-0 divide-y px-0 pb-0">
          {notionConnections.length === 0 ? (
            <NotionEmptyState />
          ) : (
            notionConnections.map((conn) => (
              <NotionRow
                key={conn.id}
                record={conn}
                onDelete={() => void handleDelete(conn)}
                onResync={() => handleResync(conn)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-1">
        <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]">
          Coming soon
        </p>
        <h2 className="text-sm font-medium">More integrations</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {KINDS.slice(1).map((k) => (
          <Card key={k.kind} className="opacity-70">
            <CardHeader className="flex flex-row items-start gap-3">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg text-sm font-semibold",
                  k.tone,
                )}
              >
                {k.letter}
              </div>
              <div className="grid gap-1">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {k.name}
                  <Badge
                    variant="outline"
                    className="border-border/50 text-[10px] font-medium uppercase tracking-wider"
                  >
                    Coming soon
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {k.description}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NotionAddButton({ remainingSlots }: { remainingSlots: number }) {
  const disabled = remainingSlots <= 0;

  if (!disabled) {
    return (
      <Button asChild className="shrink-0 gap-1.5">
        <Link href="/integrations/notion/new">
          <PlusIcon className="size-4" />
          Add Notion connection
        </Link>
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0">
          <Button disabled className="gap-1.5">
            <PlusIcon className="size-4" />
            Add Notion connection
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {`Standard plan limit of ${NOTION_INTEGRATION_LIMIT} Notion connections reached. Upgrade to enterprise to add more.`}
      </TooltipContent>
    </Tooltip>
  );
}

function NotionRow({
  record,
  onDelete,
  onResync,
}: {
  record: NotionIntegration;
  onDelete: () => void;
  onResync: () => void;
}) {
  const fields = record.fieldMap.length;
  const tools = record.vapiTools?.length ?? 0;
  return (
    <div className="group/row hover:bg-muted/30 flex items-center justify-between gap-3 px-4 py-3 transition-colors">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CheckCircle2Icon className="size-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{record.label}</span>
          <SyncBadge record={record} />
        </div>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
          {record.databaseTitle ? (
            <>
              <span className="truncate">{record.databaseTitle}</span>
              <span className="text-muted-foreground/40">·</span>
            </>
          ) : null}
          <span className="tabular-nums">{fields} fields</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="tabular-nums">
            {tools > 0
              ? `${tools} tool${tools === 1 ? "" : "s"}`
              : "No tools yet"}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <ClockIcon className="size-3" />
          <span>{formatRelative(record.createdAt)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              onClick={onResync}
              disabled={record.syncStatus === "syncing"}
              aria-label="Resync workflow tools"
            >
              {record.syncStatus === "syncing" ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Resync workflow tools</TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover/row:opacity-100"
          onClick={onDelete}
          aria-label="Remove integration"
        >
          <Trash2Icon className="size-3.5" />
        </Button>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/integrations/notion/${record.id}`}>
            Configure
            <ChevronRightIcon className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SyncBadge({ record }: { record: NotionIntegration }) {
  const status = record.syncStatus ?? (record.vapiTools?.length ? "synced" : "idle");
  if (status === "syncing") {
    return (
      <Badge
        variant="outline"
        className="border-border/50 gap-1 text-[10px] font-normal uppercase tracking-wide"
      >
        <Loader2Icon className="size-3 animate-spin" />
        Syncing
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="border-destructive/40 bg-destructive/10 text-destructive gap-1 text-[10px] font-normal uppercase tracking-wide"
          >
            <CircleAlertIcon className="size-3" />
            Sync error
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {record.lastSyncError ?? "Tool sync failed. Try Resync."}
        </TooltipContent>
      </Tooltip>
    );
  }
  if (status === "synced") {
    return (
      <span className="text-emerald-400 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em]">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        Synced
      </span>
    );
  }
  return (
    <span className="text-muted-foreground/70 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em]">
      <span className="size-1.5 rounded-full bg-muted-foreground/40" />
      Not synced
    </span>
  );
}

function NotionEmptyState() {
  return (
    <div className="grid place-items-center gap-2 px-4 py-12 text-center">
      <p className="text-sm font-medium">No Notion connections yet</p>
      <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
        Add an internal-integration token from{" "}
        <a
          href="https://www.notion.so/profile/integrations"
          target="_blank"
          rel="noreferrer"
          className="text-foreground underline underline-offset-2 inline-flex items-center gap-1"
        >
          notion.so/profile/integrations
          <ExternalLinkIcon className="size-3" />
        </a>{" "}
        and pick the database you want this agent to read from.
      </p>
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
