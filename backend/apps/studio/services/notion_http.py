"""
Minimal Notion REST client (data sources API) using httpx.
Matches Notion-Version used by the Next.js frontend (2025-09-03).
"""
from __future__ import annotations

import json
from typing import Any

import httpx

NOTION_VERSION = "2025-09-03"
BASE = "https://api.notion.com/v1"


def _headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def data_sources_retrieve(token: str, data_source_id: str) -> dict[str, Any]:
    with httpx.Client(timeout=60.0) as client:
        r = client.get(
            f"{BASE}/data_sources/{data_source_id}",
            headers=_headers(token),
        )
    r.raise_for_status()
    return r.json()


def data_sources_query(
    token: str,
    data_source_id: str,
    *,
    filter_obj: dict[str, Any] | None = None,
    page_size: int = 10,
) -> dict[str, Any]:
    body: dict[str, Any] = {"page_size": page_size}
    if filter_obj is not None:
        body["filter"] = filter_obj
    with httpx.Client(timeout=60.0) as client:
        r = client.post(
            f"{BASE}/data_sources/{data_source_id}/query",
            headers=_headers(token),
            content=json.dumps(body),
        )
    r.raise_for_status()
    return r.json()


def pages_create(
    token: str,
    *,
    data_source_id: str,
    properties: dict[str, Any],
) -> dict[str, Any]:
    payload = {
        "parent": {"type": "data_source_id", "data_source_id": data_source_id},
        "properties": properties,
    }
    with httpx.Client(timeout=60.0) as client:
        r = client.post(
            f"{BASE}/pages",
            headers=_headers(token),
            content=json.dumps(payload),
        )
    r.raise_for_status()
    return r.json()


def pages_update(token: str, page_id: str, body: dict[str, Any]) -> dict[str, Any]:
    with httpx.Client(timeout=60.0) as client:
        r = client.patch(
            f"{BASE}/pages/{page_id}",
            headers=_headers(token),
            content=json.dumps(body),
        )
    r.raise_for_status()
    return r.json()
