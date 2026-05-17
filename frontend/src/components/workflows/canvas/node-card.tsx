"use client";

import * as React from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  CableIcon,
  CircleDotIcon,
  FlagIcon,
  GlobeIcon,
  MessagesSquareIcon,
  PhoneForwardedIcon,
  WrenchIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkflowNode, WorkflowNodeKind } from "@/lib/workflows/types";
import { WORKFLOW_NODE_LABELS } from "@/lib/workflows/types";

/**
 * React Flow custom node. One renderer for every kind; the kind drives the
 * icon, tone and summary line. Editing happens in the inspector, not inside
 * the node body.
 */
export type WorkflowNodeData = {
  node: WorkflowNode;
  runtimeActive?: boolean;
};

const KIND_VISUALS: Record<
  WorkflowNodeKind,
  {
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
    accent: string;
  }
> = {
  start: {
    icon: FlagIcon,
    tone: "from-emerald-500/15 to-emerald-500/5 ring-emerald-500/25",
    accent: "text-emerald-300",
  },
  conversation: {
    icon: MessagesSquareIcon,
    tone: "from-sky-500/15 to-sky-500/5 ring-sky-500/25",
    accent: "text-sky-300",
  },
  tool: {
    icon: WrenchIcon,
    tone: "from-violet-500/15 to-violet-500/5 ring-violet-500/25",
    accent: "text-violet-300",
  },
  transfer_call: {
    icon: PhoneForwardedIcon,
    tone: "from-amber-500/15 to-amber-500/5 ring-amber-500/25",
    accent: "text-amber-300",
  },
  end_call: {
    icon: CircleDotIcon,
    tone: "from-rose-500/15 to-rose-500/5 ring-rose-500/25",
    accent: "text-rose-300",
  },
  api_request: {
    icon: CableIcon,
    tone: "from-cyan-500/15 to-cyan-500/5 ring-cyan-500/25",
    accent: "text-cyan-300",
  },
};

/** Subtle viewport outline on the minimap (muted so node colors stay primary). */
export const MINIMAP_VIEWPORT_STROKE = "rgba(148, 163, 184, 0.85)";

/** Solid fills for the navigator minimap (matches KIND_VISUALS accents). */
export const MINIMAP_NODE_COLORS: Record<WorkflowNodeKind, string> = {
  start: "#34d399",
  conversation: "#94a3b8",
  tool: "#a78bfa",
  transfer_call: "#fbbf24",
  end_call: "#fb7185",
  api_request: "#22d3ee",
};

const MINIMAP_NODE_STROKE: Record<WorkflowNodeKind, string> = {
  start: "#059669",
  conversation: "#475569",
  tool: "#7c3aed",
  transfer_call: "#d97706",
  end_call: "#e11d48",
  api_request: "#0891b2",
};

export const MINIMAP_RUNTIME_ACTIVE_COLOR = "#2dd4bf";

export function createMinimapNodeColor(runtimeActiveNodeId: string | null) {
  return (node: Node): string => {
    if (runtimeActiveNodeId && node.id === runtimeActiveNodeId) {
      return MINIMAP_RUNTIME_ACTIVE_COLOR;
    }
    return minimapNodeColor(node);
  };
}

export function minimapNodeColor(node: Node): string {
  const kind = (node.data as WorkflowNodeData | undefined)?.node?.kind;
  if (!kind) return "#64748b";
  return MINIMAP_NODE_COLORS[kind];
}

export function minimapNodeStrokeColor(node: Node): string {
  const kind = (node.data as WorkflowNodeData | undefined)?.node?.kind;
  if (!kind) return "#334155";
  return MINIMAP_NODE_STROKE[kind];
}

export function WorkflowNodeCard({
  data,
  selected,
}: NodeProps & { data: WorkflowNodeData }) {
  const node = data.node;
  const meta = KIND_VISUALS[node.kind];
  const Icon = meta.icon;
  const kindLabel = WORKFLOW_NODE_LABELS[node.kind].name;
  const isStart = node.kind === "start";
  const isEnd = node.kind === "end_call";
  const summary = describeNode(node);
  const runtimeActive = Boolean(data.runtimeActive);

  return (
    <div
      className={cn(
        "group w-[240px] rounded-xl border bg-gradient-to-br p-3 shadow-sm ring-1 ring-inset transition",
        meta.tone,
        runtimeActive && "workflow-node-runtime-active z-10 ring-2 ring-teal-400/80",
        !runtimeActive &&
          (selected
            ? "border-foreground/40 shadow-lg ring-2 ring-white/50"
            : "border-border/60 hover:border-foreground/30"),
      )}
    >
      {!isStart && (
        <Handle
          type="target"
          position={Position.Left}
          className="!size-2 !border-2 !border-background !bg-foreground/60"
        />
      )}
      {!isEnd && (
        <Handle
          type="source"
          position={Position.Right}
          className="!size-2 !border-2 !border-background !bg-foreground/60"
        />
      )}

      <div className="flex items-start gap-2">
        <div
          className={cn(
            "ring-foreground/10 mt-0.5 flex size-7 items-center justify-center rounded-lg bg-background/50 ring-1",
            meta.accent,
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 grow">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">
              {node.label?.trim() || kindLabel}
            </span>
            {node.isGlobal ? (
              <Badge
                variant="outline"
                className="border-foreground/20 bg-background/40 h-4 gap-1 px-1 text-[9px] font-medium uppercase tracking-wider"
              >
                <GlobeIcon className="size-2.5" />
                Global
              </Badge>
            ) : null}
          </div>
          <div className="text-muted-foreground/80 mt-0.5 text-[10px] uppercase tracking-wider">
            {kindLabel}
          </div>
        </div>
      </div>

      {summary ? (
        <p className="text-muted-foreground/90 mt-2 line-clamp-2 text-xs">
          {summary}
        </p>
      ) : null}

      {(node.kind === "conversation" || node.kind === "start") &&
      (node.attachedTools?.length ?? 0) > 0 ? (
        <div className="mt-2 flex items-center gap-1">
          <WrenchIcon className="text-muted-foreground/70 size-3" />
          <span className="text-muted-foreground/80 text-[10px]">
            {node.attachedTools!.length} tool
            {node.attachedTools!.length === 1 ? "" : "s"} attached
          </span>
        </div>
      ) : null}
    </div>
  );
}

function describeNode(node: WorkflowNode): string | null {
  switch (node.kind) {
    case "start":
    case "conversation":
      return node.firstMessage || node.systemPrompt || null;
    case "tool":
      return node.toolRef?.label
        ? `Calls ${node.toolRef.label}`
        : "Pick a tool…";
    case "transfer_call":
      return node.destination
        ? `Transfer to ${node.destination}`
        : "Set destination…";
    case "end_call":
      return "Hangs up.";
    case "api_request":
      return node.apiRequest?.url
        ? `${node.apiRequest.method} ${node.apiRequest.url}`
        : "Set URL…";
  }
}
