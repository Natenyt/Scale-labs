/**
 * Singleton integrations store backed by `localStorage`.
 *
 * Designed for `useSyncExternalStore`: a tiny pub/sub plus mutators. We hydrate
 * lazily the first time a snapshot is requested in the browser, so SSR returns
 * the stable empty snapshot and the client picks up the persisted records.
 *
 * On Day 9 this gets replaced by React Query hitting the Django backend; the
 * mutator signatures here intentionally mirror what those hooks will look like.
 */

import {
  NOTION_INTEGRATION_LIMIT,
  type Integration,
  type IntegrationSyncStatus,
  type NotionIntegration,
  type VapiToolRef,
} from "./types";

const STORAGE_KEY = "scalelabs:integrations:v1";

let cache: Integration[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

// Stable empty array reference for SSR snapshots (avoids loops in React 18+).
const EMPTY: Integration[] = Object.freeze([]) as unknown as Integration[];

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
      const parsed = JSON.parse(raw) as Integration[];
      if (Array.isArray(parsed)) cache = parsed;
    }
  } catch {
    /* fall through with empty cache */
  }
  hydrated = true;
}

function makeId(kind: Integration["kind"]) {
  return `${kind}_${Math.random().toString(36).slice(2, 10)}`;
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

export function getSnapshot(): Integration[] {
  hydrate();
  return cache;
}

export function getServerSnapshot(): Integration[] {
  return EMPTY;
}

// Useful for components that want to know whether the cache was hydrated from
// localStorage yet (vs the SSR empty snapshot). True after first client read.
// We call `hydrate()` here so consumers reading `ready` in the same render as
// `integrations` always see consistent values, regardless of read order.
export function isHydrated(): boolean {
  hydrate();
  return hydrated;
}

// ---------------------------------------------------------------------------
// Mutators
// ---------------------------------------------------------------------------

export type CreateNotionInput = Omit<
  NotionIntegration,
  "id" | "kind" | "createdAt"
>;

export function createNotion(input: CreateNotionInput): NotionIntegration {
  hydrate();
  const record: NotionIntegration = {
    ...input,
    id: makeId("notion"),
    kind: "notion",
    createdAt: new Date().toISOString(),
  };
  cache = [record, ...cache];
  persist();
  notify();
  return record;
}

export function updateNotion(
  id: string,
  patch: Partial<NotionIntegration>,
): void {
  hydrate();
  let changed = false;
  cache = cache.map((i) => {
    if (i.id !== id || i.kind !== "notion") return i;
    changed = true;
    return { ...i, ...patch } as NotionIntegration;
  });
  if (changed) {
    persist();
    notify();
  }
}

export function deleteIntegration(id: string): void {
  hydrate();
  const next = cache.filter((i) => i.id !== id);
  if (next.length === cache.length) return;
  cache = next;
  persist();
  notify();
}

export function setSyncStatus(
  id: string,
  status: IntegrationSyncStatus,
  error?: string,
): void {
  hydrate();
  let changed = false;
  cache = cache.map((i) => {
    if (i.id !== id) return i;
    changed = true;
    return {
      ...i,
      syncStatus: status,
      lastSyncError: status === "error" ? error : undefined,
    } as Integration;
  });
  if (changed) {
    persist();
    notify();
  }
}

export function setVapiTools(id: string, refs: VapiToolRef[]): void {
  hydrate();
  let changed = false;
  cache = cache.map((i) => {
    if (i.id !== id || i.kind !== "notion") return i;
    changed = true;
    return { ...i, vapiTools: refs } as NotionIntegration;
  });
  if (changed) {
    persist();
    notify();
  }
}

export function notionRemainingSlots(items: Integration[] = cache): number {
  const notion = items.filter((i) => i.kind === "notion").length;
  return Math.max(0, NOTION_INTEGRATION_LIMIT - notion);
}

/** Replace cache after Django API hydration. */
export function replaceAllIntegrations(next: Integration[]): void {
  hydrate();
  cache = [...next];
  persist();
  notify();
}

/** Wipe cache and persisted rows (e.g. on logout or before re-hydrate). */
export function resetIntegrationsStore(): void {
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

/** Insert or replace a Notion row (e.g. after POST /integrations/notion/). */
export function upsertNotionIntegration(record: NotionIntegration): void {
  hydrate();
  const idx = cache.findIndex((i) => i.id === record.id);
  if (idx === -1) {
    cache = [record, ...cache];
  } else {
    cache = cache.map((i) => (i.id === record.id ? record : i));
  }
  persist();
  notify();
}
