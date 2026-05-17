import { NextResponse } from "next/server";

import { sanitizeKey } from "@/lib/integrations/sanitize";
import type { NotionFieldType, NotionToolKind } from "@/lib/integrations/types";
import {
  NotionTokenMissingError,
  getNotionClient,
  normalizeNotionType,
  toRouteError,
} from "@/lib/notion/server";
import { parseVapiToolCall } from "@/lib/integrations/notion/parse-vapi-tool-call";
import { requireSharedSecret } from "@/lib/vapi/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ integrationId: string; kind: string }> };

const VALID_KINDS: ReadonlyArray<NotionToolKind> = [
  "save",
  "find",
  "search",
  "update",
  "delete",
];

/**
 * POST /api/webhooks/vapi/notion/[integrationId]/[kind]
 *
 * Vapi calls this URL when an agent invokes one of the 5 generated tools for
 * a Notion integration. Authentication relies on the `X-Scale-Labs-Secret`
 * header that we set at tool-registration time.
 *
 * The integration's Notion token is forwarded back to us as `X-Notion-Token`
 * (also set at registration time). Together with `X-Data-Source-Id` and
 * `X-Database-Id` we have everything we need to talk to Notion without any
 * server-side persistence.
 */
export async function POST(req: Request, ctx: RouteCtx) {
  const { kind: kindParam } = await ctx.params;
  const kind = kindParam as NotionToolKind;

  if (!VALID_KINDS.includes(kind)) {
    return NextResponse.json(
      { error: `Unknown tool kind: ${kindParam}` },
      { status: 400 },
    );
  }

  // ---- Auth: shared secret ------------------------------------------------
  let expectedSecret: string;
  try {
    expectedSecret = requireSharedSecret();
  } catch {
    return NextResponse.json(
      { error: "Server misconfigured (no shared secret)" },
      { status: 500 },
    );
  }
  const presentedHeader = req.headers.get("X-Scale-Labs-Secret");
  const auth = req.headers.get("Authorization") ?? "";
  const presentedBearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  if (
    presentedHeader !== expectedSecret &&
    presentedBearer !== expectedSecret
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { message?: Record<string, unknown> };
  try {
    body = (await req.json()) as { message?: Record<string, unknown> };
  } catch {
    body = {};
  }
  const parsed = parseVapiToolCall(body);
  if (!parsed) {
    return NextResponse.json(
      { error: "No tool call in payload (expected message.toolCallList)" },
      { status: 400 },
    );
  }
  const toolCall = {
    id: parsed.toolCallId,
    function: { name: "", arguments: parsed.args },
  };

  const dataSourceId = req.headers.get("X-Data-Source-Id");
  const databaseId = req.headers.get("X-Database-Id");
  if (!dataSourceId || !databaseId) {
    return NextResponse.json(
      { error: "Missing data source / database headers" },
      { status: 400 },
    );
  }

  // ---- Dispatch -----------------------------------------------------------
  try {
    const notion = getNotionClient(req);
    const schema = await loadSchema(notion, dataSourceId);
    const args = toolCall.function.arguments ?? {};

    let result: unknown;
    if (kind === "save") {
      result = await doSave(notion, dataSourceId, args, schema);
    } else if (kind === "find") {
      result = await doFind(notion, dataSourceId, args, schema);
    } else if (kind === "search") {
      result = await doSearch(notion, dataSourceId, args, schema);
    } else if (kind === "update") {
      result = await doUpdate(notion, dataSourceId, args, schema);
    } else if (kind === "delete") {
      result = await doDelete(notion, dataSourceId, args, schema);
    }

    return NextResponse.json({
      results: [
        {
          toolCallId: toolCall.id,
          result: JSON.stringify(result ?? { ok: true }),
        },
      ],
    });
  } catch (err) {
    if (err instanceof NotionTokenMissingError) {
      return NextResponse.json(
        {
          results: [
            {
              toolCallId: toolCall.id,
              result: JSON.stringify({
                ok: false,
                error: "Notion token missing on the webhook request.",
              }),
            },
          ],
        },
        { status: 200 },
      );
    }
    const { body } = toRouteError(err);
    return NextResponse.json(
      {
        results: [
          {
            toolCallId: toolCall.id,
            result: JSON.stringify({ ok: false, ...body }),
          },
        ],
      },
      { status: 200 },
    );
  }
}

// ---------------------------------------------------------------------------
// Schema cache (per-request) and helpers
// ---------------------------------------------------------------------------

type NotionClient = ReturnType<typeof getNotionClient>;

type SchemaEntry = {
  notionPropertyName: string;
  notionType: NotionFieldType;
  rawType: string;
};

type SchemaIndex = {
  /** sanitized_key -> SchemaEntry */
  byKey: Map<string, SchemaEntry>;
  /** original notion property name -> SchemaEntry */
  byName: Map<string, SchemaEntry>;
  /** notion title property name (used as fallback in flattening) */
  titleName: string | null;
};

async function loadSchema(
  notion: NotionClient,
  dataSourceId: string,
): Promise<SchemaIndex> {
  const ds = (await notion.dataSources.retrieve({
    data_source_id: dataSourceId,
  })) as { properties?: Record<string, { type: string }> };

  const byKey = new Map<string, SchemaEntry>();
  const byName = new Map<string, SchemaEntry>();
  let titleName: string | null = null;

  for (const [name, raw] of Object.entries(ds.properties ?? {})) {
    const notionType = normalizeNotionType(raw.type);
    const entry: SchemaEntry = {
      notionPropertyName: name,
      notionType,
      rawType: raw.type,
    };
    byName.set(name, entry);
    byKey.set(sanitizeKey(name), entry);
    if (notionType === "title") titleName = name;
  }

  return { byKey, byName, titleName };
}

function resolveLookup(
  schema: SchemaIndex,
  rawKey: unknown,
): SchemaEntry | null {
  if (typeof rawKey !== "string" || !rawKey) return null;
  const direct = schema.byKey.get(rawKey);
  if (direct) return direct;
  // Tolerance: the LLM might send the human name instead of the sanitized key.
  return schema.byName.get(rawKey) ?? schema.byKey.get(sanitizeKey(rawKey)) ?? null;
}

function buildFilter(entry: SchemaEntry, value: unknown): Record<string, unknown> | null {
  const v = value == null ? "" : String(value);
  switch (entry.notionType) {
    case "title":
      return { property: entry.notionPropertyName, title: { equals: v } };
    case "rich_text":
      return { property: entry.notionPropertyName, rich_text: { equals: v } };
    case "email":
      return { property: entry.notionPropertyName, email: { equals: v } };
    case "phone_number":
      return { property: entry.notionPropertyName, phone_number: { equals: v } };
    case "url":
      return { property: entry.notionPropertyName, url: { equals: v } };
    case "select":
      return { property: entry.notionPropertyName, select: { equals: v } };
    case "status":
      return { property: entry.notionPropertyName, status: { equals: v } };
    case "number": {
      const num = Number(v);
      if (Number.isNaN(num)) return null;
      return { property: entry.notionPropertyName, number: { equals: num } };
    }
    case "unique_id": {
      const num = Number(v);
      if (Number.isNaN(num)) return null;
      return { property: entry.notionPropertyName, unique_id: { equals: num } };
    }
    default:
      return null;
  }
}

function shapeProperty(entry: SchemaEntry, value: unknown): unknown {
  switch (entry.notionType) {
    case "title":
      return { title: [{ text: { content: String(value) } }] };
    case "rich_text":
      return { rich_text: [{ text: { content: String(value) } }] };
    case "email":
      return { email: String(value) };
    case "phone_number":
      return { phone_number: String(value) };
    case "url":
      return { url: String(value) };
    case "number":
      return { number: typeof value === "number" ? value : Number(value) };
    case "select":
      return { select: { name: String(value) } };
    case "status":
      return { status: { name: String(value) } };
    case "multi_select":
      return {
        multi_select: (Array.isArray(value) ? value : [value]).map((v) => ({
          name: String(v),
        })),
      };
    case "date":
      return { date: { start: String(value) } };
    case "checkbox":
      return { checkbox: Boolean(value) };
    case "people":
      return {
        people: (Array.isArray(value) ? value : [value]).map((id) => ({
          object: "user",
          id: String(id),
        })),
      };
    default:
      return { rich_text: [{ text: { content: String(value) } }] };
  }
}

function notionPropertiesFrom(
  schema: SchemaIndex,
  args: Record<string, unknown>,
  excludeKeys: Set<string>,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const [argKey, argValue] of Object.entries(args)) {
    if (excludeKeys.has(argKey)) continue;
    if (argValue === undefined || argValue === null || argValue === "") continue;
    const entry = schema.byKey.get(argKey) ?? schema.byName.get(argKey);
    if (!entry) continue;
    properties[entry.notionPropertyName] = shapeProperty(entry, argValue);
  }
  return properties;
}

