"""
Map Vapi phone number JSON to customer-friendly DTOs.
"""
from __future__ import annotations

from typing import Any

from apps.accounts.models import Organization
from apps.studio.models import Agent, Workflow
from apps.studio.services.vapi_call_normalize import _resolve_resource_name

PROVIDER_LABELS: dict[str, str] = {
    "vapi": "New number",
    "twilio": "Twilio",
    "vonage": "Vonage",
    "telnyx": "Telnyx",
    "byo-phone-number": "Your SIP line",
    "byo": "Your SIP line",
}

STATUS_LABELS: dict[str, str] = {
    "active": "Active",
    "activating": "Activating",
    "blocked": "Blocked",
}


def friendly_provider(raw: Any) -> str:
    key = str(raw or "").strip().lower()
    return PROVIDER_LABELS.get(key, key.replace("-", " ").title() if key else "Phone")


def friendly_status(raw: Any) -> str:
    key = str(raw or "").strip().lower()
    return STATUS_LABELS.get(key, key.title() if key else "—")


def _display_number(row: dict[str, Any]) -> str:
    num = str(row.get("number") or "").strip()
    if num:
        return num
    sip = str(row.get("sipUri") or "").strip()
    return sip or "—"


def _scale_labs_agent_id(organization: Organization, vapi_assistant_id: str) -> str | None:
    if not vapi_assistant_id:
        return None
    agent = Agent.objects.filter(
        organization=organization,
        vapi_assistant_id=vapi_assistant_id,
    ).first()
    if agent:
        return f"ag_{agent.pk}"
    return None


def _scale_labs_workflow_id(organization: Organization, vapi_workflow_id: str) -> str | None:
    if not vapi_workflow_id:
        return None
    wf = Workflow.objects.filter(
        organization=organization,
        vapi_workflow_id=vapi_workflow_id,
    ).first()
    if wf:
        return f"wf_{wf.pk}"
    return None


def normalize_phone_number_summary(
    row: dict[str, Any],
    organization: Organization,
) -> dict[str, Any]:
    assistant_id = str(row.get("assistantId") or "").strip()
    workflow_id = str(row.get("workflowId") or "").strip()
    assigned_type = "none"
    assigned_to = "Not assigned"
    assign_agent_record_id: str | None = None
    assign_workflow_record_id: str | None = None
    if assistant_id:
        assigned_type = "agent"
        assigned_to = _resolve_resource_name(
            organization,
            assistant_id=assistant_id,
            workflow_id="",
        )
        assign_agent_record_id = _scale_labs_agent_id(organization, assistant_id)
    elif workflow_id:
        assigned_type = "workflow"
        assigned_to = _resolve_resource_name(
            organization,
            assistant_id="",
            workflow_id=workflow_id,
        )
        assign_workflow_record_id = _scale_labs_workflow_id(organization, workflow_id)

    return {
        "id": str(row.get("id") or ""),
        "number": _display_number(row),
        "name": str(row.get("name") or "").strip() or "Unnamed",
        "provider": str(row.get("provider") or ""),
        "providerLabel": friendly_provider(row.get("provider")),
        "status": str(row.get("status") or ""),
        "statusLabel": friendly_status(row.get("status")),
        "assignedType": assigned_type,
        "assignedTo": assigned_to,
        "assistantId": assistant_id or None,
        "workflowId": workflow_id or None,
        "assignAgentId": assign_agent_record_id,
        "assignWorkflowId": assign_workflow_record_id,
        "createdAt": row.get("createdAt"),
        "updatedAt": row.get("updatedAt"),
    }


def normalize_phone_number_detail(
    row: dict[str, Any],
    organization: Organization,
) -> dict[str, Any]:
    return normalize_phone_number_summary(row, organization)


def build_vapi_create_payload(
    *,
    provider: str,
    name: str = "",
    area_code: str = "",
    number: str = "",
    twilio_account_sid: str = "",
    twilio_auth_token: str = "",
    credential_id: str = "",
    sip_uri: str = "",
    assistant_id: str | None = None,
    workflow_id: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"provider": provider}
    if name.strip():
        payload["name"] = name.strip()
    if assistant_id:
        payload["assistantId"] = assistant_id
    if workflow_id:
        payload["workflowId"] = workflow_id

    prov = provider.strip().lower()
    if prov == "vapi":
        if area_code.strip():
            payload["numberDesiredAreaCode"] = area_code.strip()
        return payload
    if prov == "twilio":
        payload["number"] = number.strip()
        payload["twilioAccountSid"] = twilio_account_sid.strip()
        payload["twilioAuthToken"] = twilio_auth_token.strip()
        return payload
    if prov == "vonage":
        payload["number"] = number.strip()
        payload["credentialId"] = credential_id.strip()
        return payload
    if prov == "telnyx":
        payload["number"] = number.strip()
        payload["credentialId"] = credential_id.strip()
        return payload
    if prov in ("byo", "byo-phone-number"):
        payload["provider"] = "byo-phone-number"
        if sip_uri.strip():
            payload["sipUri"] = sip_uri.strip()
        if number.strip():
            payload["number"] = number.strip()
        return payload
    raise ValueError(f"Unsupported provider: {provider}")


def build_vapi_update_payload(
    *,
    name: str | None = None,
    assistant_id: str | None = None,
    workflow_id: str | None = None,
    clear_assignment: bool = False,
) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    if name is not None:
        payload["name"] = name.strip()
    if clear_assignment:
        payload["assistantId"] = None
        payload["workflowId"] = None
    elif workflow_id:
        payload["workflowId"] = workflow_id
        payload["assistantId"] = None
    elif assistant_id:
        payload["assistantId"] = assistant_id
        payload["workflowId"] = None
    return payload
