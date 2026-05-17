from __future__ import annotations

import json
from typing import Any

from apps.studio.services.notion_http import (
    data_sources_query,
    data_sources_retrieve,
    pages_create,
    pages_update,
)
from apps.studio.services.notion_tool_builder import sanitize_key


class SchemaEntry:
    __slots__ = ("notion_property_name", "notion_type", "raw_type")

    def __init__(self, name: str, notion_type: str, raw_type: str):
        self.notion_property_name = name
        self.notion_type = notion_type
        self.raw_type = raw_type


class SchemaIndex:
    def __init__(self) -> None:
        self.by_key: dict[str, SchemaEntry] = {}
        self.by_name: dict[str, SchemaEntry] = {}
        self.title_name: str | None = None


def normalize_type(raw: str) -> str:
    return raw if raw else "unknown"


def load_schema(token: str, data_source_id: str) -> SchemaIndex:
    ds = data_sources_retrieve(token, data_source_id)
    idx = SchemaIndex()
    for name, raw in (ds.get("properties") or {}).items():
        rt = str(raw.get("type") or "")
        nt = normalize_type(rt)
        entry = SchemaEntry(name, nt, rt)
        idx.by_name[name] = entry
        idx.by_key[sanitize_key(name)] = entry
        if nt == "title":
            idx.title_name = name
    return idx


def resolve_lookup(schema: SchemaIndex, raw_key: Any) -> SchemaEntry | None:
    if not isinstance(raw_key, str) or not raw_key:
        return None
    if raw_key in schema.by_key:
        return schema.by_key[raw_key]
    if raw_key in schema.by_name:
        return schema.by_name[raw_key]
    sk = sanitize_key(raw_key)
    return schema.by_key.get(sk)


def build_filter(entry: SchemaEntry, value: Any) -> dict[str, Any] | None:
    v = "" if value is None else str(value)
    prop = entry.notion_property_name
    nt = entry.notion_type
    if nt == "title":
        return {"property": prop, "title": {"equals": v}}
    if nt == "rich_text":
        return {"property": prop, "rich_text": {"equals": v}}
    if nt == "email":
        return {"property": prop, "email": {"equals": v}}
    if nt == "phone_number":
        return {"property": prop, "phone_number": {"equals": v}}
    if nt == "url":
        return {"property": prop, "url": {"equals": v}}
    if nt == "select":
        return {"property": prop, "select": {"equals": v}}
    if nt == "status":
        return {"property": prop, "status": {"equals": v}}
    if nt == "number":
        try:
            num = float(v) if "." in v else int(v)
        except ValueError:
            return None
        return {"property": prop, "number": {"equals": num}}
    if nt == "unique_id":
        try:
            num = int(v)
        except ValueError:
            return None
        return {"property": prop, "unique_id": {"equals": num}}
    return None


def shape_property(entry: SchemaEntry, value: Any) -> Any:
    nt = entry.notion_type
    prop = entry.notion_property_name
    if nt == "title":
        return {"title": [{"text": {"content": str(value)}}]}
    if nt == "rich_text":
        return {"rich_text": [{"text": {"content": str(value)}}]}
    if nt == "email":
        return {"email": str(value)}
    if nt == "phone_number":
        return {"phone_number": str(value)}
    if nt == "url":
        return {"url": str(value)}
    if nt == "number":
        n = value if isinstance(value, (int, float)) else float(value)
        return {"number": n}
    if nt == "select":
        return {"select": {"name": str(value)}}
    if nt == "status":
        return {"status": {"name": str(value)}}
    if nt == "multi_select":
        arr = value if isinstance(value, list) else [value]
        return {"multi_select": [{"name": str(x)} for x in arr]}
    if nt == "date":
        return {"date": {"start": str(value)}}
    if nt == "checkbox":
        return {"checkbox": bool(value)}
    if nt == "people":
        arr = value if isinstance(value, list) else [value]
        return {"people": [{"object": "user", "id": str(x)} for x in arr]}
    return {"rich_text": [{"text": {"content": str(value)}}]}


