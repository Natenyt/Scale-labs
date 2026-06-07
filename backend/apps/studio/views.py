from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone as dt_timezone
from typing import Any

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.studio.mixins import ExternalIdLookupMixin
from apps.studio.models import Agent, Call, CallEvent, CallDirection, CallStatus, NotionIntegration, Workflow
from apps.studio.permissions import HasActiveOrganization
from apps.studio.serializers import (
    AgentSerializer,
    AssistantChatSerializer,
    CallSerializer,
    NotionIntegrationSerializer,
    OutboundCallSerializer,
    PhoneNumberCreateSerializer,
    PhoneNumberUpdateSerializer,
    WebCallConfigSerializer,
    WorkflowSerializer,
    _parse_ext_id,
)
from apps.studio.services import vapi as vapi_service
from apps.studio.services.agent_assistant import build_vapi_assistant_payload
from apps.studio.services.vapi_tenancy import (
    resolve_vapi_assistant_id,
    resolve_vapi_workflow_id,
)
from apps.studio.services.crypto import decrypt_str, encrypt_str
from apps.studio.services.notion_tool_builder import NOTION_TOOL_KINDS
from apps.studio.services.notion_webhook_handlers import (
    do_delete,
    do_find,
    do_save,
    do_search,
    do_update,
    load_schema,
    parse_tool_call,
)
from apps.studio.services.vapi_call_access import (
    assert_call_access,
    call_belongs_to_org,
    org_vapi_resource_ids,
)
from apps.studio.services.vapi_call_normalize import (
    normalize_call_detail,
    normalize_call_summary,
)
from apps.studio.services.vapi_metrics import (
    build_metrics_dashboard,
    empty_metrics_dashboard,
)
from apps.studio.services.vapi_call_access import org_vapi_resource_ids
from apps.studio.services.vapi_phone_access import (
    assert_phone_number_access,
    phone_number_belongs_to_org,
)
from apps.studio.services.vapi_phone_normalize import (
    build_vapi_create_payload,
    build_vapi_update_payload,
    normalize_phone_number_detail,
    normalize_phone_number_summary,
)
from apps.studio.services.vapi_webhook_auth import verify_vapi_webhook_secret

logger = logging.getLogger("apps.studio.webhooks")


def _upsert_vapi_assistant(agent: Agent, payload: dict) -> tuple[str, Any]:
    """Create or update the agent's Vapi assistant, self-healing a stale id.

    Returns (assistant_id, vapi_response). If the stored ``vapi_assistant_id``
    no longer exists on Vapi (404 — e.g. after a Vapi API-key/account rotation
    or a manual delete on the Vapi dashboard), a fresh assistant is created and
    persisted instead of failing. Without this, a PATCH to the dead id 404s
    forever and the agent can never be called again.
    """
    vid = (agent.vapi_assistant_id or "").strip()
    if vid:
        try:
            res = vapi_service.update_assistant(vid, payload)
            return vid, res
        except vapi_service.VapiApiError as e:
            if e.status != 404:
                raise
            # Stale assistant id — fall through and recreate.
    res = vapi_service.create_assistant(payload)
    new_id = vapi_service.assistant_id_from_response(res)
    if not new_id:
        raise vapi_service.VapiApiError(
            502, {"error": "Vapi did not return an assistant id.", "vapi": res}
        )
    agent.vapi_assistant_id = new_id
    agent.save(update_fields=["vapi_assistant_id", "updated_at"])
    return new_id, res


