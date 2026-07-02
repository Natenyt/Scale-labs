"""Ownership rows must scope phone numbers to their org (cross-tenant fix)."""
from __future__ import annotations

import pytest

from apps.accounts.models import Organization
from apps.studio.models import PhoneNumber
from apps.studio.services.vapi_call_access import org_vapi_resource_ids
from apps.studio.services.vapi_phone_access import phone_number_belongs_to_org


@pytest.fixture
def org_a(db):
    return Organization.objects.create(name="Org A", slug="org-a")


@pytest.fixture
def org_b(db):
    return Organization.objects.create(name="Org B", slug="org-b")


def test_owned_number_visible_only_to_owner(org_a, org_b):
    PhoneNumber.objects.create(
        organization=org_a,
        vapi_phone_number_id="pn-1",
        number="+14155550100",
        provider="twilio",
    )
    row = {"id": "pn-1", "number": "+14155550100"}  # unassigned in Vapi

    assert phone_number_belongs_to_org(row, org_vapi_resource_ids(org_a))
    # The old behavior leaked this unassigned number to every org.
    assert not phone_number_belongs_to_org(row, org_vapi_resource_ids(org_b))


def test_legacy_unowned_unassigned_number_stays_visible(org_a):
    row = {"id": "pn-legacy"}
    assert phone_number_belongs_to_org(row, org_vapi_resource_ids(org_a))


def test_owned_number_beats_legacy_assignment_heuristic(org_a, org_b):
    # Owned by A but (stale) assigned in Vapi to an assistant B owns — the
    # ownership row wins and B still cannot see it.
    from apps.studio.models import Agent

    agent_b = Agent.objects.create(
        organization=org_b, name="B agent", vapi_assistant_id="asst-b"
    )
    PhoneNumber.objects.create(organization=org_a, vapi_phone_number_id="pn-2")
    row = {"id": "pn-2", "assistantId": agent_b.vapi_assistant_id}

    assert phone_number_belongs_to_org(row, org_vapi_resource_ids(org_a))
    assert not phone_number_belongs_to_org(row, org_vapi_resource_ids(org_b))
