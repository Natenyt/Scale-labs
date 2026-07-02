"""Org-scoped access checks for Vapi phone numbers."""
from __future__ import annotations

from typing import Any

from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import Organization
from apps.studio.services.vapi_call_access import OrgVapiResourceIds, org_vapi_resource_ids


def _str_id(row: dict[str, Any], key: str) -> str:
    return str(row.get(key) or "").strip()


def phone_number_belongs_to_org(row: dict[str, Any], ids: OrgVapiResourceIds) -> bool:
    # Ownership rows (PhoneNumber model) are authoritative: numbers created
    # through the platform are visible only to the org that created them.
    row_id = _str_id(row, "id")
    if row_id and row_id in ids.phone_number_ids:
        return True
    if row_id and row_id in ids.foreign_phone_number_ids:
        return False

    # Legacy fallback for numbers that pre-date ownership rows: infer from the
    # inbound assignment; a fully unassigned legacy number stays visible.
    assistant_id = _str_id(row, "assistantId")
    workflow_id = _str_id(row, "workflowId")
    squad_id = _str_id(row, "squadId")

    if assistant_id and assistant_id in ids.assistant_ids:
        return True
    if workflow_id and workflow_id in ids.workflow_ids:
        return True
    if not assistant_id and not workflow_id and not squad_id:
        return True
    return False


def assert_phone_number_access(organization: Organization, row: dict[str, Any]) -> None:
    ids = org_vapi_resource_ids(organization)
    if not phone_number_belongs_to_org(row, ids):
        raise PermissionDenied("Phone number is not available in your organization.")
