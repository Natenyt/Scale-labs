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
import { WorkflowConditionEdge } from "@/components/workflows/canvas/condition-edge";
import {
  MINIMAP_VIEWPORT_STROKE,
  createMinimapNodeColor,
  minimapNodeStrokeColor,
  WorkflowNodeCard,
  type WorkflowNodeData,
} from "@/components/workflows/canvas/node-card";
import type { WorkflowEdgeData } from "@/components/workflows/canvas/condition-edge";
import { newEdgeId, newNodeId } from "@/lib/workflows/store";
import { suggestEdgeConditionFromPrompt } from "@/lib/workflows/suggest-edge-condition";
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
  runtimeActiveNodeId = null,
  hideInspector = false,
}: {
  workflow: Workflow;
  onChange: (next: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => void;
  onGlobalPromptChange?: (next: string) => void;
  runtimeActiveNodeId?: string | null;
  hideInspector?: boolean;
}) {
  return (
    <ReactFlowProvider>
      <CanvasInner
        workflow={workflow}
        onChange={onChange}
        onGlobalPromptChange={onGlobalPromptChange}
        runtimeActiveNodeId={runtimeActiveNodeId}
        hideInspector={hideInspector}
      />
    </ReactFlowProvider>
  );
}

const NODE_TYPES = { workflow: WorkflowNodeCard } as const;
const EDGE_TYPES = { workflowCondition: WorkflowConditionEdge } as const;
const DEFAULT_EDGE_OPTIONS = { type: "workflowCondition" as const };

const CANVAS_MIN_ZOOM = 0.08;
const CANVAS_MAX_ZOOM = 1.5;
const CANVAS_FIT_PADDING = 0.4;
const NODE_CARD_HALF_W = 120;
const NODE_CARD_HALF_H = 60;
/** Zoom level when framing a single runtime-active node (call start / node change). */
const RUNTIME_FOLLOW_ZOOM = 0.9;
const RUNTIME_FOLLOW_MIN_ZOOM = 0.55;

/** Pan and zoom the viewport to the active workflow node during a test call. */
function FollowRuntimeActiveNode({ nodeId }: { nodeId: string | null }) {
  const { getNode, setCenter, fitView } = useReactFlow();
  const prevIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!nodeId) {
      prevIdRef.current = null;
      return;
    }
    if (nodeId === prevIdRef.current) return;

    let cancelled = false;
    const timers: number[] = [];

    const attempt = () => {
      if (cancelled) return;
      const node = getNode(nodeId);
      if (!node) return;

      prevIdRef.current = nodeId;
      void fitView({
        nodes: [node],
        padding: 0.45,
        minZoom: RUNTIME_FOLLOW_MIN_ZOOM,
        maxZoom: 1,
        duration: 650,
      }).catch(() => {
        const cx = node.position.x + NODE_CARD_HALF_W;
        const cy = node.position.y + NODE_CARD_HALF_H;
        void setCenter(cx, cy, { zoom: RUNTIME_FOLLOW_ZOOM, duration: 650 });
      });
    };

    attempt();
    timers.push(window.setTimeout(attempt, 0));
    timers.push(window.setTimeout(attempt, 50));
    timers.push(window.setTimeout(attempt, 150));

    return () => {
      cancelled = true;
      for (const t of timers) window.clearTimeout(t);
    };
  }, [fitView, getNode, nodeId, setCenter]);

  return null;
}

/** Re-fit when a workflow loads (large templates need a wider zoom-out). */
function FitViewOnWorkflowLoad({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void fitView({
        padding: CANVAS_FIT_PADDING,
        minZoom: CANVAS_MIN_ZOOM,
        maxZoom: 1,
        duration: 280,
      });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [nodeCount, fitView]);
  return null;
}

