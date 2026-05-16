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
      "Bind agents to a Notion database. Agents load context at the start of a call, and workflows get 5 auto-generated tools (save, find, search, update, delete) wired to Vapi.",
    status: "live",
  },
  {
    kind: "hubspot",
    name: "HubSpot",
    letter: "H",
    tone: "bg-orange-500/15 text-orange-300 ring-orange-500/20",
    description: "Pull contacts and deals from HubSpot. Coming after Day 9.",
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

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 pt-2">
      <PageHeader />

      <Card>
        <CardHeader className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
          <div
            className={cn(
              "flex size-11 items-center justify-center rounded-xl text-sm font-semibold ring-1",
              notionCard.tone,
            )}
          >
            {notionCard.letter}
          </div>
          <div className="grid gap-1">
            <CardTitle className="flex items-center gap-2">
              {notionCard.name}
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-[10px] font-medium uppercase tracking-wider text-emerald-300"
              >
                Live
              </Badge>
            </CardTitle>
            <CardDescription>{notionCard.description}</CardDescription>
          </div>
          <NotionAddButton remainingSlots={notionRemainingSlots} />
        </CardHeader>

        <CardContent className="grid gap-2">
          {!ready ? (
            <NotionEmptySkeleton />
          ) : notionConnections.length === 0 ? (
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

      <div className="grid gap-3 sm:grid-cols-2">
        {KINDS.slice(1).map((k) => (
          <Card key={k.kind} className="opacity-70">
            <CardHeader className="flex flex-row items-start gap-3">
              <div
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl text-sm font-semibold ring-1",
                  k.tone,
                )}
              >
                {k.letter}
              </div>
              <div className="grid gap-1">
                <CardTitle className="flex items-center gap-2">
                  {k.name}
                  <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wider">
                    Coming soon
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
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

function PageHeader() {
  return (
    <div className="grid gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
      <p className="text-muted-foreground text-sm">
        Connect your CRM so agents can read context at the start of a call.
        Saving an integration provisions a matching set of Vapi tools your
        workflows can call.
      </p>
    </div>
  );
}

function NotionAddButton({ remainingSlots }: { remainingSlots: number }) {
  const disabled = remainingSlots <= 0;
  const button = (
    <Button asChild={!disabled} disabled={disabled} className="gap-1.5">
      {disabled ? (
        <span>
          <PlusIcon className="size-4" />
          Add Notion connection
        </span>
      ) : (
        <Link href="/integrations/notion/new">
          <PlusIcon className="size-4" />
          Add Notion connection
        </Link>
      )}
    </Button>
  );

  if (!disabled) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{button}</span>
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
    <div className="group/row border-border/60 hover:bg-accent/30 flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CheckCircle2Icon className="size-3.5 text-emerald-400" />
          <span className="truncate">{record.label}</span>
          <SyncBadge record={record} />
        </div>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="truncate">{record.databaseTitle}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{fields} fields</span>
          <span className="text-muted-foreground/40">·</span>
          <span>
            {tools > 0
              ? `${tools} Vapi tool${tools === 1 ? "" : "s"}`
              : "No Vapi tools yet"}
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
              size="sm"
              className="size-8 px-0"
              onClick={onResync}
              disabled={record.syncStatus === "syncing"}
              aria-label="Resync Vapi tools"
            >
              {record.syncStatus === "syncing" ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Resync Vapi tools</TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive size-8 px-0"
          onClick={onDelete}
          aria-label="Remove integration"
        >
          <Trash2Icon className="size-4" />
        </Button>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/integrations/notion/${record.id}`}>
            Configure
            <ChevronRightIcon className="size-4" />
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
      <Badge variant="outline" className="gap-1 text-[10px] font-normal">
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
            className="border-destructive/40 bg-destructive/10 text-destructive gap-1 text-[10px] font-normal"
          >
            <CircleAlertIcon className="size-3" />
            Sync error
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {record.lastSyncError ?? "Vapi sync failed. Try Resync."}
        </TooltipContent>
      </Tooltip>
    );
  }
  if (status === "synced") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 gap-1 text-[10px] font-normal"
      >
        <CheckCircle2Icon className="size-3" />
        Synced
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground/70 text-[10px] font-normal">
      Not synced
    </Badge>
  );
}

function NotionEmptyState() {
  return (
    <div className="border-border/40 grid place-items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center">
      <p className="text-sm font-medium">No Notion connections yet</p>
      <p className="text-muted-foreground max-w-md text-xs">
        Add an internal-integration token from{" "}
        <a
          href="https://www.notion.so/profile/integrations"
          target="_blank"
          rel="noreferrer"
          className="text-foreground underline inline-flex items-center gap-1"
        >
          notion.so/profile/integrations
          <ExternalLinkIcon className="size-3" />
        </a>{" "}
        and pick the database you want this agent to read from.
      </p>
    </div>
  );
}

function NotionEmptySkeleton() {
  return (
    <div className="border-border/40 grid h-16 animate-pulse rounded-lg border" />
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
