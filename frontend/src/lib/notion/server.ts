import "server-only";

import { Client, APIResponseError } from "@notionhq/client";

import type { NotionFieldType } from "@/lib/integrations/types";

/**
 * Notion API version we pin against. Aligned with the 2025-09-03 data-source
 * model surfaced in the Notion MCP descriptors.
 */
export const NOTION_API_VERSION = "2025-09-03";

const TOKEN_HEADER = "x-notion-token";

/**
 * Build a server-side Notion client.
 *
 * Token resolution order:
 *   1. `X-Notion-Token` header (forwarded from the browser / integrations store)
 *   2. `NOTION_TOKEN` env var (server-side fallback for local dev)
 *
 * Throws a thin error our route handlers translate into a 401.
 */
export function getNotionClient(req: Request): Client {
  const token =
    req.headers.get(TOKEN_HEADER) ?? process.env.NOTION_TOKEN ?? "";
  if (!token) {
    throw new NotionTokenMissingError();
  }
  return new Client({
    auth: token,
    notionVersion: NOTION_API_VERSION,
  });
}

export class NotionTokenMissingError extends Error {
  constructor() {
    super("Missing Notion token");
    this.name = "NotionTokenMissingError";
  }
}

/**
 * Convert any thrown value into a stable `{ status, body }` shape for our routes.
 * Notion API errors carry a useful `code` and `message`; non-Notion errors fall
 * back to a generic 500. Tokens are never echoed back.
 */
export function toRouteError(err: unknown): { status: number; body: { error: string; code?: string } } {
  if (err instanceof NotionTokenMissingError) {
    return {
      status: 401,
      body: { error: err.message, code: "missing_token" },
    };
  }
  if (err instanceof APIResponseError) {
    return {
      status: err.status,
      body: { error: err.message, code: err.code },
    };
  }
  const message = err instanceof Error ? err.message : "Unexpected error";
  return { status: 500, body: { error: message } };
}

// ---------------------------------------------------------------------------
// Notion property type normalization
// ---------------------------------------------------------------------------

const SUPPORTED_TYPES: Record<string, NotionFieldType> = {
  title: "title",
  rich_text: "rich_text",
  number: "number",
  select: "select",
  multi_select: "multi_select",
  status: "status",
  date: "date",
  people: "people",
  files: "files",
  checkbox: "checkbox",
  url: "url",
  email: "email",
  phone_number: "phone_number",
  formula: "formula",
  relation: "relation",
  rollup: "rollup",
  created_time: "created_time",
  created_by: "created_by",
  last_edited_time: "last_edited_time",
  last_edited_by: "last_edited_by",
  unique_id: "unique_id",
  verification: "verification",
};

export function normalizeNotionType(rawType: string): NotionFieldType {
  return SUPPORTED_TYPES[rawType] ?? "unknown";
}

/**
 * Extract a flat plain-text title from a Notion title array
 * (used to label databases and data sources in our UI).
 */
export function plainTextFromTitle(
  title: ReadonlyArray<{ plain_text?: string }> | undefined | null,
): string {
  if (!title || title.length === 0) return "";
  return title.map((t) => t.plain_text ?? "").join("").trim();
}