function flattenPage(
  page: { id: string; properties?: Record<string, unknown> },
  schema: SchemaIndex,
): { id: string; fields: Record<string, unknown> } {
  const fields: Record<string, unknown> = {};
  for (const [name, raw] of Object.entries(page.properties ?? {})) {
    const entry = schema.byName.get(name);
    const key = entry
      ? sanitizeKey(entry.notionPropertyName)
      : sanitizeKey(name);
    fields[key] = readPropertyValue(raw, entry?.notionType ?? "unknown");
  }
  return { id: page.id, fields };
}

function readPropertyValue(raw: unknown, type: NotionFieldType): unknown {
  const v = raw as Record<string, unknown>;
  switch (type) {
    case "title":
    case "rich_text": {
      const arr = (v[type] ?? []) as { plain_text?: string }[];
      return arr.map((t) => t.plain_text ?? "").join("");
    }
    case "email":
    case "phone_number":
    case "url":
      return v[type] ?? null;
    case "number":
      return v.number ?? null;
    case "select":
      return ((v.select as { name?: string } | null) ?? {}).name ?? null;
    case "status":
      return ((v.status as { name?: string } | null) ?? {}).name ?? null;
    case "multi_select":
      return ((v.multi_select as { name?: string }[]) ?? []).map(
        (o) => o.name ?? "",
      );
    case "checkbox":
      return Boolean(v.checkbox);
    case "date":
      return ((v.date as { start?: string } | null) ?? {}).start ?? null;
    case "unique_id":
      return ((v.unique_id as { number?: number } | null) ?? {}).number ?? null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Per-kind handlers
// ---------------------------------------------------------------------------

async function doSave(
  notion: NotionClient,
  dataSourceId: string,
  args: Record<string, unknown>,
  schema: SchemaIndex,
) {
  const properties = notionPropertiesFrom(schema, args, new Set());
  const page = await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: dataSourceId },
    properties: properties as Parameters<
      typeof notion.pages.create
    >[0]["properties"],
  });
  return { ok: true, action: "save", pageId: page.id };
}

