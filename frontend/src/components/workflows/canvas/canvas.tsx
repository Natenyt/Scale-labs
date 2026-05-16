"use client";

import * as React from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import {
  WorkflowEdgeInspector,
  WorkflowInspector,
} from "@/components/workflows/canvas/inspector";
import {
  PALETTE_DRAG_MIME,
  WorkflowPalette,
} from "@/components/workflows/canvas/palette";
import {
  WorkflowNodeCard,
  type WorkflowNodeData,
} from "@/components/workflows/canvas/node-card";
import { newEdgeId, newNodeId } from "@/lib/workflows/store";
import {
  DEFAULT_NODE_POSITION,
  WORKFLOW_NODE_LABELS,
  type Workflow,
  type WorkflowEdge,
  type WorkflowNode,
  type WorkflowNodeKind,
} from "@/lib/workflows/types";

type Selection =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string }
  | null;

/**
 * High-level canvas: palette + React Flow + inspector. State is mirrored
 * to the workflows store via the `onChange` prop. Internal canvas state is
 * keyed off `workflow.id` from the parent — re-keying the component is the
 * React-19 way to "reset internal state" when the route changes.
 */
export function WorkflowCanvas({
  workflow,
  onChange,
  onGlobalPromptChange,
}: {
  workflow: Workflow;
  onChange: (next: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => void;
  onGlobalPromptChange?: (next: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <CanvasInner
        workflow={workflow}
        onChange={onChange}
        onGlobalPromptChange={onGlobalPromptChange}
      />
    </ReactFlowProvider>
  );
}

const NODE_TYPES = { workflow: WorkflowNodeCard } as const;

function CanvasInner({
  workflow,
  onChange,
  onGlobalPromptChange,
}: {
  workflow: Workflow;
  onChange: (next: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => void;
  onGlobalPromptChange?: (next: string) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();

  // Local mirrors of the React Flow shape. We translate between these and the
  // canonical `WorkflowNode[]/WorkflowEdge[]` on the store at every change.
  const [rfNodes, setRfNodes] = React.useState<Node[]>(() =>
    toReactFlowNodes(workflow.nodes),
  );
  const [rfEdges, setRfEdges] = React.useState<Edge[]>(() =>
    toReactFlowEdges(workflow.edges),
  );
  const [selection, setSelection] = React.useState<Selection>(() =>
    workflow.nodes[0] ? { kind: "node", id: workflow.nodes[0].id } : null,
  );

  // ------- Change handlers -------
  //
  // We never call `onChange` (or anything else that mutates external state)
  // *inside* a React state updater. Doing so calls `replaceGraph()`, which
  // calls the store's `notify()` synchronously, which triggers every
  // `useSyncExternalStore` subscriber (PageBreadcrumb included) while we are
  // still in React's render/commit phase — producing the
  // "Cannot update a component while rendering a different component" warning.
  //
  // Instead: compute the next array eagerly (inputs come straight from the
  // event), set state in the usual way, and *then* push the change to the
  // store as a normal side effect.

  const pushUp = React.useCallback(
    (nodes: Node[], edges: Edge[]) => {
      onChange({
        nodes: fromReactFlowNodes(nodes),
        edges: fromReactFlowEdges(edges),
      });
    },
    [onChange],
  );

  const onNodesChange: OnNodesChange = React.useCallback(
    (changes: NodeChange[]) => {
      const next = applyNodeChanges(changes, rfNodes);
      setRfNodes(next);
      pushUp(next, rfEdges);
    },
    [pushUp, rfNodes, rfEdges],
  );

  const onEdgesChange: OnEdgesChange = React.useCallback(
    (changes: EdgeChange[]) => {
      const next = applyEdgeChanges(changes, rfEdges);
      setRfEdges(next);
      pushUp(rfNodes, next);
    },
    [pushUp, rfNodes, rfEdges],
  );

  const onConnect: OnConnect = React.useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      // Bail on self-loops and exact duplicates.
      if (connection.source === connection.target) return;
      const dup = rfEdges.some(
        (e) =>
          e.source === connection.source && e.target === connection.target,
      );
      if (dup) return;
      const id = newEdgeId();
      const styled = toReactFlowEdge({
        id,
        from: connection.source,
        to: connection.target,
      });
      const next = [...rfEdges, styled];
      setRfEdges(next);
      setSelection({ kind: "edge", id });
      pushUp(rfNodes, next);
    },
    [pushUp, rfNodes, rfEdges],
  );

  // ------- Drag-and-drop from palette -------

  const onDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const addNode = React.useCallback(
    (
      kind: Exclude<WorkflowNodeKind, "start">,
      position?: { x: number; y: number },
    ) => {
      const id = newNodeId();
      const node: WorkflowNode = {
        id,
        kind,
        position:
          position ??
          // Tile around the default so multiple clicks don't overlap exactly.
          {
            x: DEFAULT_NODE_POSITION.x + Math.random() * 80,
            y: DEFAULT_NODE_POSITION.y + Math.random() * 80,
          },
        label: WORKFLOW_NODE_LABELS[kind].name,
      };
      const rfNode = toReactFlowNode(node);
      const next = [...rfNodes, rfNode];
      setRfNodes(next);
      setSelection({ kind: "node", id });
      pushUp(next, rfEdges);
    },
    [pushUp, rfNodes, rfEdges],
  );

  const onDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const kind = e.dataTransfer.getData(
        PALETTE_DRAG_MIME,
      ) as WorkflowNodeKind | "";
      if (!kind || kind === "start") return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(kind, position);
    },
    [addNode, screenToFlowPosition],
  );

  // ------- Inspector wiring -------

  const selectedNode = React.useMemo<WorkflowNode | null>(() => {
    if (selection?.kind !== "node") return null;
    const found = rfNodes.find((n) => n.id === selection.id);
    return found ? (found.data as WorkflowNodeData).node : null;
  }, [rfNodes, selection]);

  const selectedEdge = React.useMemo<WorkflowEdge | null>(() => {
    if (selection?.kind !== "edge") return null;
    const found = rfEdges.find((e) => e.id === selection.id);
    if (!found) return null;
    return {
      id: found.id,
      from: found.source,
      to: found.target,
      condition: typeof found.label === "string" ? found.label : undefined,
    };
  }, [rfEdges, selection]);

  const onPatchSelectedNode = React.useCallback(
    (patch: Partial<WorkflowNode>) => {
      if (selection?.kind !== "node") return;
      const id = selection.id;
      const next = rfNodes.map((n) => {
        if (n.id !== id) return n;
        const node = (n.data as WorkflowNodeData).node;
        return {
          ...n,
          data: { node: { ...node, ...patch } } satisfies WorkflowNodeData,
        };
      });
      setRfNodes(next);
      pushUp(next, rfEdges);
    },
    [pushUp, rfNodes, rfEdges, selection],
  );

  const onPatchSelectedEdge = React.useCallback(
    (patch: Partial<WorkflowEdge>) => {
      if (selection?.kind !== "edge") return;
      const id = selection.id;
      const next = rfEdges.map((edge) => {
        if (edge.id !== id) return edge;
        const prevCondition =
          typeof (edge.data as { condition?: string } | undefined)
            ?.condition === "string"
            ? (edge.data as { condition?: string }).condition
            : typeof edge.label === "string"
              ? edge.label
              : undefined;
        const condition =
          "condition" in patch ? patch.condition : prevCondition;
        // Rebuild the edge through `toReactFlowEdge` so labelStyle/strokes
        // re-derive from the new condition (AI vs Liquid tone).
        return toReactFlowEdge({
          id: edge.id,
          from: edge.source,
          to: edge.target,
          condition: condition ?? undefined,
        });
      });
      setRfEdges(next);
      pushUp(rfNodes, next);
    },
    [pushUp, rfNodes, rfEdges, selection],
  );

  const onDeleteSelectedNode = React.useCallback(() => {
    if (selection?.kind !== "node") return;
    const id = selection.id;
    if (id === "start") return;
    const nextNodes = rfNodes.filter((n) => n.id !== id);
    // Also strip any edges that referenced the removed node.
    const nextEdges = rfEdges.filter(
      (e) => e.source !== id && e.target !== id,
    );
    setRfNodes(nextNodes);
    setRfEdges(nextEdges);
    setSelection(null);
    pushUp(nextNodes, nextEdges);
  }, [pushUp, rfNodes, rfEdges, selection]);

  const onDeleteSelectedEdge = React.useCallback(() => {
    if (selection?.kind !== "edge") return;
    const id = selection.id;
    const next = rfEdges.filter((e) => e.id !== id);
    setRfEdges(next);
    setSelection(null);
    pushUp(rfNodes, next);
  }, [pushUp, rfNodes, rfEdges, selection]);

  const onSelectionChange = React.useCallback(
    ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
      // Node selection wins when both are selected (e.g. via marquee).
      if (nodes[0]) {
        setSelection({ kind: "node", id: nodes[0].id });
        return;
      }
      if (edges[0]) {
        setSelection({ kind: "edge", id: edges[0].id });
        return;
      }
      setSelection(null);
    },
    [],
  );

  // Look up endpoints for the edge inspector header.
  const fromNode = React.useMemo(() => {
    if (selection?.kind !== "edge") return undefined;
    const edge = rfEdges.find((e) => e.id === selection.id);
    if (!edge) return undefined;
    const rf = rfNodes.find((n) => n.id === edge.source);
    return rf ? (rf.data as WorkflowNodeData).node : undefined;
  }, [rfEdges, rfNodes, selection]);
  const toNode = React.useMemo(() => {
    if (selection?.kind !== "edge") return undefined;
    const edge = rfEdges.find((e) => e.id === selection.id);
    if (!edge) return undefined;
    const rf = rfNodes.find((n) => n.id === edge.target);
    return rf ? (rf.data as WorkflowNodeData).node : undefined;
  }, [rfEdges, rfNodes, selection]);

  return (
    <div className="grid h-full min-h-[560px] grid-cols-[220px_minmax(0,1fr)_320px] gap-3">
      <WorkflowPalette onAdd={addNode} />
      <div
        className="bg-card/30 relative h-full overflow-hidden rounded-xl border"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={["Backspace", "Delete"]}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls position="bottom-right" showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            className="!bg-card/80 !border-border/60 rounded-md !border"
          />
        </ReactFlow>
      </div>
      {selectedEdge ? (
        <WorkflowEdgeInspector
          edge={selectedEdge}
          fromNode={fromNode}
          toNode={toNode}
          onChange={onPatchSelectedEdge}
          onDelete={onDeleteSelectedEdge}
        />
      ) : (
        <WorkflowInspector
          node={selectedNode}
          workflowSettings={
            onGlobalPromptChange
              ? {
                  globalPrompt: workflow.globalPrompt ?? "",
                  onGlobalPromptChange,
                }
              : undefined
          }
          onChange={onPatchSelectedNode}
          onDelete={onDeleteSelectedNode}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// React Flow <-> domain mappers
// ---------------------------------------------------------------------------

function toReactFlowNode(node: WorkflowNode): Node {
  return {
    id: node.id,
    type: "workflow",
    position: node.position,
    data: { node } satisfies WorkflowNodeData,
    draggable: true,
    deletable: node.kind !== "start",
  };
}

function toReactFlowNodes(nodes: WorkflowNode[]): Node[] {
  return nodes.map(toReactFlowNode);
}

function fromReactFlowNodes(nodes: Node[]): WorkflowNode[] {
  return nodes.map((n) => {
    const domain = (n.data as WorkflowNodeData).node;
    return {
      ...domain,
      position: { x: n.position.x, y: n.position.y },
    };
  });
}

function toReactFlowEdges(edges: WorkflowEdge[]): Edge[] {
  return edges.map((e) => toReactFlowEdge(e));
}

function toReactFlowEdge(e: WorkflowEdge): Edge {
  const condition = (e.condition ?? "").trim();
  const isLogic = /\{\{[\s\S]*\}\}/.test(condition);
  const label = condition ? truncateForEdge(condition) : undefined;
  return {
    id: e.id,
    source: e.from,
    target: e.to,
    label,
    labelStyle: {
      fill: isLogic ? "#d8b4fe" : "#fef3c7",
      fontSize: 11,
      fontWeight: 500,
      fontFamily: isLogic
        ? "var(--font-mono, monospace)"
        : "var(--font-sans, sans-serif)",
    },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 4,
    labelBgStyle: {
      fill: isLogic ? "rgba(88, 28, 135, 0.85)" : "rgba(120, 53, 15, 0.85)",
      stroke: isLogic
        ? "rgba(168, 85, 247, 0.6)"
        : "rgba(251, 191, 36, 0.6)",
      strokeWidth: 1,
    },
    type: "default",
    animated: false,
    data: { condition: e.condition ?? "" },
    style: {
      stroke: condition
        ? isLogic
          ? "rgba(192, 132, 252, 0.7)"
          : "rgba(251, 191, 36, 0.7)"
        : "var(--color-muted-foreground)",
      strokeWidth: 1.5,
    },
  };
}

function truncateForEdge(text: string): string {
  const single = text.replace(/\s+/g, " ").trim();
  return single.length > 40 ? `${single.slice(0, 37)}…` : single;
}

function fromReactFlowEdges(edges: Edge[]): WorkflowEdge[] {
  return edges.map((e) => ({
    id: e.id,
    from: e.source,
    to: e.target,
    condition:
      typeof (e.data as { condition?: string } | undefined)?.condition ===
      "string"
        ? ((e.data as { condition?: string }).condition?.trim() ?? "") ||
          undefined
        : typeof e.label === "string"
          ? e.label
          : undefined,
  }));
}
