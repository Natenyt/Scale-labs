from __future__ import annotations

import json
from typing import Any

from django.conf import settings
from django.db import transaction
from django.http import JsonResponse
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
    WebCallConfigSerializer,
    WorkflowSerializer,
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
        vid = (agent.vapi_assistant_id or "").strip()
        try:
            if vid:
                res = vapi_service.update_assistant(vid, payload)
                return Response({"ok": True, "vapiAssistantId": vid, "vapi": res})
            res = vapi_service.create_assistant(payload)
            new_id = vapi_service.assistant_id_from_response(res)
            if not new_id:
                return Response(
                    {"error": "Vapi did not return an assistant id.", "vapi": res},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            agent.vapi_assistant_id = new_id
            agent.save(update_fields=["vapi_assistant_id", "updated_at"])
            return Response({"ok": True, "vapiAssistantId": new_id, "vapi": res})
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
        vid = (agent.vapi_assistant_id or "").strip()
        try:
            if vid:
                vapi_service.update_assistant(vid, payload)
            else:
                res = vapi_service.create_assistant(payload)
                new_id = vapi_service.assistant_id_from_response(res)
                if new_id:
                    agent.vapi_assistant_id = new_id
                    agent.save(update_fields=["vapi_assistant_id", "updated_at"])
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
        base = (settings.VAPI_WEBHOOK_BASE or "").strip().rstrip("/")
        secret = (settings.VAPI_SHARED_SECRET or "").strip()
        if not base or not secret:
            return Response(
                {"error": "VAPI_WEBHOOK_BASE and VAPI_SHARED_SECRET must be configured"},
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


class CallViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CallSerializer
    permission_classes = [IsAuthenticated, HasActiveOrganization]

    def get_queryset(self):
        return Call.objects.filter(organization=self.request.organization)


@method_decorator(csrf_exempt, name="dispatch")
class VapiNotionWebhookView(View):
    def post(self, request, integration_id: int, kind: str):  # noqa: ARG002
        if kind not in NOTION_TOOL_KINDS:
            return JsonResponse({"error": f"Unknown kind {kind}"}, status=400)
        expected = (settings.VAPI_SHARED_SECRET or "").strip()
        if not expected:
            return JsonResponse({"error": "Server misconfigured"}, status=500)
        if request.headers.get("X-Scale-Labs-Secret") != expected:
            return JsonResponse({"error": "Unauthorized"}, status=401)
        try:
            body = json.loads(request.body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            body = {}
        parsed = parse_tool_call(body)
        if not parsed:
            return JsonResponse({"error": "No toolCalls in payload"}, status=400)
        tool_call_id, args = parsed
        ds = request.headers.get("X-Data-Source-Id")
        db = request.headers.get("X-Database-Id")
        token = request.headers.get("X-Notion-Token")
        if not ds or not db or not token:
            return JsonResponse(
                {"error": "Missing data source / database / notion token headers"},
                status=400,
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
            result = {"ok": False, "error": str(e)}
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
