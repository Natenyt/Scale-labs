import "server-only";

/**
 * Tiny server-only wrapper around the Vapi tool REST API.
 *
 * We don't depend on the Vapi SDK on the server because we only need three
 * narrow operations against `/tool`: create, update, delete. Keeping it as a
 * fetch wrapper avoids pulling another package and gives us complete control
 * over typing and error mapping.
 *
 * Auth: `VAPI_API_KEY` must be set in env. We never accept the key from a
 * request header — that surface is reserved for `NOTION_TOKEN`-style flows
 * (which are bound to a specific integration record).
 */

const VAPI_BASE = "https://api.vapi.ai";

export class VapiTokenMissingError extends Error {
  constructor() {
    super("VAPI_API_KEY is not configured on the server");
    this.name = "VapiTokenMissingError";
  }
}

export class VapiWebhookBaseMissingError extends Error {
  constructor() {
    super(
      "VAPI_WEBHOOK_BASE is not configured. Set it to a public https URL (use `ngrok http 3000` in local dev) so Vapi can reach our webhooks.",
    );
    this.name = "VapiWebhookBaseMissingError";
  }
}

export class VapiSharedSecretMissingError extends Error {
  constructor() {
    super("VAPI_SHARED_SECRET is not configured on the server");
    this.name = "VapiSharedSecretMissingError";
  }
}

export class VapiApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`Vapi API error (${status})`);
    this.name = "VapiApiError";
    this.status = status;
    this.body = body;
  }
}

function requireApiKey(): string {
  const key = process.env.VAPI_API_KEY;
  if (!key) throw new VapiTokenMissingError();
  return key;
}

function normalizeWebhookUrl(url: string): string {
  const u = url.trim().replace(/\/$/, "");
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `https://${u}`;
}

function isLocalWebhookBase(url: string): boolean {
  if (!url) return true;
  try {
    const host = new URL(normalizeWebhookUrl(url)).hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local")
    );
  } catch {
    return true;
  }
}

/**
 * Public origin Vapi should call for tool webhooks. Prefers an explicit
 * non-local `VAPI_WEBHOOK_BASE`, then the same ngrok/public URL used by the UI.
 */
export function resolveWebhookBase(): string | null {
  const explicit = normalizeWebhookUrl(process.env.VAPI_WEBHOOK_BASE ?? "");
  const devPublic = normalizeWebhookUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL ??
      process.env.NEXT_PUBLIC_DEV_ORIGIN ??
      "",
  );

  if (explicit && !isLocalWebhookBase(explicit)) return explicit;
  if (devPublic && !isLocalWebhookBase(devPublic)) return devPublic;
  return explicit || devPublic || null;
}

export class VapiWebhookBaseNotPublicError extends Error {
  constructor(base: string) {
    super(
      `Vapi cannot reach ${base}. Set VAPI_WEBHOOK_BASE to a public https URL, or use ngrok on port 3000 with NEXT_PUBLIC_DEV_ORIGIN / NEXT_PUBLIC_API_BASE_URL.`,
    );
    this.name = "VapiWebhookBaseNotPublicError";
  }
}

export function requireWebhookBase(): string {
  const base = resolveWebhookBase();
  if (!base) throw new VapiWebhookBaseMissingError();
  if (isLocalWebhookBase(base)) throw new VapiWebhookBaseNotPublicError(base);
  return base;
}

export function requireSharedSecret(): string {
  const secret = process.env.VAPI_SHARED_SECRET?.trim();
  if (!secret) throw new VapiSharedSecretMissingError();
  return secret;
}

