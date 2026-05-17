"use client";

import * as React from "react";
import Link from "next/link";
import {
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
import { useCompleteNavigationWhenReady } from "@/components/navigation/navigation-pending";
import { PageHeader } from "@/components/page-header";
import {
  ToolDetailSheet,
  type ToolDetail,
} from "@/components/tools/tool-detail-sheet";
import { Button } from "@/components/ui/button";
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
// Static system tool definitions
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
    name: "Query",
    description: "Look up outside facts mid-call via a research agent.",
    icon: SearchIcon,
    preview: {
      description: "Search the public web for a fact and return a short summary.",
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
    description: "Hand the live call off to a human or another number.",
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
    description: "Text a confirmation, link or reference number to the caller.",
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
    description: "Detect voicemail; hang up or leave a templated message.",
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
            description: "Templated message to leave if action is leave_message.",
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

  useCompleteNavigationWhenReady(ready);

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

  if (!ready) {
    return null;
  }

  const totalIntegrationTools = notionIntegrations.reduce(
    (sum, it) => sum + (it.vapiTools?.length ?? 5),
    0,
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 pt-4 md:pt-6">
      <PageHeader
        eyebrow="Build"
        title="Tools"
        description="Function tools available to agents and workflows in this workspace."
      />

      <section className="grid gap-4">
        <SectionHeader
          label="System"
          title="Built-in tools"
          meta={`${SYSTEM_TOOLS.length} available`}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {SYSTEM_TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() =>
                openDetail({
                  kind: "system",
                  id: t.id,
                  name: t.name,
                  description: t.description,
                  preview: t.preview,
                })
              }
              className="group/tool border-border/50 bg-card hover:bg-muted/40 flex items-start gap-3 rounded-xl border p-4 text-left transition-colors"
            >
              <div className="bg-muted/60 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                <t.icon className="size-4" />
              </div>
              <div className="min-w-0 grid gap-0.5">
                <span className="text-sm font-medium">{t.name}</span>
                <p className="text-muted-foreground line-clamp-1 text-xs">
                  {t.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <SectionHeader
          label="Integrations"
          title="Auto-generated tools"
          meta={
            notionIntegrations.length === 0
              ? "Connect Notion to provision"
              : `${totalIntegrationTools} across ${notionIntegrations.length} integration${notionIntegrations.length === 1 ? "" : "s"}`
          }
        />
        {notionIntegrations.length === 0 ? (
          <EmptyIntegrationsState />
        ) : (
          <div className="grid gap-6">
            {notionIntegrations.map((integration) => (
              <IntegrationBlock
                key={integration.id}
                integration={integration}
                onOpen={(preview, ref) =>
                  openDetail({
                    kind: "notion",
                    integration,
                    preview,
                    vapiToolId: ref?.id ?? null,
                    lastSyncedAt: ref?.lastSyncedAt ?? null,
                  })
                }
                onResync={() => handleResync(integration)}
              />
            ))}
          </div>
        )}
      </section>

      <ToolDetailSheet
        open={open}
        onOpenChange={setOpen}
        detail={detail}
        onResync={handleResync}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function SectionHeader({
  label,
  title,
  meta,
}: {
  label: string;
  title: string;
  meta: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="grid gap-1">
        <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]">
          {label}
        </p>
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <p className="text-muted-foreground text-xs tabular-nums">{meta}</p>
    </div>
  );
}

function IntegrationBlock({
  integration,
  onOpen,
  onResync,
}: {
  integration: NotionIntegration;
  onOpen: (
    preview: ToolPreview,
    ref: { id: string; lastSyncedAt: string } | undefined,
  ) => void;
  onResync: () => void;
}) {
  const previews = React.useMemo(
    () => buildNotionToolPreviews(integration),
    [integration],
  );

  const refByKind = React.useMemo(
    () => new Map((integration.vapiTools ?? []).map((t) => [t.kind, t])),
    [integration.vapiTools],
  );
  const status = integration.syncStatus ?? (refByKind.size ? "synced" : "idle");

  return (
    <div className="border-border/50 bg-card overflow-hidden rounded-xl border">
      <div className="border-border/40 flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="bg-muted/60 text-foreground flex size-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold">
            N
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="truncate">{integration.label}</span>
              <SyncStatus status={status} />
            </div>
            <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
              <DatabaseIcon className="size-3" />
              <span className="truncate">
                {integration.databaseTitle || "Untitled database"}
              </span>
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onResync}
          disabled={status === "syncing"}
          className="text-muted-foreground hover:text-foreground"
        >
          {status === "syncing" ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <RefreshCwIcon className="size-3.5" />
          )}
          Resync
        </Button>
      </div>
      <ul className="divide-border/40 grid divide-y">
        {previews.map((preview) => {
          const ref = refByKind.get(preview.kind);
          const Icon = KIND_ICON[preview.kind];
          return (
            <li key={preview.kind}>
              <button
                type="button"
                onClick={() => onOpen(preview, ref)}
                className="group/row hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
              >
                <span
                  className={cn(
                    "bg-muted/40 flex size-7 shrink-0 items-center justify-center rounded-md",
                    KIND_TONE[preview.kind],
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="text-sm font-medium">
                  {NOTION_TOOL_LABELS[preview.kind].name}
                </span>
                <span className="text-muted-foreground/60 hidden flex-1 truncate text-[11px] sm:block">
                  {NOTION_TOOL_LABELS[preview.kind].description}
                </span>
                <span
                  className={cn(
                    "ml-auto inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em] sm:ml-0",
                    ref ? "text-emerald-400" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      ref ? "bg-emerald-400" : "bg-muted-foreground/50",
                    )}
                  />
                  {ref ? "Live" : "Pending"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SyncStatus({
  status,
}: {
  status: "idle" | "syncing" | "synced" | "error";
}) {
  if (status === "syncing") {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em]">
        <Loader2Icon className="size-2.5 animate-spin" />
        Syncing
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="text-destructive inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em]">
        <CircleAlertIcon className="size-2.5" />
        Sync error
      </span>
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
  return null;
}

function EmptyIntegrationsState() {
  return (
    <div className="border-border/40 bg-card/30 grid place-items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
      <DatabaseIcon className="text-muted-foreground/60 size-5" />
      <p className="text-sm font-medium">No integration tools yet</p>
      <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
        Connect a Notion database from Integrations — saving the connection
        provisions five workflow tools mapped to your column types.
      </p>
      <Button asChild variant="outline" size="sm" className="mt-2">
        <Link href="/integrations/notion/new">
          <PlusIcon className="size-3.5" />
          Add Notion connection
        </Link>
      </Button>
    </div>
  );
}
