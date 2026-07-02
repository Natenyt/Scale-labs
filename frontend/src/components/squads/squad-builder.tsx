"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeftIcon,
  BotIcon,
  FlagIcon,
  Loader2Icon,
  PhoneIcon,
  PhoneOffIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgentsState } from "@/components/agents/agents-store";
import { LANGUAGE_LABELS, type Language } from "@/lib/agents/types";
import { useVoiceSession } from "@/lib/agents/use-voice-session";
import { useInvalidateSquads } from "@/lib/query/use-squads-query";
import { createSquad, deleteSquad, updateSquad } from "@/lib/squads/squads-api";
import type { SquadGraph, SquadRow } from "@/lib/squads/types";
import { cn } from "@/lib/utils";

type MemberData = {
  agentId: string;
  agentName: string;
  language: Language;
  isStart: boolean;
};

type MemberNode = Node<MemberData, "member">;
type HandoffEdge = Edge<{ condition?: string }>;

/** Squad member node — follows the workflow canvas card language. */
function MemberNodeCard({ data, selected }: NodeProps<MemberNode>) {
  const isStart = data.isStart;
  return (
    <div
      className={cn(
        "group w-[240px] rounded-xl border bg-gradient-to-br p-3 shadow-sm ring-1 ring-inset transition",
        isStart
          ? "from-emerald-500/15 to-emerald-500/5 ring-emerald-500/25"
          : "from-sky-500/15 to-sky-500/5 ring-sky-500/25",
        selected
          ? "border-foreground/40 shadow-lg ring-2 ring-white/50"
          : "border-border/60 hover:border-foreground/30",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !border-2 !border-background !bg-foreground/60"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2 !border-2 !border-background !bg-foreground/60"
      />
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "ring-foreground/10 mt-0.5 flex size-7 items-center justify-center rounded-lg bg-background/50 ring-1",
            isStart ? "text-emerald-300" : "text-sky-300",
          )}
        >
          <BotIcon className="size-4" />
        </div>
        <div className="min-w-0 grow">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{data.agentName}</span>
            {isStart ? (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-background/40 h-4 gap-1 px-1 text-[9px] font-medium uppercase tracking-wider text-emerald-300"
              >
                <FlagIcon className="size-2.5" />
                Start
              </Badge>
            ) : null}
          </div>
          <div className="text-muted-foreground/80 mt-0.5 text-[10px] uppercase tracking-wider">
            Agent · {LANGUAGE_LABELS[data.language]?.label ?? data.language}
          </div>
        </div>
      </div>
      <p className="text-muted-foreground/90 mt-2 text-xs">
        {isStart ? "Answers the call." : "Joins on handoff."}
      </p>
    </div>
  );
}

const nodeTypes = { member: MemberNodeCard };

let seq = 1;
const nextId = () => `m${seq++}_${Date.now().toString(36)}`;

function toFlow(graph: SquadGraph, agentLanguage: (id: string) => Language) {
  const nodes: MemberNode[] = (graph.nodes ?? []).map((n) => ({
    id: n.id,
    type: "member",
    position: n.position ?? { x: 0, y: 0 },
    data: {
      agentId: n.agentId,
      agentName: n.agentName ?? n.agentId,
      language: agentLanguage(n.agentId),
      isStart: Boolean(n.isStart),
    },
  }));
  const edges: HandoffEdge[] = (graph.edges ?? []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: true,
    data: { condition: e.condition ?? "" },
  }));
  return { nodes, edges };
}

type Props = {
  mode: "new" | "edit";
  squad?: SquadRow;
};

