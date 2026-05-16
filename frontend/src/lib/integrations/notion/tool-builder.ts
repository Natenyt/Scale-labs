/**
 * Build Vapi `function` tool payloads from a Notion integration record.
 *
 * Each integration produces five tools — save / find / search / update / delete —
 * whose JSON-schema parameters are derived from the integration's `fieldMap`.
 *
 * This is the TypeScript port of `10x/integrations/notion/tool_creator.py`,
 * generalized to cover all five operations instead of just `insert_row`.
 */

import { sanitizeKey } from "@/lib/integrations/sanitize";
import {
  NOTION_TOOL_KINDS,
  NOTION_TOOL_LABELS,
  type FieldMapping,
  type NotionFieldType,
  type NotionIntegration,
  type NotionToolKind,
} from "@/lib/integrations/types";
import type { VapiFunctionToolPayload } from "@/lib/vapi/server";

// ---------------------------------------------------------------------------
// JSON-schema type for Notion field types
// ---------------------------------------------------------------------------

/**
 * Map a Notion property type onto the JSON-schema parameter type accepted by
 * Vapi. We deliberately keep this conservative — Vapi's parameter parser is
 * happiest with `string` / `number` / `array` / `boolean`.
 */
export function jsonTypeForNotion(notionType: NotionFieldType): {
  type: "string" | "number" | "boolean" | "array";
  items?: { type: "string" };
} {
  switch (notionType) {
    case "number":
      return { type: "number" };
    case "checkbox":
      return { type: "boolean" };
    case "multi_select":
    case "people":
    case "relation":
    case "files":
      return { type: "array", items: { type: "string" } };
    default:
      return { type: "string" };
  }
}

/**
 * Field types we can use as a `lookup_field`. Notion's filter shape varies per
 * property type; the webhook only understands these. UI should mirror this set
 * when offering lookup-field suggestions.
 */
export const LOOKUP_FIELD_TYPES: ReadonlyArray<NotionFieldType> = [
  "title",
  "rich_text",
  "email",
  "phone_number",
  "url",
  "number",
  "select",
  "status",
  "unique_id",
];

export function isLookupable(field: FieldMapping): boolean {
  return LOOKUP_FIELD_TYPES.includes(field.notionType);
}

// ---------------------------------------------------------------------------
// JSON-schema property builders
// ---------------------------------------------------------------------------

type JsonProp = {
  type: "string" | "number" | "boolean" | "array";
  description: string;
  items?: { type: "string" };
  enum?: string[];
};

function propForField(field: FieldMapping): { key: string; prop: JsonProp } {
  const json = jsonTypeForNotion(field.notionType);
  const prop: JsonProp = {
    type: json.type,
    description:
      field.description?.trim() ||
      `Value for the "${field.notionPropertyName}" column (${field.notionType}).`,
  };
  if (json.items) prop.items = json.items;

  const options =
    field.options && field.options.length > 0
      ? field.options.map((o) => o.name)
      : null;
  if (options) {
    if (json.type === "array") {
      prop.description = `${prop.description} Allowed values (choose one or more): ${options.join(", ")}.`;
    } else if (json.type === "string") {
      prop.enum = options;
      prop.description = `${prop.description} Allowed values: ${options.join(", ")}.`;
    }
  }

  return { key: sanitizeKey(field.key || field.notionPropertyName), prop };
}

function lookupFieldEnumProp(fields: FieldMapping[]): JsonProp {
  const allowed = fields.filter(isLookupable);
  const keys = allowed.map((f) =>
    sanitizeKey(f.key || f.notionPropertyName),
  );
  return {
    type: "string",
    description: `Name of the column to look up by. Must be one of: ${keys.join(", ") || "(no lookupable fields)"}.`,
    enum: keys.length > 0 ? keys : undefined,
  };
}

function lookupValueProp(): JsonProp {
  return {
    type: "string",
    description:
      "Value to match against `lookup_field`. The webhook builds a Notion filter using the column's native type.",
  };
}

// ---------------------------------------------------------------------------
// Function name helpers
// ---------------------------------------------------------------------------

/**
 * Vapi function names must match `^[a-zA-Z0-9_-]+$` and be reasonably short.
 * Format: `notion_<label-slug>_<verb>`. We trim/sanitize the label so any user
 * input is safe.
 */
export function functionNameFor(
  integration: Pick<NotionIntegration, "label" | "id">,
  kind: NotionToolKind,
): string {
  const slug = sanitizeKey(integration.label) || integration.id;
  const verb = NOTION_TOOL_LABELS[kind].verb;
  return `notion_${slug}_${verb}`.slice(0, 64);
}

