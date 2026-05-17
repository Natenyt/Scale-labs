"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleAlertIcon,
  ClockIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import { useCompleteNavigationWhenReady } from "@/components/navigation/navigation-pending";
import { NewWorkflowDialog } from "@/components/workflows/new-workflow-dialog";
import { useWorkflows } from "@/components/workflows/workflows-store";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteWorkflowOnVapi } from "@/lib/workflows/sync-client";
import type { Workflow } from "@/lib/workflows/types";

export default function WorkflowListPage() {
  const { workflows, ready, deleteWorkflow } = useWorkflows();
  const [createOpen, setCreateOpen] = React.useState(false);

  useCompleteNavigationWhenReady(ready);

  const openCreate = React.useCallback(() => setCreateOpen(true), []);

  const handleDelete = React.useCallback(
    (record: Workflow) => {
      void deleteWorkflowOnVapi(record);
      deleteWorkflow(record.id);
    },
    [deleteWorkflow],
  );

  if (!ready) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 pt-4 md:pt-6">
      <PageHeader
        eyebrow="Build"
        title="Workflows"
        description="Visual orchestration for multi-step calls. Each saved workflow is published to the voice runtime so agents can run it on live calls."
        actions={
          <Button type="button" onClick={openCreate} className="h-9">
            <PlusIcon className="size-3.5" />
            New workflow
          </Button>
        }
      />

      <NewWorkflowDialog open={createOpen} onOpenChange={setCreateOpen} />

      <Card>
        <div className="divide-border/40 divide-y">
          {workflows.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            workflows.map((w) => (
              <WorkflowRow
                key={w.id}
                record={w}
                onDelete={() => handleDelete(w)}
              />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function WorkflowRow({
  record,
  onDelete,
}: {
  record: Workflow;
  onDelete: () => void;
}) {
  const nodeCount = record.nodes.length;
  const edgeCount = record.edges.length;
  return (
    <div className="group/row hover:bg-muted/30 flex items-center justify-between gap-3 px-4 py-3 transition-colors">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link
            href={`/workflow/${record.id}`}
            className="truncate hover:underline underline-offset-2"
          >
            {record.name}
          </Link>
          <SyncBadge record={record} />
        </div>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="tabular-nums">
            {nodeCount} node{nodeCount === 1 ? "" : "s"}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="tabular-nums">
            {edgeCount} edge{edgeCount === 1 ? "" : "s"}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <ClockIcon className="size-3" />
          <span>Updated {formatRelative(record.updatedAt)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover/row:opacity-100"
          onClick={onDelete}
          aria-label="Delete workflow"
        >
          <Trash2Icon className="size-3.5" />
        </Button>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/workflow/${record.id}`}>
            Open
            <ChevronRightIcon className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SyncBadge({ record }: { record: Workflow }) {
  const status = record.syncStatus ?? "idle";
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
          {record.lastSyncError ?? "Sync failed. Open the workflow and Save again."}
        </TooltipContent>
      </Tooltip>
    );
  }
  if (status === "synced" && record.vapiWorkflowId) {
    return (
      <span className="text-emerald-400 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em]">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        Published
      </span>
    );
  }
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em]">
      <span className="size-1.5 rounded-full bg-muted-foreground/50" />
      Draft
    </span>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid place-items-center gap-3 px-4 py-16 text-center">
      <p className="text-sm font-medium">No workflows yet</p>
      <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
        A workflow chains conversation, tool, transfer and API-request nodes so an
        agent can complete a real task. Start with a single Conversation node and grow
        it from there.
      </p>
      <Button type="button" onClick={onCreate} size="sm" className="mt-2">
        <PlusIcon className="size-3.5" />
        Create your first workflow
      </Button>
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