function CanvasInner({
  workflow,
  onChange,
  onGlobalPromptChange,
  runtimeActiveNodeId,
  hideInspector,
}: {
  workflow: Workflow;
  onChange: (next: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => void;
  onGlobalPromptChange?: (next: string) => void;
  runtimeActiveNodeId: string | null;
  hideInspector: boolean;
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
  const [selection, setSelection] = React.useState<Selection>(null);
  /** Ignore one empty RF deselect after we replace edge objects while typing. */
  const skipNextDeselectRef = React.useRef(false);

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
      const sourceRf = rfNodes.find((n) => n.id === connection.source);
      const sourceNode = sourceRf
        ? (sourceRf.data as WorkflowNodeData).node
        : undefined;
      const branchIndex = rfEdges.filter(
        (e) => e.source === connection.source,
      ).length;
      const suggested = suggestEdgeConditionFromPrompt(
        sourceNode?.systemPrompt,
        { branchIndex },
      );
      const styled = toReactFlowEdge({
        id,
        from: connection.source,
        to: connection.target,
        condition: suggested,
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
      condition: readEdgeCondition(found),
    };
  }, [rfEdges, selection]);

  const onPatchSelectedNode = React.useCallback(
    (patch: Partial<WorkflowNode>) => {
      if (selection?.kind !== "node") return;
      const id = selection.id;
      const prevRf = rfNodes.find((n) => n.id === id);
      const prevPrompt = prevRf
        ? (prevRf.data as WorkflowNodeData).node.systemPrompt
        : undefined;

      const nextNodes = rfNodes.map((n) => {
        if (n.id !== id) return n;
        const node = (n.data as WorkflowNodeData).node;
        return {
          ...n,
          data: { node: { ...node, ...patch } } satisfies WorkflowNodeData,
        };
      });

      const merged = nextNodes.find((n) => n.id === id);
      const nextPrompt = merged
        ? (merged.data as WorkflowNodeData).node.systemPrompt
        : undefined;

      const nextEdges =
        "systemPrompt" in patch
          ? syncOutgoingEdgeConditions(rfEdges, id, prevPrompt, nextPrompt)
          : rfEdges;

      setRfNodes(nextNodes);
      setRfEdges(nextEdges);
      pushUp(nextNodes, nextEdges);
    },
    [pushUp, rfNodes, rfEdges, selection],
  );

  const onPatchSelectedEdge = React.useCallback(
    (patch: Partial<WorkflowEdge>) => {
      if (selection?.kind !== "edge") return;
      const id = selection.id;
      skipNextDeselectRef.current = true;
      const nextEdges = rfEdges.map((edge) => {
        const isTarget = edge.id === id;
        if (!isTarget) {
          return { ...edge, selected: false };
        }
        const prevCondition = readEdgeCondition(edge);
        const condition =
          "condition" in patch ? patch.condition : prevCondition;
        return {
          ...toReactFlowEdge({
            id: edge.id,
            from: edge.source,
            to: edge.target,
            condition: condition ?? undefined,
          }),
          selected: true,
        };
      });
      const nextNodes = rfNodes.map((n) => ({ ...n, selected: false }));
      setRfNodes(nextNodes);
      setRfEdges(nextEdges);
      pushUp(nextNodes, nextEdges);
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
      if (nodes[0]) {
        skipNextDeselectRef.current = false;
        setSelection({ kind: "node", id: nodes[0].id });
        return;
      }
      if (edges[0]) {
        skipNextDeselectRef.current = false;
        setSelection({ kind: "edge", id: edges[0].id });
        return;
      }
      if (skipNextDeselectRef.current) {
        skipNextDeselectRef.current = false;
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

  const nodesForFlow = React.useMemo(
    () => applyRuntimeNodeHighlight(rfNodes, runtimeActiveNodeId),
    [rfNodes, runtimeActiveNodeId],
  );

  const edgesForFlow = React.useMemo(
    () => applyRuntimeEdgeHighlight(rfEdges, runtimeActiveNodeId),
    [rfEdges, runtimeActiveNodeId],
  );

  const minimapColor = React.useMemo(
    () => createMinimapNodeColor(runtimeActiveNodeId),
    [runtimeActiveNodeId],
  );

  const gridClass = hideInspector
    ? "grid h-full min-h-[560px] grid-cols-[220px_minmax(0,1fr)] gap-3"
    : "grid h-full min-h-[560px] grid-cols-[220px_minmax(0,1fr)_320px] gap-3";

  return (
    <div className={gridClass}>
      <WorkflowPalette onAdd={addNode} />
      <div
        className="bg-card/30 relative h-full min-h-[400px] w-full overflow-hidden rounded-xl border"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <ReactFlow
          className="!h-full !w-full"
          nodes={nodesForFlow}
          edges={edgesForFlow}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
          minZoom={CANVAS_MIN_ZOOM}
          maxZoom={CANVAS_MAX_ZOOM}
          fitView
          fitViewOptions={{
            padding: CANVAS_FIT_PADDING,
            minZoom: CANVAS_MIN_ZOOM,
            maxZoom: 1,
          }}
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={["Backspace", "Delete"]}
        >
          <FitViewOnWorkflowLoad nodeCount={workflow.nodes.length} />
          <FollowRuntimeActiveNode nodeId={runtimeActiveNodeId} />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls position="bottom-right" showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            className="!bg-card/80 !border-border/60 rounded-md !border"
            nodeColor={minimapColor}
            nodeStrokeColor={minimapNodeStrokeColor}
            nodeStrokeWidth={2}
            maskColor="rgb(15 23 42 / 0.82)"
            maskStrokeColor={MINIMAP_VIEWPORT_STROKE}
            maskStrokeWidth={1}
          />
        </ReactFlow>
      </div>
      {!hideInspector ? (
        selectedEdge ? (
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
        )
      ) : null}
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
  return {
    id: e.id,
    source: e.from,
    target: e.to,
    type: "workflowCondition",
    animated: false,
    data: {
      condition: e.condition,
    } satisfies WorkflowEdgeData,
  };
}

function applyRuntimeNodeHighlight(
  nodes: Node[],
  runtimeActiveNodeId: string | null,
): Node[] {
  if (!runtimeActiveNodeId) return nodes;
  return nodes.map((n) => ({
    ...n,
    data: {
      ...(n.data as WorkflowNodeData),
      runtimeActive: n.id === runtimeActiveNodeId,
    } satisfies WorkflowNodeData,
  }));
}

function applyRuntimeEdgeHighlight(
  edges: Edge[],
  runtimeActiveNodeId: string | null,
): Edge[] {
  if (!runtimeActiveNodeId) return edges;
  return edges.map((e) => ({
    ...e,
    data: {
      ...(e.data as WorkflowEdgeData),
      runtimePathActive: e.source === runtimeActiveNodeId,
    } satisfies WorkflowEdgeData,
  }));
}

/** Canonical condition string lives on edge.data; label is display-only. */
function readEdgeCondition(edge: Edge): string | undefined {
  const fromData = (edge.data as { condition?: string } | undefined)?.condition;
  if (typeof fromData === "string") return fromData;
  if (typeof edge.label === "string" && edge.label.trim()) {
    return edge.label;
  }
  return undefined;
}

function fromReactFlowEdges(edges: Edge[]): WorkflowEdge[] {
  return edges.map((e) => {
    const condition = readEdgeCondition(e);
    return {
      id: e.id,
      from: e.source,
      to: e.target,
      // undefined = None; "" = AI mode with empty text (still being edited)
      condition,
    };
  });
}

/** Push suggested conditions onto outgoing edges when the source prompt changes. */
function syncOutgoingEdgeConditions(
  edges: Edge[],
  sourceId: string,
  prevPrompt: string | undefined,
  nextPrompt: string | undefined,
): Edge[] {
  const outgoing = edges.filter((e) => e.source === sourceId);
  if (outgoing.length === 0) return edges;

  let changed = false;
  const next = edges.map((edge) => {
    if (edge.source !== sourceId) return edge;

    const branchIndex = outgoing.findIndex((o) => o.id === edge.id);
    const suggested = suggestEdgeConditionFromPrompt(nextPrompt, {
      branchIndex,
    });
    if (!suggested) return edge;

    const current = readEdgeCondition(edge);
    const prevSuggested = suggestEdgeConditionFromPrompt(prevPrompt, {
      branchIndex,
    });
    const shouldFill =
      current === undefined ||
      current.trim() === "" ||
      (prevSuggested !== undefined &&
        current.trim() === prevSuggested.trim());

    if (!shouldFill) return edge;

    changed = true;
    return toReactFlowEdge({
      id: edge.id,
      from: edge.source,
      to: edge.target,
      condition: suggested,
    });
  });

  return changed ? next : edges;
}
