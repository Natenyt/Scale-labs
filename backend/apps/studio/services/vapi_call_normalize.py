"""
Map raw Vapi call JSON to UI-friendly DTOs (no raw technical noise).
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from apps.accounts.models import Organization
from apps.studio.models import Agent, Workflow

ENDED_REASON_LABELS: dict[str, str] = {
    "customer-ended-call": "Customer ended",
    "assistant-ended-call": "Assistant ended",
    "assistant-ended-call-after-message-spoken": "Assistant ended",
    "assistant-not-valid": "Assistant unavailable",
    "assistant-did-not-receive-customer-audio": "No customer audio",
    "customer-did-not-answer": "No answer",
    "customer-busy": "Busy",
    "voicemail": "Voicemail",
    "pipeline-error": "Error",
    "exceeded-max-duration": "Max duration",
    "silence-timed-out": "Silence timeout",
    "manually-canceled": "Canceled",
}

CALL_TYPE_LABELS: dict[str, str] = {
    "webCall": "Web",
    "inboundPhoneCall": "Inbound",
    "outboundPhoneCall": "Outbound",
}

COST_TYPE_LABELS: dict[str, str] = {
    "transcriber": "Speech-to-text",
    "model": "LLM",
    "voice": "Voice",
    "vapi": "Platform",
    "transport": "Transport",
    "analysis": "Analysis",
    "voicemail-detection": "Voicemail detection",
}


def _parse_dt(value: Any) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _duration_seconds(call: dict[str, Any]) -> int | None:
    for key in ("duration", "durationSeconds"):
        v = call.get(key)
        if isinstance(v, (int, float)) and v >= 0:
            return int(v)
    started = _parse_dt(call.get("startedAt") or call.get("createdAt"))
    ended = _parse_dt(call.get("endedAt") or call.get("updatedAt"))
    if started and ended:
        return max(0, int((ended - started).total_seconds()))
    return None


def format_duration(seconds: int | None) -> str:
    if seconds is None:
        return "—"
    m, s = divmod(seconds, 60)
    if m >= 60:
        h, m = divmod(m, 60)
        return f"{h}h {m}m"
    if m > 0:
        return f"{m}m {s}s"
    return f"{s}s"


def friendly_ended_reason(raw: Any) -> str:
    key = str(raw or "").strip()
    if not key:
        return "—"
    if key in ENDED_REASON_LABELS:
        return ENDED_REASON_LABELS[key]
    return key.replace("-", " ").replace("_", " ").title()


def friendly_call_type(raw: Any) -> str:
    key = str(raw or "").strip()
    return CALL_TYPE_LABELS.get(key, key or "Call")


def _cost_amount(call: dict[str, Any]) -> float | None:
    v = call.get("cost")
    if isinstance(v, (int, float)):
        return float(v)
    return None


def _customer_number(call: dict[str, Any]) -> str:
    customer = call.get("customer")
    if isinstance(customer, dict):
        return str(customer.get("number") or "").strip()
    return ""


def _artifact(call: dict[str, Any]) -> dict[str, Any]:
    art = call.get("artifact")
    return art if isinstance(art, dict) else {}


def _resolve_resource_name(
    organization: Organization,
    *,
    assistant_id: str,
    workflow_id: str,
) -> str:
    if assistant_id:
        agent = Agent.objects.filter(
            organization=organization,
            vapi_assistant_id=assistant_id,
        ).first()
        if agent:
            return (agent.name or "").strip() or f"Agent {agent.pk}"
    if workflow_id:
        wf = Workflow.objects.filter(
            organization=organization,
            vapi_workflow_id=workflow_id,
        ).first()
        if wf:
            return (wf.name or "").strip() or f"Workflow {wf.pk}"
    return "Assistant"


def normalize_call_summary(
    call: dict[str, Any],
    organization: Organization,
) -> dict[str, Any]:
    assistant_id = str(call.get("assistantId") or "").strip()
    workflow_id = str(call.get("workflowId") or "").strip()
    cost = _cost_amount(call)
    return {
        "id": str(call.get("id") or ""),
        "startedAt": call.get("startedAt") or call.get("createdAt"),
        "type": friendly_call_type(call.get("type")),
        "typeRaw": str(call.get("type") or ""),
        "endedReason": friendly_ended_reason(call.get("endedReason")),
        "durationSeconds": _duration_seconds(call),
        "durationLabel": format_duration(_duration_seconds(call)),
        "cost": cost,
        "costLabel": f"${cost:.2f}" if cost is not None else "—",
        "resourceName": _resolve_resource_name(
            organization,
            assistant_id=assistant_id,
            workflow_id=workflow_id,
        ),
        "customerNumber": _customer_number(call),
    }


def _message_text(msg: dict[str, Any]) -> str:
    for key in ("message", "content", "text"):
        v = msg.get(key)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return ""


def _normalize_role(raw: Any) -> str:
    r = str(raw or "").lower()
    if r in ("assistant", "bot", "ai"):
        return "assistant"
    if r in ("user", "customer", "human"):
        return "user"
    return "system"


def extract_transcript(call: dict[str, Any]) -> list[dict[str, Any]]:
    art = _artifact(call)
    messages = art.get("messages")
    if not isinstance(messages, list):
        messages = call.get("messages")
    if not isinstance(messages, list):
        return []

    out: list[dict[str, Any]] = []
    for msg in messages:
        if not isinstance(msg, dict):
            continue
        text = _message_text(msg)
        if not text:
            continue
        role = _normalize_role(msg.get("role") or msg.get("type"))
        out.append(
            {
                "role": role,
                "text": text,
                "at": msg.get("time") or msg.get("timestamp") or msg.get("createdAt"),
            }
        )
    return out


def _log_message(entry: dict[str, Any]) -> str:
    for key in ("message", "title", "description", "text"):
        v = entry.get(key)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return "System event"


def extract_logs(call: dict[str, Any]) -> list[dict[str, Any]]:
    art = _artifact(call)
    raw_logs = art.get("logs") or art.get("log") or call.get("logs")
    if not isinstance(raw_logs, list):
        return []

    out: list[dict[str, Any]] = []
    for entry in raw_logs:
        if not isinstance(entry, dict):
            continue
        out.append(
            {
                "time": entry.get("time")
                or entry.get("timestamp")
                or entry.get("createdAt"),
                "level": str(entry.get("level") or entry.get("severity") or "info").lower(),
                "category": str(entry.get("category") or entry.get("type") or "Call"),
                "message": _log_message(entry),
            }
        )
    return out


def _cost_label(item: dict[str, Any]) -> str:
    t = str(item.get("type") or "").lower()
    sub = str(item.get("subType") or item.get("subtype") or "").strip()
    base = COST_TYPE_LABELS.get(t, t.replace("-", " ").title() if t else "Other")
    if sub:
        return f"{base} ({sub.replace('-', ' ')})"
    return base


def extract_cost(call: dict[str, Any]) -> dict[str, Any]:
    total = _cost_amount(call) or 0.0
    duration = _duration_seconds(call)
    breakdown = call.get("costBreakdown")
    items: list[dict[str, Any]] = []
    if isinstance(breakdown, list):
        for row in breakdown:
            if not isinstance(row, dict):
                continue
            amt = row.get("cost")
            if not isinstance(amt, (int, float)):
                continue
            amount = float(amt)
            pct = round((amount / total) * 100, 1) if total > 0 else 0.0
            items.append(
                {
                    "label": _cost_label(row),
                    "amount": amount,
                    "amountLabel": f"${amount:.2f}",
                    "percent": pct,
                }
            )
    items.sort(key=lambda x: x["amount"], reverse=True)
    return {
        "total": total,
        "totalLabel": f"${total:.2f}",
        "durationSeconds": duration,
        "durationLabel": format_duration(duration),
        "items": items,
    }


def extract_recording_url(call: dict[str, Any]) -> str | None:
    art = _artifact(call)
    for key in ("recordingUrl", "stereoRecordingUrl", "recording"):
        v = art.get(key) or call.get(key)
        if isinstance(v, str) and v.strip().startswith("http"):
            return v.strip()
    return None


def normalize_call_detail(
    call: dict[str, Any],
    organization: Organization,
) -> dict[str, Any]:
    summary = normalize_call_summary(call, organization)
    return {
        **summary,
        "recordingUrl": extract_recording_url(call),
        "transcript": extract_transcript(call),
        "logs": extract_logs(call),
        "costDetail": extract_cost(call),
    }
