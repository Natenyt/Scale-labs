"""
Port of frontend/src/lib/integrations/notion/tool-builder.ts (subset).
Builds Vapi function tool payloads for the five Notion tool kinds.
"""
from __future__ import annotations

import re
from typing import Any, Literal, TypedDict

NotionToolKind = Literal["save", "find", "search", "update", "delete"]

NOTION_TOOL_KINDS: list[NotionToolKind] = [
    "save",
    "find",
    "search",
    "update",
    "delete",
]

NOTION_TOOL_LABELS: dict[NotionToolKind, dict[str, str]] = {
    "save": {
        "verb": "save_row",
        "description": "Insert a new row into the connected Notion database.",
    },
    "find": {
        "verb": "find_row",
        "description": "Look up a single row by a lookup field and value.",
    },
    "search": {
        "verb": "search_rows",
        "description": "Look up multiple rows by a lookup field and value.",
    },
    "update": {
        "verb": "update_row",
        "description": "Find a row by lookup, then update one or more properties.",
    },
    "delete": {
        "verb": "delete_row",
        "description": "Find a row by lookup and archive it.",
    },
}

LOOKUP_FIELD_TYPES = frozenset(
    {
        "title",
        "rich_text",
        "email",
        "phone_number",
        "url",
        "number",
        "select",
        "status",
        "unique_id",
    }
)

NON_WRITABLE = frozenset(
    {
        "formula",
        "rollup",
        "created_time",
        "created_by",
        "last_edited_time",
        "last_edited_by",
        "unique_id",
        "verification",
        "unknown",
    }
)