function functionDescriptionFor(
  integration: NotionIntegration,
  kind: NotionToolKind,
): string {
  const base = NOTION_TOOL_LABELS[kind].description;
  return `${base} Bound to the "${integration.label}" Notion connection (database: ${integration.databaseTitle || integration.databaseId}).`;
}

// ---------------------------------------------------------------------------
// Public: build previews (client-safe) and full payloads (server-only inputs)
// ---------------------------------------------------------------------------

export type ToolPreview = {
  kind: NotionToolKind;
  functionName: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, JsonProp>;
    required?: string[];
  };
};

export type BuiltTool = ToolPreview & {
  payload: VapiFunctionToolPayload;
};

/**
 * Build the function-schema view of all 5 tools for a Notion integration.
 * Pure / client-safe: no secrets, no webhook base. Use for /tools rendering
 * and JSON previews.
 */
export function buildNotionToolPreviews(
  integration: NotionIntegration,
): ToolPreview[] {
  const writableFields = integration.fieldMap.filter((f) =>
    isWritableType(f.notionType),
  );
  return NOTION_TOOL_KINDS.map((kind) =>
    buildPreview(integration, kind, writableFields),
  );
}

/**
 * Build full Vapi tool payloads — same as `buildNotionToolPreviews` but with
 * `server.url` + `server.headers` attached. Server-only inputs (`webhookBase`,
 * `sharedSecret`) so this is only safe to call from a route handler.
 */
export function buildNotionToolPayloads(
  integration: NotionIntegration,
  options: { webhookBase: string; sharedSecret: string },
): BuiltTool[] {
  const previews = buildNotionToolPreviews(integration);
  return previews.map((preview) => attachServer(integration, preview, options));
}

function buildPreview(
  integration: NotionIntegration,
  kind: NotionToolKind,
  writableFields: FieldMapping[],
): ToolPreview {
  const properties: Record<string, JsonProp> = {};
  const required: string[] = [];

  if (kind === "save") {
    for (const field of writableFields) {
      const { key, prop } = propForField(field);
      properties[key] = prop;
      if (field.notionType === "title") required.push(key);
    }
  } else if (kind === "find" || kind === "delete") {
    properties.lookup_field = lookupFieldEnumProp(integration.fieldMap);
    properties.lookup_value = lookupValueProp();
    required.push("lookup_field", "lookup_value");
  } else if (kind === "search") {
    properties.lookup_field = lookupFieldEnumProp(integration.fieldMap);
    properties.lookup_value = lookupValueProp();
    properties.limit = {
      type: "number",
      description:
        "Maximum number of matching rows to return. Defaults to 10, hard-capped at 50.",
    };
    required.push("lookup_field", "lookup_value");
  } else if (kind === "update") {
    properties.lookup_field = lookupFieldEnumProp(integration.fieldMap);
    properties.lookup_value = lookupValueProp();
    for (const field of writableFields) {
      const { key, prop } = propForField(field);
      // Update tool keys can't collide with lookup_* — prefix if a user named a field that way.
      const safeKey =
        key === "lookup_field" || key === "lookup_value" ? `field_${key}` : key;
      properties[safeKey] = prop;
    }
    required.push("lookup_field", "lookup_value");
  }

  return {
    kind,
    functionName: functionNameFor(integration, kind),
    description: functionDescriptionFor(integration, kind),
    parameters: {
      type: "object",
      properties,
      ...(required.length > 0 ? { required } : {}),
    },
  };
}

function attachServer(
  integration: NotionIntegration,
  preview: ToolPreview,
  { webhookBase, sharedSecret }: { webhookBase: string; sharedSecret: string },
): BuiltTool {
  const url = `${webhookBase}/api/webhooks/vapi/notion/${integration.id}/${preview.kind}`;
  const payload: VapiFunctionToolPayload = {
    type: "function",
    function: {
      name: preview.functionName,
      description: preview.description,
      parameters: preview.parameters,
    },
    server: {
      url,
      secret: sharedSecret,
      headers: {
        "X-Scale-Labs-Secret": sharedSecret,
        "X-Integration-Id": integration.id,
        "X-Tool-Kind": preview.kind,
        "X-Notion-Token": integration.token,
        "X-Database-Id": integration.databaseId,
        "X-Data-Source-Id": integration.dataSourceId,
      },
    },
  };
  return { ...preview, payload };
}

/**
 * Notion property types we should *not* offer as writable parameters
 * (they are computed by Notion or unsupported for our MVP).
 */
function isWritableType(type: NotionFieldType): boolean {
  switch (type) {
    case "formula":
    case "rollup":
    case "created_time":
    case "created_by":
    case "last_edited_time":
    case "last_edited_by":
    case "unique_id":
    case "verification":
    case "unknown":
      return false;
    default:
      return true;
  }
}
