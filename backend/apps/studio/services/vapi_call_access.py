"""Org-scoped access checks for Vapi call resources."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import Organization
from apps.studio.models import Agent, Workflow


@dataclass(frozen=True)
class OrgVapiResourceIds:
    assistant_ids: frozenset[str]
    workflow_ids: frozenset[str]


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

    return OrgVapiResourceIds(
        assistant_ids=frozenset(assistant_ids),
        workflow_ids=frozenset(workflow_ids),
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