async function doFind(
  notion: NotionClient,
  dataSourceId: string,
  args: Record<string, unknown>,
  schema: SchemaIndex,
) {
  const entry = resolveLookup(schema, args.lookup_field);
  if (!entry) return { ok: false, error: "Unknown lookup_field" };

  const filter = buildFilter(entry, args.lookup_value);
  if (!filter)
    return { ok: false, error: `Cannot filter on ${entry.notionPropertyName}` };

  const response = (await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: filter as Parameters<typeof notion.dataSources.query>[0]["filter"],
    page_size: 1,
  })) as { results: { id: string; properties?: Record<string, unknown> }[] };

  const first = response.results[0];
  if (!first) return { ok: true, action: "find", found: false, page: null };
  return {
    ok: true,
    action: "find",
    found: true,
    page: flattenPage(first, schema),
  };
}

async function doSearch(
  notion: NotionClient,
  dataSourceId: string,
  args: Record<string, unknown>,
  schema: SchemaIndex,
) {
  const entry = resolveLookup(schema, args.lookup_field);
  if (!entry) return { ok: false, error: "Unknown lookup_field" };

  const filter = buildFilter(entry, args.lookup_value);
  if (!filter)
    return { ok: false, error: `Cannot filter on ${entry.notionPropertyName}` };

  const requested = Number(args.limit ?? 10);
  const limit = Number.isFinite(requested)
    ? Math.min(Math.max(1, requested), 50)
    : 10;

  const response = (await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: filter as Parameters<typeof notion.dataSources.query>[0]["filter"],
    page_size: limit,
  })) as { results: { id: string; properties?: Record<string, unknown> }[] };

  return {
    ok: true,
    action: "search",
    count: response.results.length,
    pages: response.results.map((r) => flattenPage(r, schema)),
  };
}

async function doUpdate(
  notion: NotionClient,
  dataSourceId: string,
  args: Record<string, unknown>,
  schema: SchemaIndex,
) {
  const entry = resolveLookup(schema, args.lookup_field);
  if (!entry) return { ok: false, error: "Unknown lookup_field" };

  const filter = buildFilter(entry, args.lookup_value);
  if (!filter)
    return { ok: false, error: `Cannot filter on ${entry.notionPropertyName}` };

  const response = (await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: filter as Parameters<typeof notion.dataSources.query>[0]["filter"],
    page_size: 1,
  })) as { results: { id: string }[] };
  const first = response.results[0];
  if (!first) return { ok: true, action: "update", updated: false };

  const properties = notionPropertiesFrom(
    schema,
    args,
    new Set(["lookup_field", "lookup_value", "limit"]),
  );
  if (Object.keys(properties).length === 0) {
    return { ok: false, error: "No update fields provided" };
  }

  const updated = await notion.pages.update({
    page_id: first.id,
    properties: properties as Parameters<
      typeof notion.pages.update
    >[0]["properties"],
  });
  return { ok: true, action: "update", pageId: updated.id, updated: true };
}

async function doDelete(
  notion: NotionClient,
  dataSourceId: string,
  args: Record<string, unknown>,
  schema: SchemaIndex,
) {
  const entry = resolveLookup(schema, args.lookup_field);
  if (!entry) return { ok: false, error: "Unknown lookup_field" };

  const filter = buildFilter(entry, args.lookup_value);
  if (!filter)
    return { ok: false, error: `Cannot filter on ${entry.notionPropertyName}` };

  const response = (await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: filter as Parameters<typeof notion.dataSources.query>[0]["filter"],
    page_size: 1,
  })) as { results: { id: string }[] };
  const first = response.results[0];
  if (!first) return { ok: true, action: "delete", archived: false };

  await notion.pages.update({ page_id: first.id, archived: true });
  return { ok: true, action: "delete", pageId: first.id, archived: true };
}