function SquadBuilderInner({ mode, squad }: Props) {
  const router = useRouter();
  const { agents } = useAgentsState();
  const { invalidateAll, invalidateDetail } = useInvalidateSquads();

  const agentLanguage = React.useCallback(
    (id: string): Language =>
      (agents.find((a) => a.id === id)?.language ?? "en") as Language,
    [agents],
  );

  const initial = React.useMemo(
    () => toFlow(squad?.graph ?? { nodes: [], edges: [] }, agentLanguage),
    // Rehydrate once per squad row; agent names come from the saved snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [squad?.id],
  );

  const [name, setName] = React.useState(squad?.name ?? "");
  const [nodes, setNodes, onNodesChange] = useNodesState<MemberNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<HandoffEdge>(initial.edges);
  const [selNode, setSelNode] = React.useState<string | null>(null);
  const [selEdge, setSelEdge] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [dirty, setDirty] = React.useState(mode === "new");
  const [testOpen, setTestOpen] = React.useState(false);
  const [transcript, setTranscript] = React.useState<
    { role: string; text: string }[]
  >([]);

  const voice = useVoiceSession(squad?.id, {
    enabled: mode === "edit" && testOpen,
  });

  React.useEffect(() => {
    voice.onVapiMessage((msg: unknown) => {
      const m = msg as {
        type?: string;
        transcriptType?: string;
        role?: string;
        transcript?: string;
      };
      if (m?.type === "transcript" && m.transcriptType === "final" && m.transcript) {
        setTranscript((t) => [
          ...t.slice(-60),
          { role: m.role ?? "user", text: m.transcript! },
        ]);
      }
    });
  }, [voice]);

  const onConnect = React.useCallback(
    (c: Connection) => {
      setEdges((eds) =>
        addEdge<HandoffEdge>(
          { ...c, animated: true, data: { condition: "" } },
          eds,
        ),
      );
      setDirty(true);
    },
    [setEdges],
  );

  const usedAgentIds = new Set(nodes.map((n) => n.data.agentId));
  const addableAgents = agents.filter(
    (a) => a.vapiAssistantId && !usedAgentIds.has(a.id),
  );

  function addAgent(agentId: string) {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;
    const isFirst = nodes.length === 0;
    setNodes((ns) => [
      ...ns,
      {
        id: nextId(),
        type: "member",
        position: { x: 80 + ns.length * 300, y: 140 },
        data: {
          agentId: agent.id,
          agentName: agent.name,
          language: agent.language,
          isStart: isFirst,
        },
      },
    ]);
    setDirty(true);
  }

  function setStart(nodeId: string) {
    setNodes((ns) =>
      ns.map((n) => ({ ...n, data: { ...n.data, isStart: n.id === nodeId } })),
    );
    setDirty(true);
  }

  function removeNode(nodeId: string) {
    setNodes((ns) => ns.filter((n) => n.id !== nodeId));
    setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelNode(null);
    setDirty(true);
  }

  function setCondition(edgeId: string, condition: string) {
    setEdges((es) =>
      es.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, condition } } : e)),
    );
    setDirty(true);
  }

  function removeEdge(edgeId: string) {
    setEdges((es) => es.filter((e) => e.id !== edgeId));
    setSelEdge(null);
    setDirty(true);
  }

  function currentGraph(): SquadGraph {
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        agentId: n.data.agentId,
        position: n.position,
        isStart: n.data.isStart,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        condition: e.data?.condition ?? "",
      })),
    };
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Name your squad first.");
      return;
    }
    if (nodes.length < 2) {
      toast.error("Add at least two agents to the canvas.");
      return;
    }
    if (edges.length < 1) {
      toast.error("Connect the agents so at least one handoff exists.");
      return;
    }
    setSaving(true);
    try {
      if (mode === "new") {
        const row = await createSquad({ name: name.trim(), graph: currentGraph() });
        toast.success("Squad created");
        void invalidateAll();
        router.replace(`/squads/${row.id}`);
      } else if (squad) {
        await updateSquad(squad.id, { name: name.trim(), graph: currentGraph() });
        toast.success("Squad saved");
        setDirty(false);
        void invalidateAll();
        void invalidateDetail(squad.id);
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save squad");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!squad) return;
    if (!window.confirm(`Delete squad “${squad.name}”? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      await deleteSquad(squad.id);
      toast.success("Squad deleted");
      void invalidateAll();
      router.replace("/squads");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete squad");
      setDeleting(false);
    }
  }

  async function toggleTest() {
    if (voice.active) {
      await voice.stopCall();
      return;
    }
    setTranscript([]);
    setTestOpen(true);
    const err = await voice.startCall();
    if (err) toast.error(err);
  }

  const selectedNode = nodes.find((n) => n.id === selNode) ?? null;
  const selectedEdge = edges.find((e) => e.id === selEdge) ?? null;
  const showPanel = Boolean(selectedNode || selectedEdge || testOpen);

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[640px] flex-col overflow-hidden pt-2">
      {/* top bar */}
      <div className="border-border/40 flex items-center gap-3 border-b px-4 py-2.5">
        <Link
          href="/squads"
          className="text-muted-foreground hover:text-foreground transition"
          aria-label="Back to squads"
        >
          <ArrowLeftIcon className="size-4" />
        </Link>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
          placeholder="Squad name"
          className="h-8 w-64 font-medium"
        />
        <div className="ml-auto flex items-center gap-2">
          {mode === "edit" && squad ? (
            <>
              <Button
                variant={voice.active ? "destructive" : "outline"}
                size="sm"
                onClick={toggleTest}
                disabled={voice.busy}
                className="gap-1.5"
              >
                {voice.busy ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : voice.active ? (
                  <PhoneOffIcon className="size-4" />
                ) : (
                  <PhoneIcon className="size-4" />
                )}
                {voice.active ? "End call" : "Test call"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={deleting}
                className="text-destructive hover:text-destructive gap-1.5"
              >
                {deleting ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <Trash2Icon className="size-4" />
                )}
                Delete
              </Button>
            </>
          ) : null}
          <Button
            size="sm"
            onClick={save}
            disabled={saving || (mode === "edit" && !dirty)}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SaveIcon className="size-4" />
            )}
            {mode === "new" ? "Create squad" : dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {/* add agent */}
          <div className="absolute left-4 top-4 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <PlusIcon className="size-4" /> Add agent
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {addableAgents.length === 0 ? (
                  <div className="text-muted-foreground px-3 py-2 text-xs">
                    {agents.length === 0
                      ? "No agents yet — create one under Agents."
                      : "All synced agents are already on the canvas."}
                  </div>
                ) : (
                  addableAgents.map((a) => (
                    <DropdownMenuItem key={a.id} onSelect={() => addAgent(a.id)}>
                      <BotIcon className="text-sky-300 size-4" />
                      <span className="min-w-0 flex-1 truncate">{a.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {LANGUAGE_LABELS[a.language]?.label ?? a.language}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={(c) => {
              onNodesChange(c);
              if (c.some((x) => x.type === "position" || x.type === "remove")) {
                setDirty(true);
              }
            }}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, n) => {
              setSelNode(n.id);
              setSelEdge(null);
            }}
            onEdgeClick={(_, e) => {
              setSelEdge(e.id);
              setSelNode(null);
            }}
            onPaneClick={() => {
              setSelNode(null);
              setSelEdge(null);
            }}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="!bg-card" />
          </ReactFlow>
        </div>

        {/* inspector / test panel */}
        {showPanel ? (
          <aside className="border-border/40 bg-card/40 w-80 shrink-0 overflow-auto border-l p-4">
            {testOpen ? (
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Test call</div>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={async () => {
                      await voice.stopCall();
                      setTestOpen(false);
                    }}
                    aria-label="Close test panel"
                  >
                    <XIcon className="size-4" />
                  </button>
                </div>
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      voice.active
                        ? "animate-pulse bg-emerald-400"
                        : voice.busy
                          ? "animate-pulse bg-amber-400"
                          : "bg-muted-foreground/50",
                    )}
                  />
                  {voice.active
                    ? "Live — speak to the squad"
                    : voice.busy
                      ? "Connecting…"
                      : voice.errorMessage || "Ready"}
                </div>
                <div className="border-border/60 bg-background/60 h-72 overflow-auto rounded-lg border p-3 text-xs leading-relaxed">
                  {transcript.length === 0 ? (
                    <p className="text-muted-foreground">
                      Start the call and speak — the transcript appears here. Watch
                      the handoff switch agents mid-call.
                    </p>
                  ) : (
                    <div className="grid gap-1.5">
                      {transcript.map((l, i) => (
                        <div key={i} className="flex gap-2">
                          <span
                            className={cn(
                              "w-10 shrink-0 text-[10px] font-semibold uppercase tracking-wider",
                              l.role === "assistant"
                                ? "text-sky-300"
                                : "text-muted-foreground",
                            )}
                          >
                            {l.role === "assistant" ? "Agent" : "You"}
                          </span>
                          <span className="text-foreground/90">{l.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : selectedNode ? (
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {selectedNode.data.agentName}
                    </div>
                    <div className="text-muted-foreground/80 text-[10px] uppercase tracking-wider">
                      Squad member ·{" "}
                      {LANGUAGE_LABELS[selectedNode.data.language]?.label}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setSelNode(null)}
                    aria-label="Close inspector"
                  >
                    <XIcon className="size-4" />
                  </button>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <Link href={`/agents/${selectedNode.data.agentId}`}>
                    Edit agent settings
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2"
                  disabled={selectedNode.data.isStart}
                  onClick={() => setStart(selectedNode.id)}
                >
                  <FlagIcon className="size-4" />
                  {selectedNode.data.isStart
                    ? "Answers the call"
                    : "Set as call start"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive justify-start gap-2"
                  onClick={() => removeNode(selectedNode.id)}
                >
                  <Trash2Icon className="size-4" /> Remove from squad
                </Button>
              </div>
            ) : selectedEdge ? (
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Handoff</div>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setSelEdge(null)}
                    aria-label="Close inspector"
                  >
                    <XIcon className="size-4" />
                  </button>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="handoff-condition">Hand off when…</Label>
                  <Textarea
                    id="handoff-condition"
                    rows={4}
                    value={selectedEdge.data?.condition ?? ""}
                    onChange={(e) => setCondition(selectedEdge.id, e.target.value)}
                    placeholder="e.g. The caller wants to book an appointment."
                  />
                  <p className="text-muted-foreground text-xs">
                    The current agent hands the call to the connected agent when
                    this is true.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive justify-start gap-2"
                  onClick={() => removeEdge(selectedEdge.id)}
                >
                  <Trash2Icon className="size-4" /> Remove handoff
                </Button>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export function SquadBuilder(props: Props) {
  return (
    <ReactFlowProvider>
      <SquadBuilderInner {...props} />
    </ReactFlowProvider>
  );
}
