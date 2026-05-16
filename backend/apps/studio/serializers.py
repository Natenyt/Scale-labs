from __future__ import annotations

from rest_framework import serializers

from apps.studio.models import Agent, Call, CallEvent, NotionIntegration, Workflow
from apps.studio.services.crypto import decrypt_str, encrypt_str


def _ext_id(prefix: str, pk: int) -> str:
    return f"{prefix}_{pk}"


def _parse_ext_id(prefix: str, value: str) -> int | None:
    p = f"{prefix}_"
    if not isinstance(value, str) or not value.startswith(p):
        return None
    tail = value[len(p) :]
    try:
        return int(tail, 10)
    except ValueError:
        return None


class AgentSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    vapi_assistant_id = serializers.CharField(read_only=True)

    class Meta:
        model = Agent
        fields = (
            "id",
            "name",
            "config",
            "vapi_assistant_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "vapi_assistant_id", "created_at", "updated_at")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["id"] = _ext_id("ag", instance.pk)
        return data

    def create(self, validated_data):
        validated_data["organization"] = self.context["request"].organization
        return super().create(validated_data)


class WorkflowSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

    class Meta:
        model = Workflow
        fields = (
            "id",
            "name",
            "description",
            "global_prompt",
            "graph",
            "vapi_workflow_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["id"] = _ext_id("wf", instance.pk)
        return data

    def create(self, validated_data):
        validated_data["organization"] = self.context["request"].organization
        return super().create(validated_data)


class NotionIntegrationSerializer(serializers.ModelSerializer):
    """`token` is write-only; never returned on reads."""

    id = serializers.CharField(read_only=True)
    token = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = NotionIntegration
        fields = (
            "id",
            "label",
            "data_source_id",
            "database_id",
            "field_mappings",
            "vapi_tools",
            "token",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "vapi_tools", "created_at", "updated_at")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["id"] = _ext_id("notion", instance.pk)
        data["kind"] = "notion"
        return data

    def create(self, validated_data):
        token = (validated_data.pop("token", "") or "").strip()
        if not token:
            raise serializers.ValidationError({"token": "Notion token is required."})
        validated_data["token_ciphertext"] = encrypt_str(token)
        validated_data["organization"] = self.context["request"].organization
        return super().create(validated_data)

    def update(self, instance, validated_data):
        token = validated_data.pop("token", None)
        if token is not None:
            t = token.strip()
            if t:
                validated_data["token_ciphertext"] = encrypt_str(t)
        return super().update(instance, validated_data)


class CallSerializer(serializers.ModelSerializer):
    class Meta:
        model = Call
        fields = (
            "id",
            "direction",
            "vapi_call_id",
            "status",
            "customer_number",
            "metadata",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "direction",
            "vapi_call_id",
            "status",
            "customer_number",
            "metadata",
            "created_at",
            "updated_at",
        )


class CallEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CallEvent
        fields = ("id", "event_type", "payload", "created_at")
        read_only_fields = ("id", "event_type", "payload", "created_at")


class OutboundCallSerializer(serializers.Serializer):
    customer_number = serializers.CharField(max_length=32)
    agent_id = serializers.CharField(max_length=32, required=False, allow_blank=True)
    assistant_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    workflow_id = serializers.CharField(max_length=32, required=False, allow_blank=True)
    vapi_workflow_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    phone_number_id = serializers.CharField(max_length=64, required=False, allow_blank=True)

    def validate(self, attrs):
        has_agent = bool((attrs.get("agent_id") or "").strip()) or bool(
            (attrs.get("assistant_id") or "").strip()
        )
        has_wf = bool((attrs.get("workflow_id") or "").strip()) or bool(
            (attrs.get("vapi_workflow_id") or "").strip()
        )
        if not has_agent and not has_wf:
            raise serializers.ValidationError(
                "Provide agent_id, workflow_id, or a registered voice resource id.",
            )
        return attrs


class WebCallConfigSerializer(serializers.Serializer):
    agent_id = serializers.CharField(max_length=32, required=False, allow_blank=True)
    assistant_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    workflow_id = serializers.CharField(max_length=32, required=False, allow_blank=True)
    vapi_workflow_id = serializers.CharField(max_length=64, required=False, allow_blank=True)

    def validate(self, attrs):
        has_agent = bool((attrs.get("agent_id") or "").strip()) or bool(
            (attrs.get("assistant_id") or "").strip()
        )
        has_wf = bool((attrs.get("workflow_id") or "").strip()) or bool(
            (attrs.get("vapi_workflow_id") or "").strip()
        )
        if not has_agent and not has_wf:
            raise serializers.ValidationError(
                "Provide agent_id or workflow_id for a voice session.",
            )
        return attrs


class AssistantChatSerializer(serializers.Serializer):
    agent_id = serializers.CharField(max_length=32, required=False, allow_blank=True)
    assistant_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    input = serializers.CharField(max_length=32000)
    previous_chat_id = serializers.CharField(
        max_length=64,
        required=False,
        allow_blank=True,
    )

    def validate(self, attrs):
        if not (attrs.get("agent_id") or "").strip() and not (
            attrs.get("assistant_id") or ""
        ).strip():
            raise serializers.ValidationError(
                {"agent_id": "Provide agent_id for this organization."},
            )
        return attrs
