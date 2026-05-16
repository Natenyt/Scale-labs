from django.conf import settings
from django.db import models

from apps.accounts.models import Organization


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Agent(TimeStampedModel):
    """Voice agent configuration (mirrors frontend agent store shape loosely)."""

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="agents",
    )
    name = models.CharField(max_length=255)
    config = models.JSONField(default=dict, blank=True)
    vapi_assistant_id = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["organization", "updated_at"])]

    def __str__(self) -> str:
        return self.name


class Workflow(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="workflows",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    global_prompt = models.TextField(blank=True, default="")
    graph = models.JSONField(default=dict, blank=True)  # { nodes: [], edges: [] }
    vapi_workflow_id = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["organization", "updated_at"])]

    def __str__(self) -> str:
        return self.name


class IntegrationKind(models.TextChoices):
    NOTION = "notion", "Notion"
    HUBSPOT = "hubspot", "HubSpot"
    BITRIX24 = "bitrix24", "Bitrix24"


class NotionIntegration(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="notion_integrations",
    )
    label = models.CharField(max_length=255)
    data_source_id = models.CharField(max_length=64)
    database_id = models.CharField(max_length=64)
    field_mappings = models.JSONField(default=list, blank=True)
    token_ciphertext = models.BinaryField()  # Fernet token bytes
    vapi_tools = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["organization", "updated_at"])]

    def __str__(self) -> str:
        return f"{self.label} ({self.database_id})"


class CallDirection(models.TextChoices):
    WEB = "web", "Web"
    OUTBOUND = "outbound", "Outbound PSTN"


class CallStatus(models.TextChoices):
    QUEUED = "queued", "Queued"
    RINGING = "ringing", "Ringing"
    IN_PROGRESS = "in_progress", "In progress"
    ENDED = "ended", "Ended"
    FAILED = "failed", "Failed"


class Call(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="calls",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="calls",
    )
    direction = models.CharField(
        max_length=20,
        choices=CallDirection.choices,
        default=CallDirection.WEB,
    )
    vapi_call_id = models.CharField(max_length=64, blank=True, default="")
    status = models.CharField(
        max_length=32,
        choices=CallStatus.choices,
        default=CallStatus.QUEUED,
    )
    customer_number = models.CharField(max_length=32, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["vapi_call_id"]),
        ]


class CallEvent(TimeStampedModel):
    call = models.ForeignKey(
        Call,
        on_delete=models.CASCADE,
        related_name="events",
    )
    event_type = models.CharField(max_length=64, blank=True, default="")
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["call", "created_at"])]
