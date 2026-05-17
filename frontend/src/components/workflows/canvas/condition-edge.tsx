"use client";

import * as React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useEdges,
  type EdgeProps,
} from "@xyflow/react";
import { cn } from "@/lib/utils";

export type WorkflowEdgeData = {
  condition?: string;
  runtimePathActive?: boolean;
};

function parseCondition(raw: string | undefined): {
  showPill: boolean;
  isLogic: boolean;
  isDraft: boolean;
  displayText: string;
} {
  if (raw === undefined) {
    return { showPill: false, isLogic: false, isDraft: false, displayText: "" };
  }
  const isLogic = /\{\{[\s\S]*\}\}/.test(raw);
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      showPill: true,
      isLogic,
      isDraft: true,
      displayText: "Add condition",
    };
  }
  const displayText =
    trimmed.length > 52 ? `${trimmed.slice(0, 49)}…` : trimmed;
  return { showPill: true, isLogic, isDraft: false, displayText };
}

/**
 * Vapi-style stepped connector with an on-path condition pill (AI = amber, Liquid = purple).
 */
export function WorkflowConditionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
  selected,
}: EdgeProps) {
  // Subscribe to the edges store so the pill updates on every keystroke in the
  // inspector (React Flow may not re-pass `data` to a memoized custom edge).
  const edges = useEdges();
  const liveCondition = React.useMemo(() => {
    const live = edges.find((e) => e.id === id);
    return (live?.data as WorkflowEdgeData | undefined)?.condition;
  }, [edges, id]);

  const edgeData = data as WorkflowEdgeData | undefined;
  const condition = liveCondition ?? edgeData?.condition;
  const runtimePathActive = React.useMemo(() => {
    const live = edges.find((e) => e.id === id);
    return Boolean(
      (live?.data as WorkflowEdgeData | undefined)?.runtimePathActive ??
        edgeData?.runtimePathActive,
    );
  }, [edgeData?.runtimePathActive, edges, id]);

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
    offset: 4,
  });

  const { showPill, isLogic, isDraft, displayText } = parseCondition(condition);
  const hasActiveCondition = showPill && !isDraft;

  const stroke = runtimePathActive
    ? "rgba(45, 212, 191, 0.9)"
    : hasActiveCondition
      ? isLogic
        ? "rgba(192, 132, 252, 0.85)"
        : "rgba(45, 212, 191, 0.9)"
      : "rgba(148, 163, 184, 0.55)";

  const strokeWidth = runtimePathActive ? 2.5 : hasActiveCondition ? 2.25 : 1.5;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={24}
        className={runtimePathActive ? "workflow-runtime-edge-path" : undefined}
        style={{
          ...style,
          stroke,
          strokeWidth,
        }}
      />
      {showPill ? (
        <EdgeLabelRenderer>
          <div
            className={cn(
              "nodrag nopan pointer-events-auto absolute flex max-w-[min(240px,42vw)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border px-2.5 py-1 text-[11px] font-medium leading-snug shadow-md",
              isDraft && "border-dashed opacity-80",
              isLogic
                ? "border-purple-400/60 bg-purple-950/90 text-purple-100"
                : "border-amber-400/70 bg-amber-950/90 text-amber-100",
              selected && "ring-2 ring-white/40",
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <span
              className={cn(
                "text-center",
                isLogic && "font-mono text-[10px]",
                isDraft && "text-muted-foreground italic",
              )}
            >
              {displayText}
            </span>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
