"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  DatabaseIcon,
  Loader2Icon,
  MessageSquareIcon,
  PhoneForwardedIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  SettingsIcon,
  VoicemailIcon,
  type LucideIcon,
} from "lucide-react";

import { useIntegrations } from "@/components/integrations/integrations-store";
import {
  ToolDetailSheet,
  type ToolDetail,
} from "@/components/tools/tool-detail-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  buildNotionToolPreviews,
  type ToolPreview,
} from "@/lib/integrations/notion/tool-builder";
import { resyncNotionTools } from "@/lib/integrations/notion/sync-client";
import {
  NOTION_TOOL_LABELS,
  type NotionIntegration,
  type NotionToolKind,
} from "@/lib/integrations/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Static system tool definitions (the 4 generic standalone-agent tools).
// We keep their JSON schemas inline here as a preview-only artifact — the
// actual Vapi tools are registered elsewhere (Day 9, when the agent layer
// wires through to Vapi).
// ---------------------------------------------------------------------------

type SystemTool = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  preview: {
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
};

const SYSTEM_TOOLS: SystemTool[] = [
  {
    id: "query",
    name: "Query (web search)",
    description:
      "Lets the agent look up outside facts mid-call. Backed by a dedicated research agent.",
    icon: SearchIcon,
    preview: {
      description:
        "Search the public web for a fact and return a short summary.",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "What the agent wants to know, in natural language.",
          },
        },
        required: ["question"],
      },
    },
  },
  {
    id: "transfer_call",
    name: "Transfer call",
    description:
      "Hand off the live call to a human or another destination when the situation calls for it.",
    icon: PhoneForwardedIcon,
    preview: {
      description: "Transfer the live call to a destination phone number.",
      parameters: {
        type: "object",
        properties: {
          destination: {
            type: "string",
            description: "E.164 phone number to transfer the call to.",
          },
          reason: {
            type: "string",
            description: "Short reason for transferring, shown in the log.",
          },
        },
        required: ["destination"],
      },
    },
  },
  {
    id: "send_sms",
    name: "Send SMS",
    description:
      "Send a short text message during or right after the call (confirmation, link, reference number).",
    icon: MessageSquareIcon,
    preview: {
      description: "Send an SMS to the caller or a configured recipient.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Destination phone number." },
          body: { type: "string", description: "SMS text body." },
        },
        required: ["to", "body"],
      },
    },
  },
  {
    id: "voicemail",
    name: "Voicemail",
    description:
      "Detect voicemail and decide whether to hang up or leave a templated message.",
    icon: VoicemailIcon,
    preview: {
      description: "Handle voicemail detection on outbound calls.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description: "Either 'hangup' or 'leave_message'.",
            enum: ["hangup", "leave_message"],
          },
          message: {
            type: "string",
            description:
              "Templated message to leave if action is leave_message.",
          },
        },
        required: ["action"],
      },
    },
  },
];

const KIND_ICON: Record<NotionToolKind, LucideIcon> = {
  save: PlusIcon,
  find: SearchIcon,
  search: SearchIcon,
  update: SettingsIcon,
  delete: CircleAlertIcon,
};

const KIND_TONE: Record<NotionToolKind, string> = {
  save: "text-emerald-300",
  find: "text-sky-300",
  search: "text-violet-300",
  update: "text-amber-300",
  delete: "text-rose-300",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ToolsPage() {
  const { byKind, ready, setSyncStatus, setVapiTools } = useIntegrations();
  const notionIntegrations = byKind("notion") as NotionIntegration[];

  const [detail, setDetail] = React.useState<ToolDetail | null>(null);
  const [open, setOpen] = React.useState(false);

  const openDetail = (next: ToolDetail) => {
    setDetail(next);
    setOpen(true);
  };

  const handleResync = React.useCallback(
    (record: NotionIntegration) => {
      void resyncNotionTools(record, { setSyncStatus, setVapiTools });
    },
    [setSyncStatus, setVapiTools],
  );

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 pt-2">
      <PageHeader />

      <SystemToolsSection
        onOpen={(t) =>
          openDetail({
            kind: "system",
            id: t.id,
            name: t.name,
            description: t.description,
            preview: t.preview,
          })
        }
      />

      <IntegrationToolsSection
        integrations={notionIntegrations}
        ready={ready}
        onOpen={(integration, preview, ref) =>
          openDetail({
            kind: "notion",
            integration,
            preview,
            vapiToolId: ref?.id ?? null,
            lastSyncedAt: ref?.lastSyncedAt ?? null,
          })
        }
        onResync={handleResync}
      />

      <ToolDetailSheet
        open={open}
        onOpenChange={setOpen}
        detail={detail}
        onResync={handleResync}
      />
    </div>
  );
}

