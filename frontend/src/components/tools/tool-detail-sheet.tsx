"use client";

import * as React from "react";
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  DatabaseIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ToolPreview } from "@/lib/integrations/notion/tool-builder";
import { NOTION_TOOL_LABELS, type NotionIntegration } from "@/lib/integrations/types";

export type ToolDetail =
  | {
      kind: "system";
      id: string;
      name: string;
      description: string;
      preview: { description: string; parameters: { type: "object"; properties: Record<string, unknown> } };
    }
  | {
      kind: "notion";
      integration: NotionIntegration;
      preview: ToolPreview;
      vapiToolId: string | null;
      lastSyncedAt: string | null;
    };

export function ToolDetailSheet({
  open,
  onOpenChange,
  detail,
  onResync,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: ToolDetail | null;
  onResync?: (record: NotionIntegration) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-xl">
        {detail && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {detail.kind === "system"
                  ? detail.name
                  : NOTION_TOOL_LABELS[detail.preview.kind].name}
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] font-normal"
                >
                  {detail.kind === "system" ? "system" : "notion"}
                </Badge>
              </SheetTitle>
              <SheetDescription>
                {detail.kind === "system"
                  ? detail.description
                  : detail.preview.description}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {detail.kind === "notion" ? (
                <NotionToolBody detail={detail} />
              ) : (
                <SystemToolBody detail={detail} />
              )}
            </div>

            {detail.kind === "notion" && onResync && (
              <>
                <Separator />
                <SheetFooter>
                  <Button
                    variant="outline"
                    onClick={() => onResync(detail.integration)}
                    disabled={detail.integration.syncStatus === "syncing"}
                    className="gap-1.5"
                  >
                    {detail.integration.syncStatus === "syncing" ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <RefreshCwIcon className="size-4" />
                    )}
                    Resync tools
                  </Button>
                </SheetFooter>
              </>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function NotionToolBody({
  detail,
}: {
  detail: Extract<ToolDetail, { kind: "notion" }>;
}) {
  const { integration, preview, vapiToolId, lastSyncedAt } = detail;
  return (
    <div className="grid gap-4 pt-2">
      <Metadata
        items={[
          { label: "Function name", value: preview.functionName, mono: true },
          {
            label: "Integration",
            value: integration.label,
            icon: <DatabaseIcon className="size-3.5" />,
          },
          { label: "Database", value: integration.databaseTitle || "Untitled" },
          {
            label: "Tool id",
            value: vapiToolId ?? "Not synced",
            mono: true,
            muted: !vapiToolId,
          },
          {
            label: "Last synced",
            value: lastSyncedAt ? formatRelative(lastSyncedAt) : "Never",
            icon: lastSyncedAt ? (
              <CheckCircle2Icon className="size-3.5 text-emerald-400" />
            ) : (
              <CircleAlertIcon className="text-muted-foreground size-3.5" />
            ),
          },
        ]}
      />
      <ParametersBlock
        title="Function parameters"
        parameters={preview.parameters}
      />
    </div>
  );
}

function SystemToolBody({
  detail,
}: {
  detail: Extract<ToolDetail, { kind: "system" }>;
}) {
  return (
    <div className="grid gap-4 pt-2">
      <Metadata
        items={[
          { label: "Tool id", value: detail.id, mono: true },
          { label: "Origin", value: "Built in" },
        ]}
      />
      <ParametersBlock
        title="Function parameters"
        parameters={detail.preview.parameters}
      />
    </div>
  );
}

function Metadata({
  items,
}: {
  items: {
    label: string;
    value: string;
    mono?: boolean;
    muted?: boolean;
    icon?: React.ReactNode;
  }[];
}) {
  return (
    <div className="border-border/60 grid divide-y rounded-lg border">
      {items.map((item) => (
        <div
          key={item.label}
          className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-2 px-3 py-2 text-xs"
        >
          <span className="text-muted-foreground">{item.label}</span>
          <span
            className={[
              "flex items-center gap-1.5 truncate",
              item.mono ? "font-mono" : "",
              item.muted ? "text-muted-foreground" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {item.icon}
            <span className="truncate">{item.value}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function ParametersBlock({
  title,
  parameters,
}: {
  title: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <Badge variant="outline" className="text-[10px] font-normal">
          {Object.keys(parameters.properties).length} fields
        </Badge>
      </div>
      <pre className="bg-muted/40 border-border/60 overflow-x-auto rounded-lg border p-3 font-mono text-[11px] leading-relaxed">
        {JSON.stringify(parameters, null, 2)}
      </pre>
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
