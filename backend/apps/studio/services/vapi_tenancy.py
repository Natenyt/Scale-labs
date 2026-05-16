"""Resolve Scale Labs resource ids to Vapi ids scoped to an organization."""

from __future__ import annotations

from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.models import Organization
from apps.studio.models import Agent, Workflow
from apps.studio.serializers import _parse_ext_id


def resolve_vapi_assistant_id(
    organization: Organization,
    *,
    agent_id: str | None = None,
    assistant_id: str | None = None,
) -> str:
    """
    Return a Vapi assistant UUID for this org.

    Accept either ``agent_id`` (``ag_12``) or raw ``assistant_id`` that must match
    an Agent row on the organization.
    """
    aid = (agent_id or "").strip()
    raw = (assistant_id or "").strip()

    if aid:
        pk = _parse_ext_id("ag", aid)
        if pk is None:
            raise ValidationError({"agent_id": "Invalid agent id."})
        agent = Agent.objects.filter(organization=organization, pk=pk).first()
        if not agent:
            raise PermissionDenied("Agent not found in your organization.")
        vid = (agent.vapi_assistant_id or "").strip()
        if not vid:
            raise ValidationError(
                {"agent_id": "This agent is not linked to voice yet. Save or sync it first."},
            )
        return vid

    if raw:
        agent = Agent.objects.filter(
            organization=organization,
            vapi_assistant_id=raw,
        ).first()
        if not agent:
            raise PermissionDenied(
                "Assistant id is not registered for your organization.",
            )
        return raw

    raise ValidationError(
        {"detail": "Provide agent_id (Scale Labs) or a registered assistant_id."},
    )


def resolve_vapi_workflow_id(
    organization: Organization,
    *,
    workflow_id: str | None = None,
    vapi_workflow_id: str | None = None,
) -> str:
    """Return Vapi workflow id for this org from ``wf_*`` or stored vapi id."""
    wid = (workflow_id or "").strip()
    raw = (vapi_workflow_id or "").strip()

    if wid:
        pk = _parse_ext_id("wf", wid)
        if pk is None:
            raise ValidationError({"workflow_id": "Invalid workflow id."})
        wf = Workflow.objects.filter(organization=organization, pk=pk).first()
        if not wf:
            raise PermissionDenied("Workflow not found in your organization.")
        vid = (wf.vapi_workflow_id or "").strip()
        if not vid:
            raise ValidationError(
                {"workflow_id": "Workflow is not synced to voice yet."},
            )
        return vid

    if raw:
        wf = Workflow.objects.filter(
            organization=organization,
            vapi_workflow_id=raw,
        ).first()
        if not wf:
            raise PermissionDenied(
                "Workflow id is not registered for your organization.",
            )
        return raw

    raise ValidationError(
        {"detail": "Provide workflow_id (Scale Labs) or a registered vapi workflow id."},
    )
