"use client";

import * as React from "react";
import {
  CableIcon,
  CircleDotIcon,
  FlagIcon,
  MessagesSquareIcon,
  PhoneForwardedIcon,
  WrenchIcon,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  WORKFLOW_NODE_LABELS,
  type WorkflowNodeKind,
} from "@/lib/workflows/types";

export const PALETTE_DRAG_MIME = "application/x-scalelabs-node-kind";

type PaletteItem = {
  kind: Exclude<WorkflowNodeKind, "start">;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

const ITEMS: PaletteItem[] = [
  { kind: "conversation", icon: MessagesSquareIcon, accent: "text-sky-300" },
  { kind: "tool", icon: WrenchIcon, accent: "text-violet-300" },
  { kind: "transfer_call", icon: PhoneForwardedIcon, accent: "text-amber-300" },
  { kind: "end_call", icon: CircleDotIcon, accent: "text-rose-300" },
  { kind: "api_request", icon: CableIcon, accent: "text-cyan-300" },
];

/**
 * Left palette. Two modes:
 *   - drag a card onto the canvas (preferred)
 *   - click "Add" to drop near the viewport centre as a fallback
 */
export function WorkflowPalette({
  onAdd,
}: {
  onAdd: (kind: Exclude<WorkflowNodeKind, "start">) => void;
}) {
  const onDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    kind: WorkflowNodeKind,
  ) => {
    e.dataTransfer.setData(PALETTE_DRAG_MIME, kind);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="bg-card/30 grid h-full gap-3 overflow-y-auto rounded-xl border p-3">
      <div className="grid gap-0.5">
        <div className="text-xs font-medium">Nodes</div>
        <p className="text-muted-foreground text-[11px]">
          Drag onto the canvas or click to drop near the centre. Start node is
          pinned.
        </p>
      </div>
      <div className="grid gap-2">
        <PaletteRow
          kind="start"
          icon={FlagIcon}
          accent="text-emerald-300"
          disabled
        />
        {ITEMS.map((it) => (
          <PaletteRow
            key={it.kind}
            kind={it.kind}
            icon={it.icon}
            accent={it.accent}
            onDragStart={(e) => onDragStart(e, it.kind)}
            onClick={() => onAdd(it.kind)}
          />
        ))}
      </div>
    </div>
  );
}

function PaletteRow({
  kind,
  icon: Icon,
  accent,
  onDragStart,
  onClick,
  disabled,
}: {
  kind: WorkflowNodeKind;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const meta = WORKFLOW_NODE_LABELS[kind];
  const node = (
    <div
      draggable={!disabled}
      onDragStart={disabled ? undefined : onDragStart}
      onClick={disabled ? undefined : onClick}
      role={disabled ? undefined : "button"}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "border-border/60 bg-background/40 group flex items-center gap-2 rounded-lg border px-2 py-1.5 transition",
        disabled
          ? "cursor-default opacity-60"
          : "hover:border-foreground/30 hover:bg-accent/40 active:cursor-grabbing cursor-grab",
      )}
    >
      <div
        className={cn(
          "ring-foreground/10 flex size-7 shrink-0 items-center justify-center rounded-md bg-background/60 ring-1",
          accent,
        )}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 grow">
        <div className="truncate text-xs font-medium">{meta.name}</div>
        <div className="text-muted-foreground/80 line-clamp-2 text-[10px]">
          {meta.description}
        </div>
      </div>
    </div>
  );

  if (!disabled) return node;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>{node}</span>
      </TooltipTrigger>
      <TooltipContent>Every workflow has exactly one Start.</TooltipContent>
    </Tooltip>
  );
}
