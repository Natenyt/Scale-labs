"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  CornerDownRightIcon,
  PlusIcon,
  Trash2Icon,
  WrenchIcon,
  XIcon,
} from "lucide-react";

import { useIntegrations } from "@/components/integrations/integrations-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  NOTION_TOOL_LABELS,
  type NotionIntegration,
  type NotionToolKind,
} from "@/lib/integrations/types";
import {
  WORKFLOW_NODE_LABELS,
  type ExtractVariable,
  type ToolRef,
  type WorkflowEdge,
  type WorkflowNode,
} from "@/lib/workflows/types";
import { suggestEdgeConditionFromPrompt } from "@/lib/workflows/suggest-edge-condition";

/**
 * Right inspector. Kind-specific form fields edit the currently selected node
 * via the `onChange` callback (parent owns canonical state in
 * `useWorkflows()`).
 *
 * The Tool node inspector reads `useIntegrations()` and exposes every Vapi
 * tool the Notion integrations have provisioned. Selecting one writes both
 * the Vapi tool id and a human label onto the node for display.
 */
export function WorkflowInspector({
  node,
  workflowSettings,
  onChange,
  onDelete,
}: {
  node: WorkflowNode | null;
  /**
   * When nothing is selected, the inspector becomes the workflow-level
   * settings panel. Pass the current `globalPrompt` plus a setter to expose
   * the Vapi top-level `globalPrompt` field.
   */
  workflowSettings?: {
    globalPrompt: string;
    onGlobalPromptChange: (next: string) => void;
  };
  onChange: (patch: Partial<WorkflowNode>) => void;
  onDelete: () => void;
}) {
  if (!node) {
    return (
      <div className="bg-card/30 grid h-full grid-rows-[auto_minmax(0,1fr)] gap-3 rounded-xl border p-3">
        <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
          Workflow settings
        </div>
        <div className="grid gap-3 overflow-y-auto pr-1">
          {workflowSettings ? (
            <Field
              label="Global prompt"
              hint="Workflow-wide system prompt. Applied across every conversation node — useful for tone, language, and guardrails."
            >
              <Textarea
                value={workflowSettings.globalPrompt}
                onChange={(e) =>
                  workflowSettings.onGlobalPromptChange(e.target.value)
                }
                placeholder="You are a polite, concise voice assistant. Always speak English…"
                rows={6}
                className="resize-none text-xs"
              />
            </Field>
          ) : null}
          <div className="text-muted-foreground/70 grid gap-1 text-[11px] leading-relaxed">
            <p className="text-foreground/80 text-xs font-medium">
              Nothing selected
            </p>
            <p>
              Click a node to edit it, or click an edge to set a condition.
              Drag from the palette to add new nodes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const kindLabel = WORKFLOW_NODE_LABELS[node.kind].name;
  const isStart = node.kind === "start";

  return (
    <div className="bg-card/30 grid h-full grid-rows-[auto_minmax(0,1fr)_auto] gap-3 rounded-xl border p-3">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
            {kindLabel}
          </div>
          {!isStart ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive size-7 px-0"
              onClick={onDelete}
              aria-label="Delete node"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          ) : null}
        </div>
        <div className="grid gap-1">
          <Label htmlFor="node-label" className="text-xs">
            Label
          </Label>
          <Input
            id="node-label"
            value={node.label ?? ""}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder={kindLabel}
            className="h-8 text-xs"
          />
        </div>

        {!isStart ? (
          <div className="border-border/40 grid gap-2 rounded-md border bg-background/40 p-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="node-global" className="text-xs">
                Global node
              </Label>
              <Switch
                id="node-global"
                checked={Boolean(node.isGlobal)}
                onCheckedChange={(checked) =>
                  onChange({ isGlobal: checked, enterCondition: checked ? node.enterCondition ?? "" : undefined })
                }
              />
            </div>
            {node.isGlobal ? (
              <div className="grid gap-1">
                <Label htmlFor="node-enter" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Entry condition
                </Label>
                <Input
                  id="node-enter"
                  value={node.enterCondition ?? ""}
                  onChange={(e) => onChange({ enterCondition: e.target.value })}
                  placeholder="User wants to speak to a human"
                  className="h-8 text-xs"
                />
              </div>
            ) : (
              <p className="text-muted-foreground/80 text-[10px]">
                Global nodes can be entered from anywhere when their condition
                is met. Use sparingly — overrides incoming edges.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 overflow-y-auto pr-1">
        <KindBody node={node} onChange={onChange} />
      </div>

      <div className="text-muted-foreground border-t pt-2 text-[10px]">
        Node id: <code className="font-mono">{node.id}</code>
      </div>
    </div>
  );
}

function KindBody({
  node,
  onChange,
}: {
  node: WorkflowNode;
  onChange: (patch: Partial<WorkflowNode>) => void;
}) {
  switch (node.kind) {
    case "start":
    case "conversation":
      return <ConversationBody node={node} onChange={onChange} />;
    case "tool":
      return <ToolBody node={node} onChange={onChange} />;
    case "transfer_call":
      return <TransferBody node={node} onChange={onChange} />;
    case "end_call":
      return <EndCallBody />;
    case "api_request":
      return <ApiRequestBody node={node} onChange={onChange} />;
  }
}

// ---------------------------------------------------------------------------
// Conversation / Start
// ---------------------------------------------------------------------------

function ConversationBody({
  node,
  onChange,
}: {
  node: WorkflowNode;
  onChange: (patch: Partial<WorkflowNode>) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field
        label="First message"
        hint="Optional. Spoken when this node activates."
      >
        <Textarea
          value={node.firstMessage ?? ""}
          onChange={(e) => onChange({ firstMessage: e.target.value })}
          placeholder="Hi, this is Scale Labs. How can I help?"
          rows={2}
          className="resize-none text-xs"
        />
      </Field>
      <Field
        label="Prompt"
        hint="Guides how the assistant behaves while this node is active."
      >
        <Textarea
          value={node.systemPrompt ?? ""}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          placeholder="You are a helpful, concise voice assistant…"
          rows={4}
          className="resize-none text-xs"
        />
      </Field>
      <AttachedToolsEditor node={node} onChange={onChange} />
      <ExtractVariablesEditor node={node} onChange={onChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversation: tools the LLM can call mid-turn (compiled to `toolIds[]`)
// ---------------------------------------------------------------------------

function AttachedToolsEditor({
  node,
  onChange,
}: {
  node: WorkflowNode;
  onChange: (patch: Partial<WorkflowNode>) => void;
}) {
  const { byKind, ready } = useIntegrations();
  const notionIntegrations = React.useMemo(
    () => byKind("notion") as NotionIntegration[],
    [byKind],
  );
  type ToolOption = {
    vapiToolId: string;
    label: string;
    integrationId: string;
    kind: NotionToolKind;
  };
  const options = React.useMemo<ToolOption[]>(() => {
    const out: ToolOption[] = [];
    for (const integration of notionIntegrations) {
      for (const tool of integration.vapiTools ?? []) {
        out.push({
          vapiToolId: tool.id,
          label: `${integration.label} · ${NOTION_TOOL_LABELS[tool.kind].name}`,
          integrationId: integration.id,
          kind: tool.kind,
        });
      }
    }
    return out;
  }, [notionIntegrations]);

  const attached = node.attachedTools ?? [];
  const attachedIds = new Set(attached.map((t) => t.vapiToolId));
  const remaining = options.filter((o) => !attachedIds.has(o.vapiToolId));

  const attach = (vapiToolId: string) => {
    const option = options.find((o) => o.vapiToolId === vapiToolId);
    if (!option) return;
    const next: ToolRef = {
      vapiToolId: option.vapiToolId,
      integrationId: option.integrationId,
      label: option.label,
    };
    onChange({ attachedTools: [...attached, next] });
  };
  const detach = (vapiToolId: string) => {
    onChange({
      attachedTools: attached.filter((t) => t.vapiToolId !== vapiToolId),
    });
  };

  return (
    <div className="grid gap-2">
      <div className="grid gap-0.5">
        <Label className="text-xs">Tools available</Label>
        <p className="text-muted-foreground/80 text-[10px]">
          The LLM can call these tools during this conversation turn. Different
          from a standalone Tool node, which forces a single call.
        </p>
      </div>
      {!ready ? (
        <div className="text-muted-foreground text-xs">Loading…</div>
      ) : options.length === 0 ? (
        <div className="border-border/40 grid gap-2 rounded-md border bg-background/40 p-2">
          <div className="text-muted-foreground/90 flex items-center gap-2 text-[11px]">
            <AlertCircleIcon className="text-amber-300 size-3.5" />
            No tools registered yet
          </div>
          <Button asChild variant="outline" size="sm" className="h-7 text-xs">
            <Link href="/integrations">
              <WrenchIcon className="size-3.5" />
              Open Integrations
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {attached.length > 0 ? (
            <div className="grid gap-1">
              {attached.map((tool) => (
                <div
                  key={tool.vapiToolId}
                  className="border-border/40 bg-background/40 flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-[11px]"
                >
                  <span className="truncate">{tool.label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive size-6 px-0"
                    onClick={() => detach(tool.vapiToolId)}
                    aria-label="Remove tool"
                  >
                    <XIcon className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
          {remaining.length > 0 ? (
            <Select value="" onValueChange={attach}>
              <SelectTrigger size="sm" className="text-xs">
                <SelectValue placeholder="Add a tool…" />
              </SelectTrigger>
              <SelectContent>
                {remaining.map((opt) => (
                  <SelectItem key={opt.vapiToolId} value={opt.vapiToolId}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-muted-foreground/70 text-[10px]">
              All available tools are attached.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ExtractVariablesEditor({
  node,
  onChange,
}: {
  node: WorkflowNode;
  onChange: (patch: Partial<WorkflowNode>) => void;
}) {
  const vars = node.extractVariables ?? [];

  const addVar = () => {
    const next: ExtractVariable = {
      name: `var_${vars.length + 1}`,
      type: "string",
      description: "",
    };
    onChange({ extractVariables: [...vars, next] });
  };

  const removeVar = (idx: number) => {
    onChange({
      extractVariables: vars.filter((_, i) => i !== idx),
    });
  };

  const updateVar = (idx: number, patch: Partial<ExtractVariable>) => {
    onChange({
      extractVariables: vars.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    });
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <div className="grid gap-0.5">
          <Label className="text-xs">Extract variables</Label>
          <p className="text-muted-foreground/80 text-[10px]">
            Capture user replies as named variables. Reference them in later
            prompts or edge conditions.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={addVar}
        >
          <PlusIcon className="size-3" /> Add
        </Button>
      </div>
      {vars.length === 0 ? null : (
        <div className="grid gap-2">
          {vars.map((v, idx) => (
            <div
              key={idx}
              className="border-border/40 bg-background/40 grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-1.5 rounded-md border p-2"
            >
              <Input
                value={v.name}
                onChange={(e) => updateVar(idx, { name: e.target.value })}
                placeholder="name"
                className="h-7 text-xs"
              />
              <Select
                value={v.type}
                onValueChange={(value) =>
                  updateVar(idx, { type: value as ExtractVariable["type"] })
                }
              >
                <SelectTrigger size="sm" className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">string</SelectItem>
                  <SelectItem value="number">number</SelectItem>
                  <SelectItem value="integer">integer</SelectItem>
                  <SelectItem value="boolean">boolean</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive size-7 px-0"
                onClick={() => removeVar(idx)}
                aria-label="Remove variable"
              >
                <Trash2Icon className="size-3.5" />
              </Button>
              <Input
                value={v.description}
                onChange={(e) =>
                  updateVar(idx, { description: e.target.value })
                }
                placeholder="What this captures"
                className="col-span-3 h-7 text-xs"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool
// ---------------------------------------------------------------------------

type ToolOption = {
  vapiToolId: string;
  label: string;
  integrationId: string;
  integrationLabel: string;
  kind: NotionToolKind;
};

function ToolBody({
  node,
  onChange,
}: {
  node: WorkflowNode;
  onChange: (patch: Partial<WorkflowNode>) => void;
}) {
  const { byKind, ready } = useIntegrations();
  const notionIntegrations = React.useMemo(
    () => byKind("notion") as NotionIntegration[],
    [byKind],
  );

  const options = React.useMemo<ToolOption[]>(() => {
    const opts: ToolOption[] = [];
    for (const integration of notionIntegrations) {
      for (const tool of integration.vapiTools ?? []) {
        const label = `${integration.label} · ${NOTION_TOOL_LABELS[tool.kind].name}`;
        opts.push({
          vapiToolId: tool.id,
          label,
          integrationId: integration.id,
          integrationLabel: integration.label,
          kind: tool.kind,
        });
      }
    }
    return opts;
  }, [notionIntegrations]);

  const selected = node.toolRef?.vapiToolId ?? "";

  if (!ready) {
    return (
      <div className="text-muted-foreground text-xs">Loading integrations…</div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="border-border/40 grid gap-2 rounded-md border bg-background/40 p-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          <AlertCircleIcon className="text-amber-300 size-3.5" />
          No workflow tools registered yet
        </div>
        <p className="text-muted-foreground/90 text-[11px]">
          Tool nodes call tools you registered when configuring an integration.
          Connect a Notion database (or Resync an existing one) so its 5 tools
          appear here.
        </p>
        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
          <Link href="/integrations">
            <WrenchIcon className="size-3.5" />
            Open Integrations
          </Link>
        </Button>
      </div>
    );
  }

  const pick = (vapiToolId: string) => {
    const option = options.find((o) => o.vapiToolId === vapiToolId);
    if (!option) return;
    onChange({
      toolRef: {
        vapiToolId: option.vapiToolId,
        integrationId: option.integrationId,
        label: option.label,
      },
    });
  };

  return (
    <div className="grid gap-3">
      <Field
        label="Tool"
        hint="Pick a tool from your integrations. Re-syncing an integration refreshes this list."
      >
        <Select value={selected} onValueChange={pick}>
          <SelectTrigger size="sm" className="text-xs">
            <SelectValue placeholder="Choose a tool…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.vapiToolId} value={opt.vapiToolId}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {node.toolRef ? (
        <div className="border-border/40 grid gap-1 rounded-md border bg-background/40 p-2 text-[11px]">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">
              Workflow tool
            </Badge>
            <code className="font-mono text-[10px]">
              {node.toolRef.vapiToolId.slice(0, 12)}…
            </code>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transfer
// ---------------------------------------------------------------------------

function TransferBody({
  node,
  onChange,
}: {
  node: WorkflowNode;
  onChange: (patch: Partial<WorkflowNode>) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field
        label="Destination"
        hint="E.164 phone number or SIP URI."
      >
        <Input
          value={node.destination ?? ""}
          onChange={(e) => onChange({ destination: e.target.value })}
          placeholder="+14155550100"
          className="h-8 text-xs"
        />
      </Field>
      <Field
        label="Transfer message"
        hint="Optional: spoken before handing off."
      >
        <Textarea
          value={node.transferMessage ?? ""}
          onChange={(e) => onChange({ transferMessage: e.target.value })}
          placeholder="Transferring you to a specialist now."
          rows={2}
          className="resize-none text-xs"
        />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------------
// End call
// ---------------------------------------------------------------------------

function EndCallBody() {
  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        End node terminates the call when reached. If you want a closing line,
        put it in the conversation node that points to End — the End
        node does not speak on its own.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// API request
// ---------------------------------------------------------------------------

function ApiRequestBody({
  node,
  onChange,
}: {
  node: WorkflowNode;
  onChange: (patch: Partial<WorkflowNode>) => void;
}) {
  const cfg = node.apiRequest ?? { method: "GET" as const, url: "" };
  const patchCfg = (patch: Partial<typeof cfg>) =>
    onChange({ apiRequest: { ...cfg, ...patch } });

  const [headersText, setHeadersText] = React.useState(() =>
    stringifyKv(cfg.headers),
  );
  const [bodyText, setBodyText] = React.useState(() =>
    cfg.body ? JSON.stringify(cfg.body, null, 2) : "",
  );
  const [bodyError, setBodyError] = React.useState<string | null>(null);

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-2">
        <div className="grid gap-1">
          <Label className="text-xs">Method</Label>
          <Select
            value={cfg.method}
            onValueChange={(value) =>
              patchCfg({ method: value as "GET" | "POST" })
            }
          >
            <SelectTrigger size="sm" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Field label="URL" hint="HTTPS endpoint to call mid-conversation.">
          <Input
            value={cfg.url}
            onChange={(e) => patchCfg({ url: e.target.value })}
            placeholder="https://api.example.com/notify"
            className="h-8 text-xs"
          />
        </Field>
      </div>
      <Field
        label="Headers"
        hint="One per line: `Header-Name: value`. Optional."
      >
        <Textarea
          value={headersText}
          onChange={(e) => {
            setHeadersText(e.target.value);
            patchCfg({ headers: parseKv(e.target.value) });
          }}
          placeholder={"Authorization: Bearer ...\nX-Trace-Id: 1234"}
          rows={3}
          className="resize-none font-mono text-[11px]"
        />
      </Field>
      {cfg.method === "POST" ? (
        <Field label="Body (JSON)" hint="Optional JSON object sent as request body.">
          <Textarea
            value={bodyText}
            onChange={(e) => {
              setBodyText(e.target.value);
              if (e.target.value.trim().length === 0) {
                setBodyError(null);
                patchCfg({ body: undefined });
                return;
              }
              try {
                const parsed = JSON.parse(e.target.value) as Record<
                  string,
                  unknown
                >;
                if (parsed && typeof parsed === "object") {
                  setBodyError(null);
                  patchCfg({ body: parsed });
                } else {
                  setBodyError("Body must be a JSON object.");
                }
              } catch {
                setBodyError("Invalid JSON");
              }
            }}
            placeholder='{ "name": "{{ name }}" }'
            rows={4}
            className="resize-none font-mono text-[11px]"
          />
          {bodyError ? (
            <p className="text-destructive text-[10px]">{bodyError}</p>
          ) : null}
        </Field>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint ? (
        <p className="text-muted-foreground/80 text-[10px]">{hint}</p>
      ) : null}
    </div>
  );
}

function stringifyKv(record: Record<string, string> | undefined): string {
  if (!record) return "";
  return Object.entries(record)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

function parseKv(text: string): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const line of text.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key) out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

// ---------------------------------------------------------------------------
// Edge inspector
//
// Vapi edges carry a `condition` object: either AI text ("User wants to ...")
// or a liquid expression ("{{ intent == 'schedule' }}"). On compile we route
// the user's condition string to the right shape based on whether it contains
// `{{ ... }}`. The toggle in the UI mirrors that — picking "AI" wraps user
// input as `prompt` text; "Liquid" wraps it as a `liquid` expression.
// ---------------------------------------------------------------------------

type EdgeConditionMode = "none" | "ai" | "logic";

function inferEdgeMode(condition: string | undefined): EdgeConditionMode {
  if (condition === undefined) return "none";
  if (/\{\{[\s\S]*\}\}/.test(condition)) return "logic";
  return "ai";
}

export function WorkflowEdgeInspector({
  edge,
  fromNode,
  toNode,
  onChange,
  onDelete,
}: {
  edge: WorkflowEdge;
  fromNode: WorkflowNode | undefined;
  toNode: WorkflowNode | undefined;
  onChange: (patch: Partial<WorkflowEdge>) => void;
  onDelete: () => void;
}) {
  const mode = inferEdgeMode(edge.condition);
  const setMode = (next: EdgeConditionMode) => {
    if (next === "none") {
      onChange({ condition: undefined });
      return;
    }
    // Preserve the user's text when switching modes; just toggle the wrapping.
    if (next === "logic" && mode === "ai") {
      onChange({ condition: `{{ ${edge.condition?.trim() ?? ""} }}` });
      return;
    }
    if (next === "ai" && mode === "logic") {
      const stripped = (edge.condition ?? "")
        .trim()
        .replace(/^\{\{\s*/, "")
        .replace(/\s*\}\}$/, "");
      onChange({ condition: stripped });
      return;
    }
    if (next === "ai" && edge.condition === undefined) {
      const suggested = suggestEdgeConditionFromPrompt(fromNode?.systemPrompt);
      onChange({ condition: suggested ?? "" });
      return;
    }
    if (next === "logic" && edge.condition === undefined) {
      onChange({ condition: "{{  }}" });
      return;
    }
  };

  return (
    <div className="bg-card/30 grid h-full grid-rows-[auto_minmax(0,1fr)_auto] gap-3 rounded-xl border p-3">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
            Edge
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive size-7 px-0"
            onClick={onDelete}
            aria-label="Delete edge"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
        <div className="border-border/40 grid gap-1 rounded-md border bg-background/40 p-2 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">from</span>
            <span className="truncate font-medium">
              {fromNode?.label?.trim() || fromNode?.id || edge.from}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CornerDownRightIcon className="text-muted-foreground/70 size-3" />
            <span className="text-muted-foreground">to</span>
            <span className="truncate font-medium">
              {toNode?.label?.trim() || toNode?.id || edge.to}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 overflow-y-auto pr-1">
        <div className="grid gap-2">
          <Label className="text-xs">Condition</Label>
          <div className="bg-muted/40 grid grid-cols-3 gap-0.5 rounded-md p-0.5">
            <ModeChip label="None" active={mode === "none"} onClick={() => setMode("none")} />
            <ModeChip label="AI" active={mode === "ai"} onClick={() => setMode("ai")} />
            <ModeChip label="Liquid" active={mode === "logic"} onClick={() => setMode("logic")} />
          </div>
          {mode === "none" ? (
            <p className="text-muted-foreground/80 text-[10px]">
              Edge fires automatically when the previous node completes.
            </p>
          ) : mode === "ai" ? (
            <>
              <Textarea
                value={edge.condition ?? ""}
                onChange={(e) => onChange({ condition: e.target.value })}
                placeholder="User wants to speak to a human"
                rows={3}
                className="resize-none text-xs"
              />
              <p className="text-muted-foreground/80 text-[10px]">
                Natural-language guidance. The LLM picks this edge when the
                description matches the user&apos;s intent. Your text appears
                on the connector (e.g. &quot;user said yes&quot;).
              </p>
            </>
          ) : (
            <>
              <Textarea
                value={edge.condition ?? ""}
                onChange={(e) => onChange({ condition: e.target.value })}
                placeholder="{{ intent == 'schedule' }}"
                rows={3}
                className="resize-none font-mono text-[11px]"
              />
              <p className="text-muted-foreground/80 text-[10px]">
                Liquid expression evaluated against extracted variables. Wrap
                with <code className="font-mono">{"{{ ... }}"}</code>.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="text-muted-foreground border-t pt-2 text-[10px]">
        Edge id: <code className="font-mono">{edge.id}</code>
      </div>
    </div>
  );
}

function ModeChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-sm px-2 py-1 text-[11px] font-medium transition",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
