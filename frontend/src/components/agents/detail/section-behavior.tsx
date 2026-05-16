"use client";

import * as React from "react";
import {
  FileTextIcon,
  SparklesIcon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MODELS, type Agent } from "@/lib/agents/types";

import { FieldRow, SectionShell } from "./section-shell";

type Props = {
  agent: Agent;
  onChange: (patch: Partial<Agent>) => void;
};

export function SectionBehavior({ agent, onChange }: Props) {
  const [dragging, setDragging] = React.useState(false);

  const handleAddFile = (file: File) => {
    onChange({
      knowledgeFiles: [
        ...agent.knowledgeFiles,
        {
          id: `f_${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
        },
      ],
    });
  };

  const handleRemoveFile = (id: string) => {
    onChange({
      knowledgeFiles: agent.knowledgeFiles.filter((f) => f.id !== id),
    });
  };

  const generatePrompt = () => {
    toast.info("Prompt generation coming soon", {
      description:
        "We'll wire this to an LLM-powered prompt rewriter once the backend is online.",
    });
  };

  return (
    <SectionShell
      id="behavior"
      title="Behavior"
      description="The agent's brain. Pick a model, write its system prompt, and feed it knowledge."
    >
      <FieldRow
        label="Model"
        description="GPT-4o Mini Cluster is the default. Stronger models cost more per minute."
        htmlFor="agent-behavior-model"
      >
        <Select
          value={agent.model}
          onValueChange={(v) => onChange({ model: v })}
        >
          <SelectTrigger id="agent-behavior-model" className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <div className="grid">
                  <span>{m.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {m.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow
        label="System prompt"
        description="The instructions the agent always follows. Be specific about tone, scope and what to refuse."
        htmlFor="agent-behavior-system"
      >
        <div className="grid gap-2">
          <div className="relative">
            <Textarea
              id="agent-behavior-system"
              value={agent.systemPrompt}
              rows={9}
              className="pr-24 font-mono text-xs leading-relaxed"
              onChange={(e) => onChange({ systemPrompt: e.target.value })}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={generatePrompt}
              className="absolute right-2 top-2 h-7 gap-1.5 text-xs"
            >
              <SparklesIcon className="size-3" />
              Generate
            </Button>
          </div>
          <p className="text-muted-foreground text-[11px]">
            {agent.systemPrompt.length} characters
          </p>
        </div>
      </FieldRow>

      <FieldRow
        label="First message"
        description="What the agent says first when the call connects."
        htmlFor="agent-behavior-first"
      >
        <Textarea
          id="agent-behavior-first"
          value={agent.firstMessage}
          rows={3}
          onChange={(e) => onChange({ firstMessage: e.target.value })}
        />
      </FieldRow>

      <FieldRow
        label="Knowledge files"
        description="Upload PDFs, markdown or text. The agent will use them to answer questions."
      >
        <div className="grid gap-3">
          <label
            htmlFor="agent-behavior-files"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              Array.from(e.dataTransfer.files).forEach(handleAddFile);
            }}
            className={cn(
              "border-input bg-muted/20 hover:bg-muted/40 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-8 text-center transition",
              dragging && "border-foreground/40 bg-accent/40",
            )}
          >
            <UploadCloudIcon className="text-muted-foreground size-5" />
            <div className="text-sm">
              <span className="font-medium">Click to upload</span>
              <span className="text-muted-foreground"> or drag and drop</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              PDF, MD, TXT — up to 25 MB each
            </p>
            <input
              id="agent-behavior-files"
              type="file"
              accept=".pdf,.md,.txt"
              multiple
              className="hidden"
              onChange={(e) => {
                Array.from(e.target.files ?? []).forEach(handleAddFile);
                e.currentTarget.value = "";
              }}
            />
          </label>

          {agent.knowledgeFiles.length > 0 && (
            <div className="grid gap-2">
              {agent.knowledgeFiles.map((file) => (
                <div
                  key={file.id}
                  className="border-border/50 bg-muted/20 flex items-center gap-3 rounded-lg border px-3 py-2"
                >
                  <div className="bg-background text-muted-foreground flex size-8 items-center justify-center rounded-md border">
                    <FileTextIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {file.name}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {file.sizeKb} KB
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground size-7"
                    onClick={() => handleRemoveFile(file.id)}
                    aria-label="Remove file"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </FieldRow>
    </SectionShell>
  );
}
