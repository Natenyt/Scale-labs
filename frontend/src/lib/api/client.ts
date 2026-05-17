import { apiBaseUrl } from "@/lib/api/env";
import {
  clearTokens,
  getAccessToken,
  getActiveOrgId,
  getRefreshToken,
  setTokens,
} from "@/lib/api/tokens";

type Json = Record<string, unknown>;

/** Django expects trailing slashes on app routes; Next dev can strip them on proxy. */
function normalizeApiPath(path: string): string {
  if (!path.startsWith("/api/v1/")) return path;
  const [pathname, query] = path.split("?", 2);
  if (pathname.endsWith("/")) return path;
  return query ? `${pathname}/?${query}` : `${pathname}/`;
}

/** Turn DRF `{ detail }` or field errors into a single readable string. */
export function formatApiErrorMessage(parsed: unknown, statusText: string): string {
  if (!parsed || typeof parsed !== "object") return statusText;
  const o = parsed as Json;

  if ("detail" in o) {
    const d = o.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      const parts = d
        .map((item) =>
          typeof item === "string"
            ? item
            : item && typeof item === "object" && "string" in (item as object)
              ? String((item as { string: unknown }).string)
              : JSON.stringify(item),
        )
        .filter(Boolean);
      if (parts.length) return parts.join("; ");
    }
  }

  const lines: string[] = [];
  for (const [key, val] of Object.entries(o)) {
    if (key === "detail") continue;
    if (Array.isArray(val)) {
      const s = val.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(", ");
      if (s) lines.push(`${key}: ${s}`);
    } else if (val != null && typeof val !== "object") {
      lines.push(`${key}: ${String(val)}`);
    }
  }
  return lines.length ? lines.join(" ") : statusText;
}

async function refreshAccess(): Promise<string | null> {
  const base = apiBaseUrl();
  const refresh = getRefreshToken();
  if (!base || !refresh) return null;
  const r = await fetch(`${base}/api/v1/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!r.ok) {
    clearTokens();
    return null;
  }
  const data = (await r.json()) as { access?: string };
  if (!data.access) {
    clearTokens();
    return null;
  }
  setTokens(data.access, refresh);
  return data.access;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit & { json?: Json } = {},
): Promise<T> {
  const base = apiBaseUrl();
  if (!base) throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");

  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const org = getActiveOrgId();
  if (org) headers.set("X-Org-Id", org);

  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  const apiPath = normalizeApiPath(path);
  const url = apiPath.startsWith("http") ? apiPath : `${base}${apiPath}`;
  let r: Response;
  try {
    r = await fetch(url, { ...init, headers, body });
  } catch (e) {
    const hint =
      org && path.includes("/api/v1/")
        ? " Check that the API is running and CORS allows X-Org-Id (restart Django after config changes)."
        : "";
    throw new Error(
      (e instanceof Error ? e.message : "Network request failed") + hint,
    );
  }

  if (r.status === 401 && getRefreshToken()) {
    const next = await refreshAccess();
    if (next) {
      headers.set("Authorization", `Bearer ${next}`);
      r = await fetch(url, { ...init, headers, body });
    }
  }

  const text = await r.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  }
  if (!r.ok) {
    const msg = formatApiErrorMessage(parsed, r.statusText);
    const err = new Error(msg);
    (err as Error & { status?: number; body?: unknown }).status = r.status;
    (err as Error & { status?: number; body?: unknown }).body = parsed;
    throw err;
  }
  return parsed as T;
}
