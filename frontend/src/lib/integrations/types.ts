/**
 * Normalized Notion property type set used across the app.
 * This is a 1:1 mapping of the Notion API property types we support today.
 */
export type NotionFieldType =
  | "title"
  | "rich_text"
  | "number"
  | "select"
  | "multi_select"
  | "status"
  | "date"
  | "people"
  | "files"
  | "checkbox"
  | "url"
  | "email"
  | "phone_number"
  | "formula"
  | "relation"
  | "rollup"
  | "created_time"
  | "created_by"
  | "last_edited_time"
  | "last_edited_by"
  | "unique_id"
  | "verification"
  | "unknown";

export type FieldMapping = {
  /** Notion property id (stable across renames) */
  notionPropertyId: string;
  /** Notion property name as shown in Notion */
  notionPropertyName: string;
  /** Resolved Notion type */
  notionType: NotionFieldType;
  /** Sanitized snake_case key used when shaping JSON for Vapi function tools */
  key: string;
  /** Optional human-written hint for the LLM ("This column stores ...") */
  description: string;
  /** Available options for select/multi_select/status (read from Notion) */
  options?: { id: string; name: string; color?: string }[];
  /** Whether the agent should load this field into pre-call context by default */
  loadIntoContext: boolean;
};

export type IntegrationKind = "notion" | "hubspot" | "bitrix24";

/**
 * The five Vapi function tools we provision per Notion integration. Each one
 * gets its own JSON-schema and a dedicated webhook endpoint on our side.
 *
 *   - `save`    : insert a new row
 *   - `find`    : look up a single row by a lookup field + value
 *   - `search`  : look up multiple rows by a lookup field + value (with limit)
 *   - `update`  : find a row by lookup, then patch its properties
 *   - `delete`  : find a row by lookup, then archive it (Notion has no hard delete)
 */
export type NotionToolKind = "save" | "find" | "search" | "update" | "delete";

export const NOTION_TOOL_KINDS: NotionToolKind[] = [
  "save",
  "find",
  "search",
  "update",
  "delete",
];

export const NOTION_TOOL_LABELS: Record<
  NotionToolKind,
  { name: string; verb: string; description: string }
> = {
  save: {
    name: "Save row",
    verb: "save_row",
    description: "Insert a new row into the connected Notion database.",
  },
  find: {
    name: "Find row",
    verb: "find_row",
    description:
      "Look up a single row by a lookup field (e.g. phone number, email) and value.",
  },
  search: {
    name: "Search rows",
    verb: "search_rows",
    description:
      "Look up multiple rows by a lookup field and value. Returns up to N matches.",
  },
  update: {
    name: "Update row",
    verb: "update_row",
    description:
      "Find a row by lookup, then update one or more of its properties.",
  },
  delete: {
    name: "Archive row",
    verb: "delete_row",
    description:
      "Find a row by lookup and archive it (Notion has no hard delete).",
  },
};

/** A live Vapi tool registration that we own. */
export type VapiToolRef = {
  kind: NotionToolKind;
  /** Vapi-side tool id (`tool.id` returned from `POST /tool`). */
  id: string;
  /** Function name we set on Vapi side (used in /tools page + debugging). */
  functionName: string;
  /** ISO timestamp of the last successful sync to Vapi. */
  lastSyncedAt: string;
};

export type IntegrationSyncStatus = "idle" | "syncing" | "synced" | "error";

export type NotionIntegration = {
  id: string;
  kind: "notion";
  label: string;
  /**
   * Notion internal-integration token. MVP only — stored in localStorage
   * for the demo. Will move to backend `IntegrationCredential` table on Day 9.
   */
  token: string;
  /** Notion database id (parent of the data source) */
  databaseId: string;
  /** Notion data source id (where the schema + rows actually live, Notion 2025+ API) */
  dataSourceId: string;
  /** Plain-text title shown in the UI */
  databaseTitle: string;
  /** Mapping of database properties to our normalized form */
  fieldMap: FieldMapping[];
  createdAt: string;
  /** Vapi function tools we registered for this integration. */
  vapiTools?: VapiToolRef[];
  /** UI-friendly status of the last sync attempt to Vapi. */
  syncStatus?: IntegrationSyncStatus;
  /** Populated when `syncStatus === "error"`. */
  lastSyncError?: string;
};

export type Integration = NotionIntegration;

/** Soft cap. UI blocks creation past this; can be lifted with an "enterprise" hint. */
export const NOTION_INTEGRATION_LIMIT = 3;