async function vapiFetch<T>(
  path: string,
  init: RequestInit & { method: string },
): Promise<T> {
  const apiKey = requireApiKey();
  const res = await fetch(`${VAPI_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    throw new VapiApiError(res.status, parsed);
  }
  return parsed as T;
}

/**
 * Shape of a Vapi `function` tool we care about. Vapi accepts more fields but
 * these are the ones we set/read for Notion auto-provisioning.
 */
export type VapiFunctionToolPayload = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
  server: {
    url: string;
    headers?: Record<string, string>;
    secret?: string;
  };
};

export type VapiToolResponse = {
  id: string;
  type: string;
  function?: { name?: string };
  createdAt?: string;
  updatedAt?: string;
};

export function createTool(
  payload: VapiFunctionToolPayload,
): Promise<VapiToolResponse> {
  return vapiFetch<VapiToolResponse>("/tool", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTool(
  id: string,
  payload: VapiFunctionToolPayload,
): Promise<VapiToolResponse> {
  return vapiFetch<VapiToolResponse>(`/tool/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteTool(id: string): Promise<void> {
  return vapiFetch<void>(`/tool/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Workflow REST surface
//
// Authoritative shape, per docs.vapi.ai/workflows/overview + quickstart:
//   POST   /workflow                  body: { name, nodes, edges }
//   GET    /workflow/{id}
//   PATCH  /workflow/{id}             body: { name?, nodes?, edges? }  (array-replace, not deep-merge)
//   DELETE /workflow/{id}             idempotent best-effort
//
// Nodes/edges are kept as `unknown[]` here so the compiler in
// `lib/workflows/vapi-compile.ts` owns the precise type. The server stays
// dumb on shape and lets Vapi reject anything malformed with a 400 surfaced
// through VapiApiError.
// ---------------------------------------------------------------------------

export type VapiWorkflowPayload = {
  name: string;
  nodes: unknown[];
  edges: unknown[];
  /** Optional workflow-wide system prompt (Vapi `globalPrompt`). */
  globalPrompt?: string;
  /** Workflow-wide voice. Vapi native voice = lowest TTS latency. */
  voice?: { provider: string; voiceId: string; speed?: number };
  /** Workflow-wide STT. */
  transcriber?: { provider: string; model: string; language?: string };
  /** Workflow-wide LLM. */
  model?: { provider: string; model: string };
};

export type VapiWorkflowResponse = {
  id: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  globalPrompt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function createWorkflow(
  payload: VapiWorkflowPayload,
): Promise<VapiWorkflowResponse> {
  return vapiFetch<VapiWorkflowResponse>("/workflow", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getWorkflow(id: string): Promise<VapiWorkflowResponse> {
  return vapiFetch<VapiWorkflowResponse>(`/workflow/${id}`, { method: "GET" });
}

export function updateWorkflow(
  id: string,
  payload: VapiWorkflowPayload,
): Promise<VapiWorkflowResponse> {
  return vapiFetch<VapiWorkflowResponse>(`/workflow/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteWorkflow(id: string): Promise<void> {
  return vapiFetch<void>(`/workflow/${id}`, { method: "DELETE" });
}

/**
 * Translate any thrown value into a stable `{ status, body }` shape for our
 * route handlers. Mirrors the helper in `lib/notion/server.ts`.
 */
export function toVapiRouteError(err: unknown): {
  status: number;
  body: { error: string; code?: string; detail?: unknown };
} {
  if (err instanceof VapiTokenMissingError) {
    return {
      status: 500,
      body: { error: err.message, code: "vapi_token_missing" },
    };
  }
  if (err instanceof VapiWebhookBaseMissingError) {
    return {
      status: 412,
      body: { error: err.message, code: "vapi_webhook_base_missing" },
    };
  }
  if (err instanceof VapiWebhookBaseNotPublicError) {
    return {
      status: 412,
      body: { error: err.message, code: "vapi_webhook_base_not_public" },
    };
  }
  if (err instanceof VapiSharedSecretMissingError) {
    return {
      status: 500,
      body: { error: err.message, code: "vapi_shared_secret_missing" },
    };
  }
  if (err instanceof VapiApiError) {
    return {
      status: err.status,
      body: {
        error: "Vapi API error",
        code: "vapi_api_error",
        detail: err.body,
      },
    };
  }
  const message = err instanceof Error ? err.message : "Unexpected error";
  return { status: 500, body: { error: message } };
}
