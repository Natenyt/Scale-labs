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


class PhoneNumberCreateSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(
        choices=["vapi", "twilio", "vonage", "telnyx", "byo"],
    )
    name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    area_code = serializers.CharField(max_length=8, required=False, allow_blank=True)
    number = serializers.CharField(max_length=32, required=False, allow_blank=True)
    twilio_account_sid = serializers.CharField(
        max_length=64,
        required=False,
        allow_blank=True,
    )
    twilio_auth_token = serializers.CharField(
        max_length=128,
        required=False,
        allow_blank=True,
    )
    credential_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    sip_uri = serializers.CharField(max_length=256, required=False, allow_blank=True)
    assign_agent_id = serializers.CharField(max_length=32, required=False, allow_blank=True)
    assign_workflow_id = serializers.CharField(
        max_length=32,
        required=False,
        allow_blank=True,
    )

    def validate(self, attrs):
        provider = attrs.get("provider")
        if provider == "vapi" and not (attrs.get("area_code") or "").strip():
            raise serializers.ValidationError(
                {"area_code": "US area code is required to get a new number."},
            )
        if provider == "twilio":
            missing = []
            if not (attrs.get("number") or "").strip():
                missing.append("number")
            if not (attrs.get("twilio_account_sid") or "").strip():
                missing.append("twilio_account_sid")
            if not (attrs.get("twilio_auth_token") or "").strip():
                missing.append("twilio_auth_token")
            if missing:
                raise serializers.ValidationError(
                    {k: "This field is required for Twilio." for k in missing},
                )
        if provider in ("vonage", "telnyx"):
            if not (attrs.get("number") or "").strip():
                raise serializers.ValidationError(
                    {"number": "Phone number is required."},
                )
            if not (attrs.get("credential_id") or "").strip():
                raise serializers.ValidationError(
                    {"credential_id": "Credential id is required for this provider."},
                )
        if provider == "byo":
            if not (attrs.get("sip_uri") or "").strip() and not (
                attrs.get("number") or ""
            ).strip():
                raise serializers.ValidationError(
                    {"detail": "Provide a SIP URI or phone number."},
                )
        agent = (attrs.get("assign_agent_id") or "").strip()
        wf = (attrs.get("assign_workflow_id") or "").strip()
        if agent and wf:
            raise serializers.ValidationError(
                {"detail": "Assign either an agent or a workflow, not both."},
            )
        return attrs


class PhoneNumberUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    assign_agent_id = serializers.CharField(max_length=32, required=False, allow_blank=True)
    assign_workflow_id = serializers.CharField(
        max_length=32,
        required=False,
        allow_blank=True,
    )
    clear_assignment = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        if attrs.get("clear_assignment"):
            return attrs
        agent = (attrs.get("assign_agent_id") or "").strip()
        wf = (attrs.get("assign_workflow_id") or "").strip()
        if agent and wf:
            raise serializers.ValidationError(
                {"detail": "Assign either an agent or a workflow, not both."},
            )
        return attrs
