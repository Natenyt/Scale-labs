"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BellRingIcon,
  HeadphonesIcon,
  Loader2Icon,
  SparklesIcon,
  UserCheckIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useAgents } from "@/components/agents/agents-store";
import { hasBackendApi } from "@/lib/api/env";
import { getAccessToken } from "@/lib/api/tokens";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TEMPLATES, type Language } from "@/lib/agents/types";

const TEMPLATE_ICONS = {
  blank: SparklesIcon,
  support: HeadphonesIcon,
  outbound: BellRingIcon,
  recruitment: UserCheckIcon,
} as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewAgentDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { createAgent } = useAgents();

  const [step, setStep] = React.useState<"template" | "details">("template");
  const [templateId, setTemplateId] = React.useState<string>("blank");
  const [name, setName] = React.useState("");
  const [language, setLanguage] = React.useState<Language>("en");
  const [creating, setCreating] = React.useState(false);
  const [prevOpen, setPrevOpen] = React.useState(open);

  // Reset wizard state whenever the dialog transitions from closed to open.
  // Adjusting state during render is the React-recommended alternative to
  // using an effect for this kind of synchronization.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStep("template");
      setTemplateId("blank");
      setName("");
      setLanguage("en");
    }
  }

  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];

  const handleCreate = async () => {
    setCreating(true);
    try {
      const agent = await createAgent(template, name, language);
      toast.success(`"${agent.name}" is ready — you can talk to it now.`);
      onOpenChange(false);
      router.push(`/agents/${agent.id}`);
    } catch (e) {
      const body =
        e instanceof Error && "body" in e
          ? (e as Error & { body?: unknown }).body
          : null;
      let desc = e instanceof Error ? e.message : "Create failed";
      if (body && typeof body === "object") {
        const o = body as Record<string, unknown>;
        if (o.vapi != null) {
          desc =
            typeof o.vapi === "string" ? o.vapi : JSON.stringify(o.vapi);
        } else if (typeof o.detail === "string") {
          desc = o.detail;
        }
      }
      toast.error("Could not create agent", { description: desc });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === "template" ? "Create a new agent" : "Name your agent"}
          </DialogTitle>
          <DialogDescription>
            {step === "template"
              ? "Pick a template to start from. You can change everything later."
              : `Starting from "${template.name}". Give your agent a name and choose a language.`}
          </DialogDescription>
        </DialogHeader>

        {step === "template" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TEMPLATES.map((t) => {
              const Icon = TEMPLATE_ICONS[t.id as keyof typeof TEMPLATE_ICONS];
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
              <Label htmlFor="agent-name">Name</Label>
              <Input
                id="agent-name"
                value={name}
                placeholder="e.g. Atlas"
                autoFocus
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="agent-language">Primary language</Label>
              <Select
                value={language}
                onValueChange={(v) => setLanguage(v as Language)}
              >
                <SelectTrigger id="agent-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ru">Russian</SelectItem>
                  <SelectItem value="uz">Uzbek</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Determines the voice provider and default voice. You can change it later.
              </p>
            </div>
            {hasBackendApi() && !getAccessToken()?.trim() ? (
              <p className="text-destructive border-destructive/30 bg-destructive/5 rounded-md border px-3 py-2 text-xs leading-relaxed">
                Sign in with your <strong>Scale Labs</strong> account to create an agent. The
                backend then creates the voice assistant using the{" "}
                <strong>platform&apos;s</strong> server configuration — your users never need
                their own API keys.
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
              <Button onClick={() => setStep("details")}>
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
                disabled={
                  creating ||
                  !name.trim() ||
                  (hasBackendApi() && !getAccessToken()?.trim())
                }
              >
                {creating ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                {creating ? "Creating agent and voice…" : "Create agent"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
