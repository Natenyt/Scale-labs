"""Tests for Vapi call → UI DTO normalization."""
from __future__ import annotations

from apps.accounts.models import Organization
from apps.studio.models import Agent
from apps.studio.services.vapi_call_normalize import (
    extract_cost,
    extract_logs,
    extract_transcript,
    normalize_call_summary,
)


def test_normalize_call_summary_basic(db):
    org = Organization.objects.create(name="Org", slug="org-norm")
    Agent.objects.create(
        organization=org,
        name="Support Bot",
        vapi_assistant_id="asst-123",
        config={},
    )
    call = {
        "id": "call-abc",
        "type": "webCall",
        "createdAt": "2026-05-16T18:53:00.000Z",
        "endedReason": "customer-ended-call",
        "cost": 0.08,
        "assistantId": "asst-123",
        "customer": {"number": "+15551234567"},
        "startedAt": "2026-05-16T18:52:00.000Z",
        "endedAt": "2026-05-16T18:53:01.000Z",
    }
    row = normalize_call_summary(call, org)
    assert row["id"] == "call-abc"
    assert row["type"] == "Web"
    assert row["endedReason"] == "Customer ended"
    assert row["costLabel"] == "$0.08"
    assert row["resourceName"] == "Support Bot"
    assert row["customerNumber"] == "+15551234567"


def test_extract_transcript_from_artifact_messages():
    call = {
        "artifact": {
            "messages": [
                {"role": "assistant", "message": "Hello, how can I help?"},
                {"role": "user", "message": "I need to book an appointment."},
            ]
        }
    }
    lines = extract_transcript(call)
    assert len(lines) == 2
    assert lines[0]["role"] == "assistant"
    assert "Hello" in lines[0]["text"]


def test_extract_logs_human_message_only():
    call = {
        "artifact": {
            "logs": [
                {
                    "time": "2026-05-16T18:53:36.396Z",
                    "level": "info",
                    "category": "Transcriber",
                    "message": "Deepgram WebSocket connected",
                    "raw": {"orgId": "secret", "nested": True},
                }
            ]
        }
    }
    logs = extract_logs(call)
    assert len(logs) == 1
    assert logs[0]["message"] == "Deepgram WebSocket connected"
    assert "orgId" not in logs[0]["message"]


def test_extract_cost_breakdown():
    call = {
        "cost": 0.08,
        "costBreakdown": [
            {"type": "vapi", "cost": 0.05},
            {"type": "voice", "cost": 0.02},
            {"type": "transcriber", "cost": 0.01},
        ],
        "startedAt": "2026-05-16T18:52:00.000Z",
        "endedAt": "2026-05-16T18:53:01.000Z",
    }
    cost = extract_cost(call)
    assert cost["total"] == 0.08
    assert len(cost["items"]) == 3
    assert cost["items"][0]["label"] == "Platform"