def notion_properties_from(
    schema: SchemaIndex,
    args: dict[str, Any],
    exclude: set[str],
) -> dict[str, Any]:
    props: dict[str, Any] = {}
    for arg_key, arg_value in args.items():
        if arg_key in exclude:
            continue
        if arg_value is None or arg_value == "":
            continue
        entry = schema.by_key.get(arg_key) or schema.by_name.get(arg_key)
        if not entry:
            continue
        props[entry.notion_property_name] = shape_property(entry, arg_value)
    return props


def read_property_value(raw: Any, notion_type: str) -> Any:
    if not isinstance(raw, dict):
        return None
    if notion_type in ("title", "rich_text"):
        arr = raw.get(notion_type) or []
        return "".join(
            str(t.get("plain_text", "")) for t in arr if isinstance(t, dict)
        )
    if notion_type in ("email", "phone_number", "url"):
        return raw.get(notion_type)
    if notion_type == "number":
        return raw.get("number")
    if notion_type == "select":
        sel = raw.get("select") or {}
        return sel.get("name") if isinstance(sel, dict) else None
    if notion_type == "status":
        st = raw.get("status") or {}
        return st.get("name") if isinstance(st, dict) else None
    if notion_type == "multi_select":
        return [x.get("name", "") for x in (raw.get("multi_select") or []) if isinstance(x, dict)]
    if notion_type == "checkbox":
        return bool(raw.get("checkbox"))
    if notion_type == "date":
        d = raw.get("date") or {}
        return d.get("start") if isinstance(d, dict) else None
    if notion_type == "unique_id":
        u = raw.get("unique_id") or {}
        return u.get("number") if isinstance(u, dict) else None
    return None


def flatten_page(page: dict[str, Any], schema: SchemaIndex) -> dict[str, Any]:
    fields: dict[str, Any] = {}
    for name, raw in (page.get("properties") or {}).items():
        entry = schema.by_name.get(name)
        nt = entry.notion_type if entry else "unknown"
        key = (
            sanitize_key(entry.notion_property_name)
            if entry
            else sanitize_key(name)
        )
        fields[key] = read_property_value(raw, nt)
    return {"id": page.get("id"), "fields": fields}


def do_save(
    token: str,
    data_source_id: str,
    args: dict[str, Any],
    schema: SchemaIndex,
) -> dict[str, Any]:
    props = notion_properties_from(schema, args, set())
    page = pages_create(token, data_source_id=data_source_id, properties=props)
    return {"ok": True, "action": "save", "pageId": page.get("id")}


def do_find(
    token: str,
    data_source_id: str,
    args: dict[str, Any],
    schema: SchemaIndex,
) -> dict[str, Any]:
    entry = resolve_lookup(schema, args.get("lookup_field"))
    if not entry:
        return {"ok": False, "error": "Unknown lookup_field"}
    filt = build_filter(entry, args.get("lookup_value"))
    if not filt:
        return {"ok": False, "error": f"Cannot filter on {entry.notion_property_name}"}
    res = data_sources_query(token, data_source_id, filter_obj=filt, page_size=1)
    results = res.get("results") or []
    if not results:
        return {"ok": True, "action": "find", "found": False, "page": None}
    return {
        "ok": True,
        "action": "find",
        "found": True,
        "page": flatten_page(results[0], schema),
    }


def do_search(
    token: str,
    data_source_id: str,
    args: dict[str, Any],
    schema: SchemaIndex,
) -> dict[str, Any]:
    entry = resolve_lookup(schema, args.get("lookup_field"))
    if not entry:
        return {"ok": False, "error": "Unknown lookup_field"}
    filt = build_filter(entry, args.get("lookup_value"))
    if not filt:
        return {"ok": False, "error": f"Cannot filter on {entry.notion_property_name}"}
    try:
        lim = int(args.get("limit", 10))
    except (TypeError, ValueError):
        lim = 10
    lim = max(1, min(lim, 50))
    res = data_sources_query(token, data_source_id, filter_obj=filt, page_size=lim)
    results = res.get("results") or []
    return {
        "ok": True,
        "action": "search",
        "count": len(results),
        "pages": [flatten_page(r, schema) for r in results],
    }