class AgentViewSet(ExternalIdLookupMixin, viewsets.ModelViewSet):
    serializer_class = AgentSerializer
    permission_classes = [IsAuthenticated, HasActiveOrganization]
    ext_prefix = "ag"

    def get_queryset(self):
        return Agent.objects.filter(organization=self.request.organization)

    def perform_create(self, serializer) -> None:
        if not (settings.VAPI_API_KEY or "").strip():
            raise ValidationError(
                {
                    "detail": "VAPI_API_KEY is not configured on the server; cannot create a Vapi assistant.",
                },
            )
        name = serializer.validated_data["name"]
        raw_config = serializer.validated_data.get("config") or {}
        config: dict = raw_config if isinstance(raw_config, dict) else {}
        payload = build_vapi_assistant_payload(name, config)
        with transaction.atomic():
            try:
                res = vapi_service.create_assistant(payload)
            except vapi_service.VapiApiError as e:
                raise ValidationError({"vapi": e.body}) from e
            except RuntimeError as e:
                raise ValidationError({"detail": str(e)}) from e
            vid = vapi_service.assistant_id_from_response(res)
            if not vid:
                raise ValidationError({"vapi": "Vapi did not return an assistant id."})
            serializer.save(vapi_assistant_id=vid)

    @action(detail=True, methods=["post"], url_path="sync-vapi")
    def sync_vapi(self, request: Request, pk=None):
        """Push current name/config to Vapi (create assistant if missing, else PATCH)."""
        agent = self.get_object()
        if not (settings.VAPI_API_KEY or "").strip():
            return Response(
                {"error": "VAPI_API_KEY is not configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        payload = build_vapi_assistant_payload(
            agent.name,
            agent.config if isinstance(agent.config, dict) else {},
        )
        try:
            vid, res = _upsert_vapi_assistant(agent, payload)
            return Response({"ok": True, "vapiAssistantId": vid, "vapi": res})
        except vapi_service.VapiApiError as e:
            return Response(
                {"error": "Vapi API error", "detail": e.body},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    def perform_update(self, serializer) -> None:
        agent = serializer.save()
        if not (settings.VAPI_API_KEY or "").strip():
            return
        payload = build_vapi_assistant_payload(
            agent.name,
            agent.config if isinstance(agent.config, dict) else {},
        )
        try:
            _upsert_vapi_assistant(agent, payload)
        except vapi_service.VapiApiError as e:
            raise ValidationError({"vapi": e.body}) from e

    def perform_destroy(self, instance: Agent) -> None:
        vid = (instance.vapi_assistant_id or "").strip()
        if vid and (settings.VAPI_API_KEY or "").strip():
            try:
                vapi_service.delete_assistant(vid)
            except vapi_service.VapiApiError:
                pass
        super().perform_destroy(instance)


class WorkflowViewSet(ExternalIdLookupMixin, viewsets.ModelViewSet):
    serializer_class = WorkflowSerializer
    permission_classes = [IsAuthenticated, HasActiveOrganization]
    ext_prefix = "wf"

    def get_queryset(self):
        return Workflow.objects.filter(organization=self.request.organization)

    def perform_destroy(self, instance: Workflow) -> None:
        vid = (instance.vapi_workflow_id or "").strip()
        if vid:
            try:
                vapi_service.delete_workflow(vid)
            except vapi_service.VapiApiError:
                pass  # best-effort remote cleanup; always delete the row
        super().perform_destroy(instance)

    @action(detail=True, methods=["post"], url_path="sync-vapi")
    def sync_vapi(self, request: Request, pk=None):
        """
        Body: { "vapi_payload": { "name", "nodes", "edges", "globalPrompt"? }, "vapi_workflow_id"? }
        Client may compile using the same rules as Next.js; server forwards to Vapi.
        """
        wf = self.get_object()
        body = request.data
        payload = body.get("vapi_payload")
        if not isinstance(payload, dict):
            return Response(
                {"error": "vapi_payload object required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        vid = body.get("vapi_workflow_id") or wf.vapi_workflow_id
        try:
            if vid:
                try:
                    res = vapi_service.update_workflow(str(vid), payload)
                except vapi_service.VapiApiError as e:
                    if e.status == 404:
                        res = vapi_service.create_workflow(payload)
                    else:
                        raise
            else:
                res = vapi_service.create_workflow(payload)
        except vapi_service.VapiApiError as e:
            return Response(
                {"error": "Vapi API error", "detail": e.body},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except RuntimeError as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        new_id = str(res.get("id", ""))
        wf.vapi_workflow_id = new_id
        wf.save(update_fields=["vapi_workflow_id", "updated_at"])
        return Response({"ok": True, "vapiWorkflowId": new_id, "vapi": res})


class NotionIntegrationViewSet(ExternalIdLookupMixin, viewsets.ModelViewSet):
    serializer_class = NotionIntegrationSerializer
    permission_classes = [IsAuthenticated, HasActiveOrganization]
    ext_prefix = "notion"

    def get_queryset(self):
        return NotionIntegration.objects.filter(organization=self.request.organization)

    def perform_destroy(self, instance: NotionIntegration) -> None:
        for ref in instance.vapi_tools or []:
            tid = ref.get("id") if isinstance(ref, dict) else None
            if not tid:
                continue
            try:
                vapi_service.delete_tool(str(tid))
            except vapi_service.VapiApiError:
                pass  # best-effort; matches Next.js DELETE swallowing 404
        super().perform_destroy(instance)

    @action(detail=True, methods=["post", "delete"], url_path="sync-tools")
    def sync_tools(self, request: Request, pk=None):
        integration = self.get_object()
        if request.method == "DELETE":
            body = request.data if isinstance(request.data, dict) else {}
            refs = body.get("vapiTools") or []
            errors: list[dict[str, str]] = []
            for ref in refs:
                if not isinstance(ref, dict):
                    continue
                tid = ref.get("id")
                if not tid:
                    continue
                try:
                    vapi_service.delete_tool(str(tid))
                except vapi_service.VapiApiError as e:
                    if e.status != 404:
                        errors.append({"id": str(tid), "error": str(e)})
                except Exception as e:  # noqa: BLE001
                    errors.append({"id": str(tid), "error": str(e)})
            return Response({"ok": len(errors) == 0, "errors": errors})

        body = request.data if isinstance(request.data, dict) else {}
        # Allow the same JSON shape the Next.js route accepted: merge before sync.
        if "label" in body and isinstance(body["label"], str):
            integration.label = body["label"].strip() or integration.label
        if "databaseId" in body and isinstance(body["databaseId"], str):
            integration.database_id = body["databaseId"].strip()
        if "dataSourceId" in body and isinstance(body["dataSourceId"], str):
            integration.data_source_id = body["dataSourceId"].strip()
        if "fieldMap" in body and isinstance(body["fieldMap"], list):
            integration.field_mappings = body["fieldMap"]
        if "token" in body and isinstance(body["token"], str) and body["token"].strip():
            integration.token_ciphertext = encrypt_str(body["token"].strip())
        if any(
            k in body
            for k in ("label", "databaseId", "dataSourceId", "fieldMap", "token")
        ):
            integration.save()
        from config.vapi_webhook import is_local_webhook_base

        base = (settings.VAPI_WEBHOOK_BASE or "").strip().rstrip("/")
        secret = (settings.VAPI_SHARED_SECRET or "").strip()
        if not secret:
            return Response(
                {"error": "VAPI_SHARED_SECRET must be configured"},
                status=status.HTTP_412_PRECONDITION_FAILED,
            )
        if not base:
            return Response(
                {
                    "error": (
                        "VAPI_WEBHOOK_BASE is not configured. Set it to your public API URL "
                        "(https). In local dev, run ngrok on port 3000 and set "
                        "DEV_PUBLIC_ORIGIN to that URL, or point VAPI_WEBHOOK_BASE at an API tunnel."
                    ),
                    "code": "vapi_webhook_base_missing",
                },
                status=status.HTTP_412_PRECONDITION_FAILED,
            )
        if is_local_webhook_base(base):
            return Response(
                {
                    "error": (
                        f"Vapi cannot reach {base} — use a public https URL. "
                        "Set VAPI_WEBHOOK_BASE to your deployed API or set DEV_PUBLIC_ORIGIN "
                        "to your ngrok URL (Next.js proxies /api/v1/webhooks/ to Django)."
                    ),
                    "code": "vapi_webhook_base_not_public",
                },
                status=status.HTTP_412_PRECONDITION_FAILED,
            )
        try:
            token = decrypt_str(bytes(integration.token_ciphertext))
        except Exception as exc:
            return Response(
                {"error": "Could not decrypt Notion token", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        from apps.studio.services.notion_tool_builder import build_notion_tool_payloads

        integ_dict = {
            "id": str(integration.pk),
            "label": integration.label,
            "databaseId": integration.database_id,
            "dataSourceId": integration.data_source_id,
            "databaseTitle": "",
            "fieldMap": integration.field_mappings or [],
        }
        built = build_notion_tool_payloads(
            integ_dict,
            webhook_base=base,
            shared_secret=secret,
            notion_token=token,
        )
        existing = {t.get("kind"): t for t in (integration.vapi_tools or [])}
        results: list[dict[str, Any]] = []
        errors: list[dict[str, str]] = []
        for tool in built:
            kind = tool["kind"]
            prior = existing.get(kind)
            payload = tool["payload"]
            try:
                if prior and prior.get("id"):
                    try:
                        resp = vapi_service.update_tool(str(prior["id"]), payload)
                    except vapi_service.VapiApiError as e:
                        if e.status == 404:
                            resp = vapi_service.create_tool(payload)
                        else:
                            raise
                else:
                    resp = vapi_service.create_tool(payload)
                results.append(
                    {
                        "kind": kind,
                        "id": resp.get("id"),
                        "functionName": tool["functionName"],
                        "lastSyncedAt": None,
                    }
                )
            except Exception as e:  # noqa: BLE001
                errors.append({"kind": kind, "error": str(e)})
        integration.vapi_tools = results
        integration.save(update_fields=["vapi_tools", "updated_at"])
        return Response({"ok": len(errors) == 0, "vapiTools": results, "errors": errors})


class CallLogsListView(APIView):
    """Org-scoped call log list from Vapi GET /call."""

    permission_classes = [IsAuthenticated, HasActiveOrganization]

    def get(self, request: Request):
        org = request.organization
        _max_days = settings.VAPI_MAX_HISTORY_DAYS
        try:
            days = max(1, min(_max_days, int(request.query_params.get("days", 7))))
        except (TypeError, ValueError):
            days = min(7, _max_days)
        try:
            limit = max(1, min(100, int(request.query_params.get("limit", 50))))
        except (TypeError, ValueError):
            limit = 50

        since = datetime.now(dt_timezone.utc) - timedelta(days=days)
        query: dict[str, Any] = {
            "createdAtGe": since.isoformat().replace("+00:00", "Z"),
            "limit": limit,
        }

        agent_ext = (request.query_params.get("agent_id") or "").strip()
        if agent_ext:
            pk = _parse_ext_id("ag", agent_ext)
            if pk is None:
                return Response({"error": "Invalid agent_id"}, status=400)
            agent = Agent.objects.filter(organization=org, pk=pk).first()
            if not agent or not (agent.vapi_assistant_id or "").strip():
                return Response({"results": []})
            query["assistantId"] = agent.vapi_assistant_id.strip()

        try:
            raw_calls = vapi_service.list_calls(**query)
        except vapi_service.VapiApiError as e:
            return Response(
                {"error": "Vapi API error", "detail": e.body},
                status=e.status,
            )
        except RuntimeError as e:
            return Response({"error": str(e)}, status=500)

        ids = org_vapi_resource_ids(org)
        filtered = [c for c in raw_calls if call_belongs_to_org(c, ids)]

        summaries = [normalize_call_summary(c, org) for c in filtered]
        summaries.sort(
            key=lambda row: row.get("startedAt") or "",
            reverse=True,
        )
        return Response({"results": summaries[:limit]})


class CallLogDetailView(APIView):
    """Single call detail for transcripts, logs, and cost tabs."""

    permission_classes = [IsAuthenticated, HasActiveOrganization]

    def get(self, request: Request, vapi_call_id: str):
        org = request.organization
        call_id = (vapi_call_id or "").strip()
        if not call_id:
            return Response({"error": "Missing call id"}, status=400)
        try:
            raw = vapi_service.get_call(call_id)
        except vapi_service.VapiApiError as e:
            if e.status == 404:
                return Response({"error": "Call not found"}, status=404)
            return Response(
                {"error": "Vapi API error", "detail": e.body},
                status=e.status,
            )
        except RuntimeError as e:
            return Response({"error": str(e)}, status=500)

        if not raw:
            return Response({"error": "Call not found"}, status=404)
        from rest_framework.exceptions import PermissionDenied

        try:
            assert_call_access(org, raw)
        except PermissionDenied:
            return Response(
                {"error": "Call is not available in your organization."},
                status=403,
            )
        return Response(normalize_call_detail(raw, org))


def _metrics_cache_key(
    org_id: int,
    days: int,
    step: str,
    agent_ext: str,
) -> str:
    agent_part = agent_ext.strip() if agent_ext else "all"
    return f"metrics:{org_id}:{days}:{step}:{agent_part}"


class MetricsDashboardView(APIView):
    """Org-scoped metrics from Vapi analytics + call aggregation."""

    permission_classes = [IsAuthenticated, HasActiveOrganization]

    def get(self, request: Request):
        org = request.organization
        _max_days = settings.VAPI_MAX_HISTORY_DAYS
        try:
            days = max(1, min(_max_days, int(request.query_params.get("days", _max_days))))
        except (TypeError, ValueError):
            days = _max_days
        step = (request.query_params.get("step") or "day").strip().lower()
        if step not in ("day", "week"):
            step = "day"

        fresh = (request.query_params.get("fresh") or "").strip().lower() in (
            "1",
            "true",
            "yes",
        )
        agent_ext = (request.query_params.get("agent_id") or "").strip()

        filter_vapi_assistant_id: str | None = None
        if agent_ext:
            pk = _parse_ext_id("ag", agent_ext)
            if pk is None:
                return Response({"error": "Invalid agent_id"}, status=400)
            agent = Agent.objects.filter(organization=org, pk=pk).first()
            if not agent or not (agent.vapi_assistant_id or "").strip():
                return Response(empty_metrics_dashboard(days=days, step=step))
            filter_vapi_assistant_id = agent.vapi_assistant_id.strip()

        cache_key = _metrics_cache_key(org.id, days, step, agent_ext)
        if not fresh:
            cached = cache.get(cache_key)
            if cached is not None:
                return Response(cached)

        try:
            data = build_metrics_dashboard(
                org,
                days=days,
                step=step,
                filter_vapi_assistant_id=filter_vapi_assistant_id,
            )
        except vapi_service.VapiApiError as e:
            return Response(
                {"error": "Vapi API error", "detail": e.body},
                status=e.status,
            )
        except RuntimeError as e:
            return Response({"error": str(e)}, status=500)

        if not fresh:
            cache.set(cache_key, data, settings.METRICS_CACHE_TTL_SECONDS)

        return Response(data)


class PhoneNumberListCreateView(APIView):
    """List and create org-visible Vapi phone numbers."""

    permission_classes = [IsAuthenticated, HasActiveOrganization]

    def get(self, request: Request):
        org = request.organization
        try:
            raw = vapi_service.list_phone_numbers()
        except vapi_service.VapiApiError as e:
            return Response(
                {"error": "Vapi API error", "detail": e.body},
                status=e.status,
            )
        except RuntimeError as e:
            return Response({"error": str(e)}, status=500)

        ids = org_vapi_resource_ids(org)
        filtered = [r for r in raw if phone_number_belongs_to_org(r, ids)]
        results = [normalize_phone_number_summary(r, org) for r in filtered]
        results.sort(key=lambda row: row.get("createdAt") or "", reverse=True)
        return Response({"results": results})

    def post(self, request: Request):
        ser = PhoneNumberCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        org = request.organization
        data = ser.validated_data

        assistant_id: str | None = None
        workflow_id: str | None = None
        if (data.get("assign_agent_id") or "").strip():
            assistant_id = resolve_vapi_assistant_id(
                org,
                agent_id=data.get("assign_agent_id"),
            )
        elif (data.get("assign_workflow_id") or "").strip():
            workflow_id = resolve_vapi_workflow_id(
                org,
                workflow_id=data.get("assign_workflow_id"),
            )

        try:
            vapi_payload = build_vapi_create_payload(
                provider=data["provider"],
                name=data.get("name") or "",
                area_code=data.get("area_code") or "",
                number=data.get("number") or "",
                twilio_account_sid=data.get("twilio_account_sid") or "",
                twilio_auth_token=data.get("twilio_auth_token") or "",
                credential_id=data.get("credential_id") or "",
                sip_uri=data.get("sip_uri") or "",
                assistant_id=assistant_id,
                workflow_id=workflow_id,
            )
            raw = vapi_service.create_phone_number(vapi_payload)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        except vapi_service.VapiApiError as e:
            return Response(
                {"error": "Vapi API error", "detail": e.body},
                status=e.status,
            )
        except RuntimeError as e:
            return Response({"error": str(e)}, status=500)

        return Response(
            normalize_phone_number_detail(raw, org),
            status=201,
        )


class PhoneNumberDetailView(APIView):
    permission_classes = [IsAuthenticated, HasActiveOrganization]

    def get(self, request: Request, phone_number_id: str):
        org = request.organization
        pid = (phone_number_id or "").strip()
        if not pid:
            return Response({"error": "Missing phone number id"}, status=400)
        try:
            raw = vapi_service.get_phone_number(pid)
        except vapi_service.VapiApiError as e:
            if e.status == 404:
                return Response({"error": "Phone number not found"}, status=404)
            return Response(
                {"error": "Vapi API error", "detail": e.body},
                status=e.status,
            )
        except RuntimeError as e:
            return Response({"error": str(e)}, status=500)

        if not raw:
            return Response({"error": "Phone number not found"}, status=404)
        from rest_framework.exceptions import PermissionDenied

        try:
            assert_phone_number_access(org, raw)
        except PermissionDenied:
            return Response(
                {"error": "Phone number is not available in your organization."},
                status=403,
            )
        return Response(normalize_phone_number_detail(raw, org))

    def patch(self, request: Request, phone_number_id: str):
        ser = PhoneNumberUpdateSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        org = request.organization
        pid = (phone_number_id or "").strip()
        data = ser.validated_data

        try:
            existing = vapi_service.get_phone_number(pid)
        except vapi_service.VapiApiError as e:
            if e.status == 404:
                return Response({"error": "Phone number not found"}, status=404)
            return Response(
                {"error": "Vapi API error", "detail": e.body},
                status=e.status,
            )
        except RuntimeError as e:
            return Response({"error": str(e)}, status=500)

        from rest_framework.exceptions import PermissionDenied

        try:
            assert_phone_number_access(org, existing)
        except PermissionDenied:
            return Response(
                {"error": "Phone number is not available in your organization."},
                status=403,
            )

        assistant_id: str | None = None
        workflow_id: str | None = None
        clear = bool(data.get("clear_assignment"))
        if not clear:
            if (data.get("assign_agent_id") or "").strip():
                assistant_id = resolve_vapi_assistant_id(
                    org,
                    agent_id=data.get("assign_agent_id"),
                )
            elif (data.get("assign_workflow_id") or "").strip():
                workflow_id = resolve_vapi_workflow_id(
                    org,
                    workflow_id=data.get("assign_workflow_id"),
                )

        patch_payload = build_vapi_update_payload(
            name=data.get("name") if "name" in data else None,
            assistant_id=assistant_id,
            workflow_id=workflow_id,
            clear_assignment=clear,
        )
        if not patch_payload:
            return Response(normalize_phone_number_detail(existing, org))

        try:
            raw = vapi_service.update_phone_number(pid, patch_payload)
        except vapi_service.VapiApiError as e:
            return Response(
                {"error": "Vapi API error", "detail": e.body},
                status=e.status,
            )
        except RuntimeError as e:
            return Response({"error": str(e)}, status=500)

        return Response(normalize_phone_number_detail(raw, org))

    def delete(self, request: Request, phone_number_id: str):
        org = request.organization
        pid = (phone_number_id or "").strip()
        try:
            existing = vapi_service.get_phone_number(pid)
        except vapi_service.VapiApiError as e:
            if e.status == 404:
                return Response({"error": "Phone number not found"}, status=404)
            return Response(
                {"error": "Vapi API error", "detail": e.body},
                status=e.status,
            )
        except RuntimeError as e:
            return Response({"error": str(e)}, status=500)

        from rest_framework.exceptions import PermissionDenied

        try:
            assert_phone_number_access(org, existing)
        except PermissionDenied:
            return Response(
                {"error": "Phone number is not available in your organization."},
                status=403,
            )

        try:
            vapi_service.delete_phone_number(pid)
        except vapi_service.VapiApiError as e:
            return Response(
                {"error": "Vapi API error", "detail": e.body},
                status=e.status,
            )
        except RuntimeError as e:
            return Response({"error": str(e)}, status=500)

        return Response(status=204)


class CallViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CallSerializer
    permission_classes = [IsAuthenticated, HasActiveOrganization]

    def get_queryset(self):
        return Call.objects.filter(organization=self.request.organization)


@method_decorator(csrf_exempt, name="dispatch")
class VapiNotionWebhookView(View):
    def post(self, request, integration_id: int, kind: str):
        logger.info(
            "Notion tool webhook integration_id=%s kind=%s",
            integration_id,
            kind,
        )
        if kind not in NOTION_TOOL_KINDS:
            return JsonResponse({"error": f"Unknown kind {kind}"}, status=400)
        if not (settings.VAPI_SHARED_SECRET or "").strip():
            return JsonResponse({"error": "Server misconfigured"}, status=500)
        if not verify_vapi_webhook_secret(request):
            logger.warning(
                "Notion webhook unauthorized integration_id=%s kind=%s",
                integration_id,
                kind,
            )
            return JsonResponse({"error": "Unauthorized"}, status=401)
        try:
            body = json.loads(request.body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            body = {}
        parsed = parse_tool_call(body)
        if not parsed:
            msg_type = (
                body.get("message", {}).get("type")
                if isinstance(body.get("message"), dict)
                else None
            )
            logger.warning(
                "Notion webhook unparseable payload integration_id=%s kind=%s message.type=%s keys=%s",
                integration_id,
                kind,
                msg_type,
                list(body.keys()),
            )
            return JsonResponse(
                {"error": "No tool call in payload (expected message.toolCallList)"},
                status=400,
            )
        tool_call_id, args = parsed
        try:
            integration = get_object_or_404(NotionIntegration, pk=integration_id)
        except Http404:
            logger.warning(
                "Notion webhook unknown integration_id=%s kind=%s",
                integration_id,
                kind,
            )
            raise
        try:
            token = decrypt_str(bytes(integration.token_ciphertext))
        except Exception as exc:  # noqa: BLE001
            logger.exception(
                "Notion webhook token decrypt failed integration_id=%s",
                integration_id,
            )
            return JsonResponse(
                {"error": "Could not decrypt Notion token", "detail": str(exc)},
                status=500,
            )
        ds = (integration.data_source_id or "").strip() or (
            request.headers.get("X-Data-Source-Id") or ""
        ).strip()
        if not ds:
            return JsonResponse(
                {"error": "Integration has no data_source_id configured"},
                status=400,
            )
        logger.info(
            "Notion webhook executing kind=%s integration_id=%s args_keys=%s",
            kind,
            integration_id,
            sorted(args.keys()),
        )
        try:
            schema = load_schema(token, ds)
            if kind == "save":
                result = do_save(token, ds, args, schema)
            elif kind == "find":
                result = do_find(token, ds, args, schema)
            elif kind == "search":
                result = do_search(token, ds, args, schema)
            elif kind == "update":
                result = do_update(token, ds, args, schema)
            elif kind == "delete":
                result = do_delete(token, ds, args, schema)
            else:
                result = {"ok": False, "error": "unknown kind"}
        except Exception as e:  # noqa: BLE001
            logger.exception(
                "Notion webhook handler error integration_id=%s kind=%s",
                integration_id,
                kind,
            )
            result = {"ok": False, "error": str(e)}
        logger.info(
            "Notion webhook done integration_id=%s kind=%s ok=%s",
            integration_id,
            kind,
            result.get("ok") if isinstance(result, dict) else True,
        )
        return JsonResponse(
            {
                "results": [
                    {
                        "toolCallId": tool_call_id,
                        "result": json.dumps(result),
                    }
                ]
            }
        )


class OutboundCallView(APIView):
    permission_classes = [IsAuthenticated, HasActiveOrganization]

    def post(self, request: Request):
        ser = OutboundCallSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        org = request.organization
        payload: dict[str, Any] = {
            "customer": {"number": ser.validated_data["customer_number"]},
        }
        data = ser.validated_data
        if (data.get("agent_id") or "").strip() or (data.get("assistant_id") or "").strip():
            payload["assistantId"] = resolve_vapi_assistant_id(
                org,
                agent_id=data.get("agent_id"),
                assistant_id=data.get("assistant_id"),
            )
        elif (data.get("workflow_id") or "").strip() or (
            data.get("vapi_workflow_id") or ""
        ).strip():
            payload["workflowId"] = resolve_vapi_workflow_id(
                org,
                workflow_id=data.get("workflow_id"),
                vapi_workflow_id=data.get("vapi_workflow_id"),
            )
        if ser.validated_data.get("phone_number_id"):
            payload["phoneNumberId"] = ser.validated_data["phone_number_id"]
        else:
            try:
                phone_rows = vapi_service.list_phone_numbers()
            except vapi_service.VapiApiError as e:
                return Response(e.body, status=e.status)
            except RuntimeError as e:
                return Response({"error": str(e)}, status=500)
            ids = org_vapi_resource_ids(org)
            accessible = [r for r in phone_rows if phone_number_belongs_to_org(r, ids)]
            picked = next(
                (r for r in accessible if str(r.get("id") or "").strip()),
                None,
            )
            if picked is None:
                return Response(
                    {
                        "detail": (
                            "No phone number is available on the connected voice "
                            "account. Add a number on the Phone Numbers page first."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            payload["phoneNumberId"] = str(picked["id"]).strip()
        try:
            res = vapi_service.create_phone_call(payload)
        except vapi_service.VapiApiError as e:
            return Response(e.body, status=e.status)
        except RuntimeError as e:
            return Response({"error": str(e)}, status=500)
        call = Call.objects.create(
            organization=org,
            created_by=request.user,
            direction=CallDirection.OUTBOUND,
            vapi_call_id=str(res.get("id", "")),
            status=CallStatus.QUEUED,
            customer_number=ser.validated_data["customer_number"],
            metadata={"vapi": res},
        )
        return Response(CallSerializer(call).data, status=201)


class VoiceReadyView(APIView):
    """Preflight: whether the server can create agents and run browser voice."""

    permission_classes = [IsAuthenticated, HasActiveOrganization]

    def get(self, request: Request):
        api_key = bool((settings.VAPI_API_KEY or "").strip())
        public_key = bool((settings.VAPI_PUBLIC_KEY or "").strip())
        return Response(
            {
                "ok": api_key and public_key,
                "apiKeyConfigured": api_key,
                "publicKeyConfigured": public_key,
            }
        )


class WebCallConfigView(APIView):
    """Returns non-secret identifiers for wiring the Vapi Web SDK on the client."""

    permission_classes = [IsAuthenticated, HasActiveOrganization]

    def post(self, request: Request):
        ser = WebCallConfigSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        pub = (settings.VAPI_PUBLIC_KEY or "").strip()
        if not pub:
            return Response(
                {"error": "Voice service is not configured on the server."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        org = request.organization
        data = ser.validated_data
        assistant_id: str | None = None
        workflow_id: str | None = None
        if (data.get("agent_id") or "").strip() or (data.get("assistant_id") or "").strip():
            assistant_id = resolve_vapi_assistant_id(
                org,
                agent_id=data.get("agent_id"),
                assistant_id=data.get("assistant_id"),
            )
        else:
            workflow_id = resolve_vapi_workflow_id(
                org,
                workflow_id=data.get("workflow_id"),
                vapi_workflow_id=data.get("vapi_workflow_id"),
            )
        return Response(
            {
                "publicKey": pub,
                "assistantId": assistant_id,
                "workflowId": workflow_id,
            }
        )


class AssistantChatView(APIView):
    """Proxy Vapi `POST /chat` so the private API key never ships to the browser."""

    permission_classes = [IsAuthenticated, HasActiveOrganization]

    def post(self, request: Request):
        ser = AssistantChatSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        vapi_aid = resolve_vapi_assistant_id(
            request.organization,
            agent_id=data.get("agent_id"),
            assistant_id=data.get("assistant_id"),
        )
        body: dict[str, Any] = {
            "assistantId": vapi_aid,
            "input": data["input"],
        }
        prev = (ser.validated_data.get("previous_chat_id") or "").strip()
        if prev:
            body["previousChatId"] = prev
        try:
            res = vapi_service.create_chat(body)
        except vapi_service.VapiApiError as e:
            return Response(e.body, status=e.status)
        except RuntimeError as e:
            return Response({"error": str(e)}, status=500)
        return Response(res)


class VapiWebhookEventView(APIView):
    """
    Optional: Vapi server-url webhooks for call status (configure in Vapi dashboard).
    """

    permission_classes = [AllowAny]

    def post(self, request: Request):
        secret = (settings.VAPI_SHARED_SECRET or "").strip()
        if secret and request.headers.get("X-Scale-Labs-Secret") != secret:
            return Response({"error": "Unauthorized"}, status=401)
        # Best-effort: attach event to call by vapi id in body
        body = request.data if isinstance(request.data, dict) else {}
        call_id = str(body.get("call", {}).get("id") or body.get("id") or "")
        if call_id:
            call = Call.objects.filter(vapi_call_id=call_id).first()
            if call:
                CallEvent.objects.create(
                    call=call,
                    event_type=str(body.get("type") or "event"),
                    payload=body,
                )
        return Response({"ok": True})
