"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  ClipboardCheckIcon,
  Loader2Icon,
  SparklesIcon,
  StarIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useWorkflows } from "@/components/workflows/workflows-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasBackendApi } from "@/lib/api/env";
import { isDemoSession } from "@/lib/demo/constants";
import { getAccessToken } from "@/lib/api/tokens";
import {
  CreateWorkflowError,
  createWorkflowFromTemplate,
} from "@/lib/workflows/create-workflow";
import {
  WORKFLOW_TEMPLATES,
  type WorkflowTemplateId,
} from "@/lib/workflows/templates";
import { cn } from "@/lib/utils";

const TEMPLATE_ICONS = {
  blank: SparklesIcon,
  "lead-qualification": ClipboardCheckIcon,
  "appointment-scheduler": CalendarIcon,
  "customer-satisfaction": StarIcon,
} as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatCreateError(e: unknown): string {
  const body =
    e instanceof CreateWorkflowError
      ? e.body
      : e instanceof Error && "body" in e
        ? (e as Error & { body?: unknown }).body
        : null;
  let desc = e instanceof Error ? e.message : "Create failed";
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    if (o.vapi != null) {
      desc = typeof o.vapi === "string" ? o.vapi : JSON.stringify(o.vapi);
    } else if (typeof o.detail === "string") {
      desc = o.detail;
    } else if (o.error != null) {
      desc =
        typeof o.error === "string" ? o.error : JSON.stringify(o.error);
    }
  }
  return desc;
}

export function NewWorkflowDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { createWorkflow, setSyncStatus, setVapiWorkflowId } = useWorkflows();

  const [step, setStep] = React.useState<"template" | "details">("template");
  const [templateId, setTemplateId] =
    React.useState<WorkflowTemplateId>("blank");
  const [name, setName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [prevOpen, setPrevOpen] = React.useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStep("template");
      setTemplateId("blank");
      setName("");
    }
  }

  const template =
    WORKFLOW_TEMPLATES.find((t) => t.id === templateId) ??
    WORKFLOW_TEMPLATES[0]!;

  const handleContinue = () => {
    setName(template.defaultWorkflowName);
    setStep("details");
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const workflow = await createWorkflowFromTemplate(
        templateId,
        name,
        { createWorkflow, setSyncStatus, setVapiWorkflowId },
      );
      const synced = templateId !== "blank";
      toast.success(
        synced
          ? `"${workflow.name}" is published and ready to edit.`
          : `"${workflow.name}" is ready — open the canvas to design your flow.`,
      );
      onOpenChange(false);
      router.push(`/workflow/${workflow.id}`);
    } catch (e) {
      toast.error("Could not create workflow", {
        description: formatCreateError(e),
      });
    } finally {
      setCreating(false);
    }
  };

  const needsSignIn =
    hasBackendApi() && !getAccessToken()?.trim() && !isDemoSession();
  const isTemplate = templateId !== "blank";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === "template" ? "Create a new workflow" : "Name your workflow"}
          </DialogTitle>
          <DialogDescription>
            {step === "template"
              ? "Start blank or use a pre-built template. Templates are published immediately."
              : `Starting from "${template.name}". You can rename and edit everything on the canvas.`}
          </DialogDescription>
        </DialogHeader>

        {step === "template" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {WORKFLOW_TEMPLATES.map((t) => {
              const Icon = TEMPLATE_ICONS[t.id];
              const selected = t.id === templateId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateId(t.id)}
                  className={cn(
                    "border-input bg-card text-card-foreground flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition",
                    "hover:bg-accent/40",
                    selected
                      ? "border-foreground/40 ring-foreground/20 bg-accent/30 ring-2"
                      : "ring-1 ring-transparent",
                  )}
                >
                  <div className="bg-sidebar-primary/15 text-sidebar-primary flex size-9 items-center justify-center rounded-lg">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{t.name}</div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="workflow-name">Name</Label>
              <Input
                id="workflow-name"
                value={name}
                placeholder="e.g. Lead qualification"
                autoFocus
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {isTemplate ? (
              <p className="text-muted-foreground text-xs leading-relaxed">
                This workflow will be created in your workspace and published with
                the full template graph (nodes, edges, and prompts).
              </p>
            ) : (
              <p className="text-muted-foreground text-xs leading-relaxed">
                A blank workflow starts with one Start node. Use Save on the canvas
                when you are ready to publish it.
              </p>
            )}
            {needsSignIn ? (
              <p className="text-destructive border-destructive/30 bg-destructive/5 rounded-md border px-3 py-2 text-xs leading-relaxed">
                Sign in with your <strong>Scale Labs</strong> account to create
                workflows. Use the presentation account on the login page for demos.
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          {step === "template" ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleContinue}>
                Continue
                <ArrowRightIcon className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep("template")}>
                <ArrowLeftIcon className="size-4" />
                Back
              </Button>
              <Button
                onClick={() => void handleCreate()}
                disabled={creating || !name.trim() || needsSignIn}
              >
                {creating ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                {creating
                  ? isTemplate
                    ? "Publishing…"
                    : "Creating workflow…"
                  : isTemplate
                    ? "Create workflow"
                    : "Create workflow"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