def do_update(
    token: str,
    data_source_id: str,
    args: dict[str, Any],
    schema: SchemaIndex,
) -> dict[str, Any]:
    entry = resolve_lookup(schema, args.get("lookup_field"))
    if not entry:
        return {"ok": False, "error": "Unknown lookup_field"}
    filt = build_filter(entry, args.get("lookup_value"))
    if not filt:
        return {"ok": False, "error": f"Cannot filter on {entry.notion_property_name}"}
    res = data_sources_query(token, data_source_id, filter_obj=filt, page_size=1)
    results = res.get("results") or []
    if not results:
        return {"ok": True, "action": "update", "updated": False}
    props = notion_properties_from(
        schema,
        args,
        {"lookup_field", "lookup_value", "limit"},
    )
    if not props:
        return {"ok": False, "error": "No update fields provided"}
    updated = pages_update(
        token,
        str(results[0]["id"]),
        {"properties": props},
    )
    return {"ok": True, "action": "update", "pageId": updated.get("id"), "updated": True}


def do_delete(
    token: str,
    data_source_id: str,
    args: dict[str, Any],
    schema: SchemaIndex,
) -> dict[str, Any]:
    entry = resolve_lookup(schema, args.get("lookup_field"))
    if not entry:
        return {"ok": False, "error": "Unknown lookup_field"}
    filt = build_filter(entry, args.get("lookup_value"))
    if not filt:
        return {"ok": False, "error": f"Cannot filter on {entry.notion_property_name}"}
    res = data_sources_query(token, data_source_id, filter_obj=filt, page_size=1)
    results = res.get("results") or []
    if not results:
        return {"ok": True, "action": "delete", "archived": False}
    pid = str(results[0]["id"])
    pages_update(token, pid, {"archived": True})
    return {"ok": True, "action": "delete", "pageId": pid, "archived": True}


def _coerce_args(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _parse_one_tool_call(raw: dict[str, Any]) -> tuple[str, dict[str, Any]] | None:
    if not isinstance(raw, dict):
        return None
    tc_id = str(raw.get("id") or raw.get("toolCallId") or "")
    fn = raw.get("function") if isinstance(raw.get("function"), dict) else {}
    args_raw = (
        raw.get("arguments")
        if raw.get("arguments") is not None
        else raw.get("parameters")
        if raw.get("parameters") is not None
        else fn.get("arguments")
        if fn.get("arguments") is not None
        else fn.get("parameters")
    )
    try:
        args = _coerce_args(args_raw)
    except json.JSONDecodeError:
        return None
    if not tc_id:
        return None
    return tc_id, args


def parse_tool_call(body: dict[str, Any]) -> tuple[str, dict[str, Any]] | None:
    """
    Parse Vapi tool-calls webhook bodies.

    Supports current `message.toolCallList` (documented) and legacy
    `message.toolCalls` / OpenAI-style `function.arguments` shapes.
    """
    try:
        message = body.get("message")
        if not isinstance(message, dict):
            return None

        tool_call_list = message.get("toolCallList")
        if isinstance(tool_call_list, list) and tool_call_list:
            parsed = _parse_one_tool_call(tool_call_list[0])
            if parsed:
                return parsed

        tool_with_list = message.get("toolWithToolCallList")
        if isinstance(tool_with_list, list) and tool_with_list:
            entry = tool_with_list[0]
            if isinstance(entry, dict):
                nested = entry.get("toolCall")
                if isinstance(nested, dict):
                    parsed = _parse_one_tool_call(nested)
                    if parsed:
                        return parsed

        raw_calls = message.get("toolCalls") or message.get("tool_calls") or []
        if isinstance(raw_calls, list) and raw_calls:
            parsed = _parse_one_tool_call(raw_calls[0])
            if parsed:
                return parsed

        return None
    except Exception:
        return None