def sanitize_key(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[\s-]+", "_", s)
    s = s.replace(".", "")
    s = re.sub(r"[^a-z0-9_]", "_", s)
    s = re.sub(r"_+", "_", s)
    return s.strip("_")


def normalize_notion_type(raw: str) -> str:
    return raw if raw else "unknown"


def json_type_for_notion(notion_type: str) -> dict[str, Any]:
    if notion_type == "number":
        return {"type": "number"}
    if notion_type == "checkbox":
        return {"type": "boolean"}
    if notion_type in {"multi_select", "people", "relation", "files"}:
        return {"type": "array", "items": {"type": "string"}}
    return {"type": "string"}


def is_lookupable(field: dict[str, Any]) -> bool:
    return field.get("notionType") in LOOKUP_FIELD_TYPES


def is_writable_type(t: str) -> bool:
    return t not in NON_WRITABLE


class JsonProp(TypedDict, total=False):
    type: str
    description: str
    items: dict[str, str]
    enum: list[str]


def prop_for_field(field: dict[str, Any]) -> tuple[str, JsonProp]:
    nt = str(field.get("notionType") or "unknown")
    jt = json_type_for_notion(nt)
    desc = (field.get("description") or "").strip() or (
        f'Value for the "{field.get("notionPropertyName")}" column ({nt}).'
    )
    prop: JsonProp = {"type": jt["type"], "description": desc}
    if "items" in jt:
        prop["items"] = jt["items"]  # type: ignore[assignment]
    opts = field.get("options") or []
    names = [str(o.get("name")) for o in opts if o.get("name")]
    if names:
        if jt["type"] == "array":
            prop["description"] = (
                f"{desc} Allowed values (choose one or more): {', '.join(names)}."
            )
        elif jt["type"] == "string":
            prop["enum"] = names
            prop["description"] = f"{desc} Allowed values: {', '.join(names)}."
    key = sanitize_key(str(field.get("key") or field.get("notionPropertyName") or ""))
    return key, prop


def lookup_field_enum_prop(fields: list[dict[str, Any]]) -> JsonProp:
    allowed = [f for f in fields if is_lookupable(f)]
    keys = [sanitize_key(str(f.get("key") or f.get("notionPropertyName"))) for f in allowed]
    joined = ", ".join(keys) if keys else "(no lookupable fields)"
    out: JsonProp = {
        "type": "string",
        "description": (
            "Name of the column to look up by. Must be one of: " + joined + "."
        ),
    }
    if keys:
        out["enum"] = keys
    return out


def lookup_value_prop() -> JsonProp:
    return {
        "type": "string",
        "description": (
            "Value to match against `lookup_field`. The webhook builds a Notion "
            "filter using the column's native type."
        ),
    }


def function_name_for(integration_id: str, label: str, kind: NotionToolKind) -> str:
    slug = sanitize_key(label) or integration_id
    verb = NOTION_TOOL_LABELS[kind]["verb"]
    return f"notion_{slug}_{verb}"[:64]


def function_description_for(
    integration: dict[str, Any],
    kind: NotionToolKind,
) -> str:
    base = NOTION_TOOL_LABELS[kind]["description"]
    lab = integration.get("label") or ""
    db = integration.get("databaseTitle") or integration.get("databaseId") or ""
    return f'{base} Bound to the "{lab}" Notion connection (database: {db}).'


def build_preview(
    integration: dict[str, Any],
    kind: NotionToolKind,
    writable_fields: list[dict[str, Any]],
) -> dict[str, Any]:
    field_map: list[dict[str, Any]] = list(integration.get("fieldMap") or [])
    properties: dict[str, JsonProp] = {}
    required: list[str] = []

    if kind == "save":
        for field in writable_fields:
            key, prop = prop_for_field(field)
            properties[key] = prop
            if field.get("notionType") == "title":
                required.append(key)
    elif kind in ("find", "delete"):
        properties["lookup_field"] = lookup_field_enum_prop(field_map)
        properties["lookup_value"] = lookup_value_prop()
        required.extend(["lookup_field", "lookup_value"])
    elif kind == "search":
        properties["lookup_field"] = lookup_field_enum_prop(field_map)
        properties["lookup_value"] = lookup_value_prop()
        properties["limit"] = {
            "type": "number",
            "description": (
                "Maximum number of matching rows to return. Defaults to 10, "
                "hard-capped at 50."
            ),
        }
        required.extend(["lookup_field", "lookup_value"])
    elif kind == "update":
        properties["lookup_field"] = lookup_field_enum_prop(field_map)
        properties["lookup_value"] = lookup_value_prop()
        for field in writable_fields:
            key, prop = prop_for_field(field)
            safe = f"field_{key}" if key in ("lookup_field", "lookup_value") else key
            properties[safe] = prop
        required.extend(["lookup_field", "lookup_value"])

    iid = str(integration.get("id") or "")
    return {
        "kind": kind,
        "functionName": function_name_for(iid, str(integration.get("label") or ""), kind),
        "description": function_description_for(integration, kind),
        "parameters": {
            "type": "object",
            "properties": properties,
            **({"required": required} if required else {}),
        },
    }


def attach_server(
    integration: dict[str, Any],
    preview: dict[str, Any],
    *,
    webhook_base: str,
    shared_secret: str,
) -> dict[str, Any]:
    iid = str(integration.get("id"))
    kind = preview["kind"]
    base = webhook_base.rstrip("/")
    url = f"{base}/api/v1/webhooks/vapi/notion/{iid}/{kind}/"
    payload: dict[str, Any] = {
        "type": "function",
        "function": {
            "name": preview["functionName"],
            "description": preview["description"],
            "parameters": preview["parameters"],
        },
        "server": {
            "url": url,
            "secret": shared_secret,
            # Auth only — Notion token + DB ids are loaded server-side from
            # integration_id in the URL (Vapi often does not forward custom headers).
            "headers": {
                "X-Scale-Labs-Secret": shared_secret,
            },
        },
    }
    return {**preview, "payload": payload}


def build_notion_tool_payloads(
    integration: dict[str, Any],
    *,
    webhook_base: str,
    shared_secret: str,
    notion_token: str,
) -> list[dict[str, Any]]:
    field_map: list[dict[str, Any]] = list(integration.get("fieldMap") or [])
    writable = [f for f in field_map if is_writable_type(str(f.get("notionType") or ""))]
    previews = [build_preview(integration, k, writable) for k in NOTION_TOOL_KINDS]
    return [
        attach_server(
            integration,
            p,
            webhook_base=webhook_base,
            shared_secret=shared_secret,
        )
        for p in previews
    ]
