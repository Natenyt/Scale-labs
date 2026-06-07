"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  GitForkIcon,
  Loader2Icon,
  MicIcon,
  SaveIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useIntegrations } from "@/components/integrations/integrations-store";
import { WorkflowCanvas } from "@/components/workflows/canvas/canvas";
import { useWorkflows } from "@/components/workflows/workflows-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkflowTestPanel } from "@/components/workflows/workflow-test-panel";
import { cn } from "@/lib/utils";
import { syncWorkflow } from "@/lib/workflows/sync-client";
import type { NotionIntegration } from "@/lib/integrations/types";
import {
  compileToVapiPayload,
  type CompileError,
} from "@/lib/workflows/vapi-compile";
import type {
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from "@/lib/workflows/types";

export default function WorkflowDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [testMode, setTestMode] = React.useState(false);
  const [runtimeActiveNodeId, setRuntimeActiveNodeId] = React.useState<
    string | null
  >(null);
  const {
    byId,
    ready,
    updateWorkflow,
    replaceGraph,
    setSyncStatus,
    setVapiWorkflowId,
  } = useWorkflows();
  const { byKind } = useIntegrations();

  const workflow = byId(params.id);

  const availableToolIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const i of byKind("notion") as NotionIntegration[]) {
      for (const t of i.vapiTools ?? []) set.add(t.id);
    }
    return set;
  }, [byKind]);

  // Validation is a pure derivation: recompute whenever the workflow or the
  // set of available Vapi tool ids changes. No `useState` + `useEffect` here
  // — the React 19 rule is to derive when you can.
  const errors = React.useMemo<CompileError[]>(() => {
    if (!workflow) return [];
    const compile = compileToVapiPayload(workflow, {
      availableVapiToolIds: availableToolIds,
    });
    return compile.ok ? [] : compile.errors;
  }, [workflow, availableToolIds]);

  if (!ready) {
    return (
      <div className="text-muted-foreground grid place-items-center py-24 text-sm">
        <Loader2Icon className="size-4 animate-spin" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
          <GitForkIcon className="size-5" />
        </div>
        <div className="grid gap-1">
          <h2 className="text-base font-medium">Workflow not found</h2>
          <p className="text-muted-foreground text-sm">
            It may have been deleted or never existed.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/workflow">
            <ArrowLeftIcon className="size-4" />
            Back to workflows
          </Link>
        </Button>
      </div>
    );
  }

  const onGraphChange = (next: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  }) => {
    replaceGraph(workflow.id, next.nodes, next.edges);
  };

  const onSave = async () => {
    if (errors.length > 0) return;
    await syncWorkflow(workflow, { setSyncStatus, setVapiWorkflowId }, {
      availableVapiToolIds: availableToolIds,
    });
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[640px] flex-col gap-3 pt-2 overflow-hidden">
      {/* Fixed-height viewport pane: gives the canvas + test-panel a bounded
          height so the transcript scrolls internally (overflow-y-auto) instead
          of growing the page. NOTE: do NOT add `flex-1` here — flex-basis:0%
          overrides the explicit calc height and re-breaks the scroll. */}
      <Toolbar
        workflow={workflow}
        errors={errors}
        onRename={(name) => updateWorkflow(workflow.id, { name })}
        onBack={() => router.push("/workflow")}
        onSave={() => void onSave()}
        onOpenTest={() => {
          if (!workflow.vapiWorkflowId?.trim()) {
            toast.error("Save and publish this workflow before testing.");
            return;
          }
          setTestMode(true);
          setRuntimeActiveNodeId(null);
        }}
      />
      {errors.length > 0 ? <ValidationBanner errors={errors} /> : null}
      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <div className="min-h-0 min-w-0 flex-1">
          <WorkflowCanvas
            key={workflow.id}
            workflow={workflow}
            onChange={onGraphChange}
            onGlobalPromptChange={(globalPrompt) =>
              updateWorkflow(workflow.id, { globalPrompt })
            }
            runtimeActiveNodeId={testMode ? runtimeActiveNodeId : null}
            hideInspector={testMode}
          />
        </div>
        {testMode ? (
          <WorkflowTestPanel
            workflowName={workflow.name}
            workflowRecordId={workflow.id}
            voiceSynced={Boolean(workflow.vapiWorkflowId?.trim())}
            onClose={() => {
              setTestMode(false);
              setRuntimeActiveNodeId(null);
            }}
            onCallStart={() => setRuntimeActiveNodeId("start")}
            onCallEnd={() => {
              setTestMode(false);
              setRuntimeActiveNodeId(null);
            }}
            onActiveNodeChange={setRuntimeActiveNodeId}
          />
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function Toolbar({
  workflow,
  errors,
  onRename,
  onBack,
  onSave,
  onOpenTest,
}: {
  workflow: Workflow;
  errors: CompileError[];
  onRename: (name: string) => void;
  onBack: () => void;
  onSave: () => void;
  onOpenTest: () => void;
}) {
  const isSyncing = workflow.syncStatus === "syncing";
  const disabled = isSyncing || errors.length > 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs"
        >
          <ArrowLeftIcon className="size-3.5" />
          Workflows
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-sidebar-primary/15 text-sidebar-primary flex size-9 items-center justify-center rounded-lg">
            <GitForkIcon className="size-4" />
          </div>
          <input
            value={workflow.name}
            onChange={(e) => onRename(e.target.value)}
            className="min-w-[16ch] bg-transparent text-xl font-semibold tracking-tight outline-none focus:underline"
            aria-label="Workflow name"
          />
          <SyncBadge workflow={workflow} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {workflow.vapiWorkflowId ? (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-normal"
          >
            Published
          </Badge>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={() => onOpenTest()}
        >
          <MicIcon className="size-4" />
          Test call
        </Button>
        <Button
          onClick={onSave}
          disabled={disabled}
          className="gap-1.5"
          aria-label="Save workflow"
        >
          {isSyncing ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SaveIcon className="size-4" />
          )}
          {workflow.vapiWorkflowId ? "Save & publish" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function SyncBadge({ workflow }: { workflow: Workflow }) {
  const status = workflow.syncStatus ?? "idle";
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
        className="border-destructive/40 bg-destructive/10 text-destructive gap-1 text-[10px] font-normal"
      >
        <CircleAlertIcon className="size-3" />
        Sync error
      </Badge>
    );
  }
  if (status === "synced" && workflow.vapiWorkflowId) {
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

function ValidationBanner({ errors }: { errors: CompileError[] }) {
  return (
    <div
      className={cn(
        "border-destructive/30 bg-destructive/10 text-destructive grid gap-1 rounded-lg border px-3 py-2",
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium">
        <AlertTriangleIcon className="size-3.5" />
        {errors.length} validation{" "}
        {errors.length === 1 ? "issue" : "issues"} before save
      </div>
      <ul className="text-destructive/90 grid gap-0.5 pl-5 text-[11px]">
        {errors.slice(0, 4).map((err, idx) => (
          <li key={idx} className="list-disc">
            {err.message}
          </li>
        ))}
        {errors.length > 4 ? (
          <li className="list-disc">{errors.length - 4} more…</li>
        ) : null}
      </ul>
    </div>
  );
}