function PageHeader() {
  return (
    <div className="grid gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
      <p className="text-muted-foreground text-sm">
        Every function tool registered with Vapi for this workspace. System
        tools are available to standalone agents; integration tools are
        provisioned automatically when you save a Notion connection and become
        usable inside workflows.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1 — System tools
// ---------------------------------------------------------------------------

function SystemToolsSection({
  onOpen,
}: {
  onOpen: (tool: SystemTool) => void;
}) {
  return (
    <Card>
      <CardHeader className="grid gap-1">
        <CardTitle className="flex items-center gap-2">
          System tools
          <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wider">
            Built in
          </Badge>
        </CardTitle>
        <CardDescription>
          The 4 generic tools available on every standalone agent. These do not
          depend on any integration.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {SYSTEM_TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onOpen(t)}
            className="border-border/60 hover:bg-accent/40 grid gap-1 rounded-lg border p-3 text-left transition"
          >
            <div className="flex items-center gap-2">
              <div className="bg-muted text-muted-foreground flex size-7 items-center justify-center rounded-md">
                <t.icon className="size-4" />
              </div>
              <span className="text-sm font-medium">{t.name}</span>
            </div>
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {t.description}
            </p>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section 2 — Integration tools
// ---------------------------------------------------------------------------

function IntegrationToolsSection({
  integrations,
  ready,
  onOpen,
  onResync,
}: {
  integrations: NotionIntegration[];
  ready: boolean;
  onOpen: (
    integration: NotionIntegration,
    preview: ToolPreview,
    ref: { id: string; lastSyncedAt: string } | undefined,
  ) => void;
  onResync: (record: NotionIntegration) => void;
}) {
  return (
    <Card>
      <CardHeader className="grid gap-1">
        <CardTitle className="flex items-center gap-2">
          Integration tools
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-medium uppercase tracking-wider"
          >
            Auto-generated
          </Badge>
        </CardTitle>
        <CardDescription>
          Each Notion integration generates 5 Vapi function tools — save, find,
          search, update and archive — keyed to its field map. Workflows can
          drop these directly onto the canvas.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!ready ? (
          <div className="border-border/40 h-32 animate-pulse rounded-lg border" />
        ) : integrations.length === 0 ? (
          <EmptyIntegrationsState />
        ) : (
          integrations.map((integration, idx) => (
            <React.Fragment key={integration.id}>
              {idx > 0 && <Separator className="opacity-50" />}
              <IntegrationBlock
                integration={integration}
                onOpen={onOpen}
                onResync={onResync}
              />
            </React.Fragment>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function IntegrationBlock({
  integration,
  onOpen,
  onResync,
}: {
  integration: NotionIntegration;
  onOpen: (
    integration: NotionIntegration,
    preview: ToolPreview,
    ref: { id: string; lastSyncedAt: string } | undefined,
  ) => void;
  onResync: (record: NotionIntegration) => void;
}) {
  const previews = React.useMemo(
    () => buildNotionToolPreviews(integration),
    [integration],
  );

  const refByKind = new Map(
    (integration.vapiTools ?? []).map((t) => [t.kind, t]),
  );
  const status = integration.syncStatus ?? (refByKind.size ? "synced" : "idle");

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-zinc-200/10 text-[11px] font-semibold text-zinc-100 ring-1 ring-zinc-200/20">
            N
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="truncate">{integration.label}</span>
              <StatusBadge status={status} lastError={integration.lastSyncError} />
            </div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <DatabaseIcon className="size-3" />
              <span className="truncate">
                {integration.databaseTitle || "Untitled"}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onResync(integration)}
          disabled={status === "syncing"}
          className="gap-1.5"
        >
          {status === "syncing" ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <RefreshCwIcon className="size-3.5" />
          )}
          Resync
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {previews.map((preview) => {
          const ref = refByKind.get(preview.kind);
          const Icon = KIND_ICON[preview.kind];
          return (
            <button
              key={preview.kind}
              type="button"
              onClick={() => onOpen(integration, preview, ref)}
              className="border-border/60 hover:bg-accent/40 grid gap-1.5 rounded-lg border p-3 text-left transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "bg-muted flex size-7 items-center justify-center rounded-md",
                      KIND_TONE[preview.kind],
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <span className="text-sm font-medium">
                    {NOTION_TOOL_LABELS[preview.kind].name}
                  </span>
                </div>
                {ref ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-normal"
                  >
                    Live
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-muted-foreground/70 text-[10px] font-normal"
                  >
                    Pending
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground line-clamp-2 text-xs">
                {NOTION_TOOL_LABELS[preview.kind].description}
              </p>
              <div className="text-muted-foreground/80 mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="font-mono">
                  {Object.keys(preview.parameters.properties).length} params
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span className="truncate font-mono">
                  {preview.functionName}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  lastError,
}: {
  status: "idle" | "syncing" | "synced" | "error";
  lastError?: string;
}) {
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
      <Badge
        variant="outline"
        title={lastError ?? "Sync failed"}
        className="border-destructive/40 bg-destructive/10 text-destructive gap-1 text-[10px] font-normal"
      >
        <CircleAlertIcon className="size-3" />
        Sync error
      </Badge>
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
    <Badge
      variant="outline"
      className="text-muted-foreground/70 text-[10px] font-normal"
    >
      Not synced
    </Badge>
  );
}

function EmptyIntegrationsState() {
  return (
    <div className="border-border/40 grid place-items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center">
      <DatabaseIcon className="text-muted-foreground/60 size-6" />
      <p className="text-sm font-medium">No integration tools yet</p>
      <p className="text-muted-foreground max-w-md text-xs">
        Connect a Notion database from Integrations. Saving the connection
        provisions 5 Vapi function tools mapped to your column types.
      </p>
      <Button asChild variant="outline" size="sm" className="mt-1 gap-1.5">
        <Link href="/integrations/notion/new">
          <PlusIcon className="size-4" />
          Add Notion connection
        </Link>
      </Button>
    </div>
  );
}
