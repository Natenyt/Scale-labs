"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleAlertIcon,
  ClockIcon,
  ExternalLinkIcon,
  GitForkIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import { useWorkflows } from "@/components/workflows/workflows-store";
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
import { defaultStartNode } from "@/lib/workflows/store";
import { deleteWorkflowOnVapi } from "@/lib/workflows/sync-client";
import type { Workflow } from "@/lib/workflows/types";

export default function WorkflowListPage() {
  const router = useRouter();
  const { workflows, ready, createWorkflow, deleteWorkflow } = useWorkflows();

  const handleCreate = React.useCallback(async () => {
    if (hasBackendApi()) {
      try {
        const created = await apiFetch<{
          id: string;
          name: string;
          graph: { nodes: Workflow["nodes"]; edges: Workflow["edges"] };
          global_prompt: string;
          vapi_workflow_id: string | null;
          last_synced_at: string | null;
        }>("/api/v1/workflows/", {
          method: "POST",
          json: {
            name: "Untitled workflow",
            graph: { nodes: [defaultStartNode()], edges: [] },
            global_prompt: "",
          },
        });
        createWorkflow({
          id: created.id,
          name: created.name,
          nodes: created.graph.nodes,
          edges: created.graph.edges,
          globalPrompt: created.global_prompt || undefined,
          vapiWorkflowId: created.vapi_workflow_id ?? undefined,
          lastSyncedAt: created.last_synced_at ?? undefined,
        });
        router.push(`/workflow/${created.id}`);
      } catch {
        const record = createWorkflow({ name: "Untitled workflow" });
        router.push(`/workflow/${record.id}`);
      }
    } else {
      const record = createWorkflow({ name: "Untitled workflow" });
      router.push(`/workflow/${record.id}`);
    }
  }, [createWorkflow, router]);

  const handleDelete = React.useCallback(
    (record: Workflow) => {
      // Best-effort cleanup on Vapi, don't block local delete.
      void deleteWorkflowOnVapi(record);
      deleteWorkflow(record.id);
    },
    [deleteWorkflow],
  );

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 pt-2">
      <PageHeader onCreate={handleCreate} />

      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <div className="bg-zinc-200/10 ring-zinc-200/20 flex size-11 items-center justify-center rounded-xl text-zinc-100 ring-1">
            <GitForkIcon className="size-5" />
          </div>
          <div className="grid gap-1">
            <CardTitle>Your workflows</CardTitle>
            <CardDescription>
              Design a Vapi workflow on the canvas, then Save to mirror it onto
              your Vapi workspace. Tool nodes reference the same Vapi tools your
              integrations provisioned.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
          {!ready ? (
            <EmptySkeleton />
          ) : workflows.length === 0 ? (
            <EmptyState onCreate={handleCreate} />
          ) : (
            workflows.map((w) => (
              <WorkflowRow
                key={w.id}
                record={w}
                onDelete={() => handleDelete(w)}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PageHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
        <p className="text-muted-foreground text-sm">
          Visual orchestration for multi-step calls. Each workflow you save here
          is mirrored to your Vapi workspace so an assistant can dispatch to it.
        </p>
      </div>
      <Button onClick={onCreate} className="gap-1.5">
        <PlusIcon className="size-4" />
        New workflow
      </Button>
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
    <div className="group/row border-border/60 hover:bg-accent/30 flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{record.name}</span>
          <SyncBadge record={record} />
        </div>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
          <span>
            {nodeCount} node{nodeCount === 1 ? "" : "s"}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>
            {edgeCount} edge{edgeCount === 1 ? "" : "s"}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <ClockIcon className="size-3" />
          <span>Updated {formatRelative(record.updatedAt)}</span>
          {record.vapiWorkflowId ? (
            <>
              <span className="text-muted-foreground/40">·</span>
              <a
                href={`https://dashboard.vapi.ai/workflow/${record.vapiWorkflowId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Open in Vapi
                <ExternalLinkIcon className="size-3" />
              </a>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive size-8 px-0"
          onClick={onDelete}
          aria-label="Delete workflow"
        >
          <Trash2Icon className="size-4" />
        </Button>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/workflow/${record.id}`}>
            Open
            <ChevronRightIcon className="size-4" />
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
          {record.lastSyncError ?? "Vapi sync failed. Open and Save again."}
        </TooltipContent>
      </Tooltip>
    );
  }
  if (status === "synced" && record.vapiWorkflowId) {
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
      Draft
    </Badge>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border-border/40 grid place-items-center gap-3 rounded-lg border border-dashed px-4 py-10 text-center">
      <p className="text-sm font-medium">No workflows yet</p>
      <p className="text-muted-foreground max-w-md text-xs">
        A workflow chains conversation, tool, transfer and API-request nodes so
        an agent can complete a real task. Start with a single Conversation
        node and grow it from there.
      </p>
      <Button onClick={onCreate} className="gap-1.5">
        <PlusIcon className="size-4" />
        Create your first workflow
      </Button>
    </div>
  );
}

function EmptySkeleton() {
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
