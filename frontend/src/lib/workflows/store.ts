/**
 * Singleton workflows store backed by `localStorage`.
 *
 * Same shape as `lib/integrations/store.ts` — pub/sub for `useSyncExternalStore`
 * plus mutators that bypass React state. Drafts are persisted on every change
 * so a reload preserves canvas state; Vapi-side mirroring is *only* triggered
 * by an explicit Save action (see `sync-client.ts`).
 *
 * On Day 9 this lives in the Django backend; mutator signatures are picked
 * to map cleanly to a future React Query layer.
 */

import type {
  Workflow,
  WorkflowEdge,
  WorkflowNode,
  WorkflowSyncStatus,
} from "./types";

const STORAGE_KEY = "scalelabs:workflows:v1";

let cache: Workflow[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

// Stable empty array reference for SSR snapshots.
const EMPTY: Workflow[] = Object.freeze([]) as unknown as Workflow[];

function notify() {
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* quota or private-mode */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Workflow[];
      if (Array.isArray(parsed)) cache = parsed;
    }
  } catch {
    /* fall through with empty cache */
  }
  hydrated = true;
}

function makeId(prefix = "wf") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// useSyncExternalStore plumbing
// ---------------------------------------------------------------------------

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): Workflow[] {
  hydrate();
  return cache;
}

export function getServerSnapshot(): Workflow[] {
  return EMPTY;
}

export function isHydrated(): boolean {
  hydrate();
  return hydrated;
}

// ---------------------------------------------------------------------------
// Mutators
// ---------------------------------------------------------------------------

export function newNodeId(): string {
  return makeId("n");
}

export function newEdgeId(): string {
  return makeId("e");
}

export function defaultStartNode(): WorkflowNode {
  return {
    // Vapi convention from every official example: start node has id="start".
    id: "start",
    kind: "start",
    position: { x: 80, y: 200 },
    label: "Start",
    firstMessage: "Hi, this is Scale Labs. How can I help you?",
    systemPrompt:
      "You are a helpful voice assistant. Be concise, warm, and useful.",
    extractVariables: [],
  };
}

export type CreateWorkflowInput = {
  name: string;
  description?: string;
  id?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  globalPrompt?: string;
  vapiWorkflowId?: string;
  lastSyncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function createWorkflow(input: CreateWorkflowInput): Workflow {
  hydrate();
  const now = new Date().toISOString();
  const record: Workflow = {
    id: input.id ?? makeId(),
    name: input.name.trim() || "Untitled workflow",
    description: input.description?.trim() || undefined,
    nodes: input.nodes?.length ? input.nodes : [defaultStartNode()],
    edges: input.edges ?? [],
    globalPrompt: input.globalPrompt,
    vapiWorkflowId: input.vapiWorkflowId,
    lastSyncedAt: input.lastSyncedAt,
    syncStatus: "idle",
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
  cache = [record, ...cache];
  persist();
  notify();
  return record;
}

type UpdatableFields = Partial<
  Pick<Workflow, "name" | "description" | "globalPrompt" | "nodes" | "edges">
>;

export function updateWorkflow(id: string, patch: UpdatableFields): void {
  hydrate();
  let changed = false;
  cache = cache.map((w) => {
    if (w.id !== id) return w;
    changed = true;
    return {
      ...w,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
  });
  if (changed) {
    persist();
    notify();
  }
}

export function replaceGraph(
  id: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): void {
  updateWorkflow(id, { nodes, edges });
}

export function deleteWorkflow(id: string): void {
  hydrate();
  const next = cache.filter((w) => w.id !== id);
  if (next.length === cache.length) return;
  cache = next;
  persist();
  notify();
}

export function setSyncStatus(
  id: string,
  status: WorkflowSyncStatus,
  error?: string,
): void {
  hydrate();
  let changed = false;
  cache = cache.map((w) => {
    if (w.id !== id) return w;
    changed = true;
    return {
      ...w,
      syncStatus: status,
      lastSyncError: status === "error" ? error : undefined,
    };
  });
  if (changed) {
    persist();
    notify();
  }
}

/**
 * Replace the entire in-memory + localStorage cache (used after hydrating from
 * the Django API).
 */
export function replaceAllWorkflows(next: Workflow[]): void {
  hydrate();
  cache = [...next];
  persist();
  notify();
}

/** Wipe cache and persisted rows (e.g. on logout or before re-hydrate). */
export function resetWorkflowsStore(): void {
  cache = [];
  hydrated = true;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  notify();
}

export function setVapiWorkflowId(
  id: string,
  vapiWorkflowId: string,
  lastSyncedAt: string,
): void {
  hydrate();
  let changed = false;
  cache = cache.map((w) => {
    if (w.id !== id) return w;
    changed = true;
    return {
      ...w,
      vapiWorkflowId,
      lastSyncedAt,
      syncStatus: "synced",
      lastSyncError: undefined,
    };
  });
  if (changed) {
    persist();
    notify();
  }
}
