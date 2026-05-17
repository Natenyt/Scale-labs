"""Unit tests for phone number normalization."""
from __future__ import annotations

from apps.accounts.models import Organization
from apps.studio.models import Agent
from apps.studio.services.vapi_phone_access import phone_number_belongs_to_org
from apps.studio.services.vapi_call_access import org_vapi_resource_ids
from apps.studio.services.vapi_phone_normalize import (
    build_vapi_create_payload,
    friendly_provider,
    normalize_phone_number_summary,
)


def test_friendly_provider():
    assert friendly_provider("vapi") == "New number"
    assert friendly_provider("twilio") == "Twilio"


def test_build_vapi_create_payload():
    p = build_vapi_create_payload(
        provider="vapi",
        name="Support",
        area_code="415",
        assistant_id="asst-1",
    )
    assert p["provider"] == "vapi"
    assert p["numberDesiredAreaCode"] == "415"
    assert p["assistantId"] == "asst-1"


def test_phone_number_belongs_to_org(db):
    org = Organization.objects.create(name="O", slug="o")
    Agent.objects.create(
        organization=org,
        name="A",
        vapi_assistant_id="asst-1",
        config={},
    )
    ids = org_vapi_resource_ids(org)
    assert phone_number_belongs_to_org({"assistantId": "asst-1"}, ids)
    assert phone_number_belongs_to_org({}, ids)
    assert not phone_number_belongs_to_org({"assistantId": "other"}, ids)


def test_normalize_phone_number_summary(db):
    org = Organization.objects.create(name="O2", slug="o2")
    Agent.objects.create(
        organization=org,
        name="Sales",
        vapi_assistant_id="asst-2",
        config={},
    )
    row = {
        "id": "pn-1",
        "number": "+14155551234",
        "name": "Main",
        "provider": "twilio",
        "status": "active",
        "assistantId": "asst-2",
        "createdAt": "2026-05-16T00:00:00Z",
    }
    out = normalize_phone_number_summary(row, org)
    assert out["id"] == "pn-1"
    assert out["assignedType"] == "agent"
    assert "Sales" in out["assignedTo"]
