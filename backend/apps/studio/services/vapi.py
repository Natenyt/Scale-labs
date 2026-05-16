from __future__ import annotations

import json
from typing import Any

import httpx
from django.conf import settings


class VapiApiError(Exception):
    def __init__(self, status: int, body: Any):
        super().__init__(f"Vapi API error ({status})")
        self.status = status
        self.body = body


BASE = "https://api.vapi.ai"


def _headers() -> dict[str, str]:
    key = (settings.VAPI_API_KEY or "").strip()
    if not key:
        raise RuntimeError("VAPI_API_KEY is not configured")
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def vapi_request(method: str, path: str, json_body: Any | None = None) -> Any:
    url = f"{BASE}{path}"
    with httpx.Client(timeout=60.0) as client:
        r = client.request(method, url, headers=_headers(), json=json_body)
    text = r.text or ""
    parsed: Any = None
    if text:
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            parsed = text
    if r.status_code == 204:
        return None
    if not r.is_success:
        raise VapiApiError(r.status_code, parsed)
    return parsed


def create_tool(payload: dict[str, Any]) -> dict[str, Any]:
    return vapi_request("POST", "/tool", payload)  # type: ignore[return-value]


def update_tool(tool_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    return vapi_request("PATCH", f"/tool/{tool_id}", payload)  # type: ignore[return-value]


def delete_tool(tool_id: str) -> None:
    vapi_request("DELETE", f"/tool/{tool_id}")


def create_workflow(payload: dict[str, Any]) -> dict[str, Any]:
    return vapi_request("POST", "/workflow", payload)  # type: ignore[return-value]


def update_workflow(wf_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    return vapi_request("PATCH", f"/workflow/{wf_id}", payload)  # type: ignore[return-value]


def delete_workflow(wf_id: str) -> None:
    vapi_request("DELETE", f"/workflow/{wf_id}")


def create_phone_call(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Outbound PSTN — POST /call (Vapi).
    Caller supplies assistantId or workflowId, phoneNumberId, customer.number, etc.
    """
    return vapi_request("POST", "/call", payload)  # type: ignore[return-value]


def create_chat(payload: dict[str, Any]) -> dict[str, Any]:
    """Text chat — POST https://api.vapi.ai/chat (assistant / previousChatId)."""
    return vapi_request("POST", "/chat", payload)  # type: ignore[return-value]


def assistant_id_from_response(res: Any) -> str:
    """Normalize id from `POST/PATCH /assistant` (top-level or nested `assistant`)."""
    if not isinstance(res, dict):
        return ""

    def _as_id(v: Any) -> str:
        if isinstance(v, str) and v.strip():
            return v.strip()
        if isinstance(v, bool):
            return ""
        if isinstance(v, int):
            return str(v)
        return ""

    rid = _as_id(res.get("id"))
    if rid:
        return rid
    inner = res.get("assistant")
    if isinstance(inner, dict):
        return _as_id(inner.get("id"))
    return ""


def create_assistant(payload: dict[str, Any]) -> dict[str, Any]:
    return vapi_request("POST", "/assistant", payload)  # type: ignore[return-value]


def update_assistant(assistant_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    return vapi_request("PATCH", f"/assistant/{assistant_id}", payload)  # type: ignore[return-value]


def delete_assistant(assistant_id: str) -> None:
    vapi_request("DELETE", f"/assistant/{assistant_id}")
