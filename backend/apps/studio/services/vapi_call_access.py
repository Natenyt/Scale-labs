"""Org-scoped access checks for Vapi call resources."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import Organization
from apps.studio.models import Agent, PhoneNumber, Workflow


@dataclass(frozen=True)
class OrgVapiResourceIds:
    assistant_ids: frozenset[str]
    workflow_ids: frozenset[str]
    # Vapi phone-number ids OWNED by this org (via the PhoneNumber row).
    phone_number_ids: frozenset[str] = frozenset()
    # Vapi phone-number ids owned by OTHER orgs — always invisible here.
    foreign_phone_number_ids: frozenset[str] = frozenset()


def org_vapi_resource_ids(organization: Organization) -> OrgVapiResourceIds:
    assistant_ids: set[str] = set()
    for vid in Agent.objects.filter(organization=organization).values_list(
        "vapi_assistant_id",
        flat=True,
    ):
        s = (vid or "").strip()
        if s:
            assistant_ids.add(s)

    workflow_ids: set[str] = set()
    for vid in Workflow.objects.filter(organization=organization).values_list(
        "vapi_workflow_id",
        flat=True,
    ):
        s = (vid or "").strip()
        if s:
            workflow_ids.add(s)

    phone_ids: set[str] = set()
    foreign_phone_ids: set[str] = set()
    for vid, org_id in PhoneNumber.objects.values_list(
        "vapi_phone_number_id",
        "organization_id",
    ):
        s = (vid or "").strip()
        if not s:
            continue
        if org_id == organization.pk:
            phone_ids.add(s)
        else:
            foreign_phone_ids.add(s)

    return OrgVapiResourceIds(
        assistant_ids=frozenset(assistant_ids),
        workflow_ids=frozenset(workflow_ids),
        phone_number_ids=frozenset(phone_ids),
        foreign_phone_number_ids=frozenset(foreign_phone_ids),
    )


def call_belongs_to_org(call: dict[str, Any], ids: OrgVapiResourceIds) -> bool:
    aid = str(call.get("assistantId") or "").strip()
    if aid and aid in ids.assistant_ids:
        return True
    wid = str(call.get("workflowId") or "").strip()
    if wid and wid in ids.workflow_ids:
        return True
    return False


def assert_call_access(organization: Organization, call: dict[str, Any]) -> None:
    ids = org_vapi_resource_ids(organization)
    if not call_belongs_to_org(call, ids):
        raise PermissionDenied("Call is not available in your organization.")
