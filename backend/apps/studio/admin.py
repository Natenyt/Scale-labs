from django.contrib import admin

from .models import Agent, Call, CallEvent, NotionIntegration, Workflow


@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "vapi_assistant_id", "updated_at")
    list_filter = ("organization",)


@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "vapi_workflow_id", "updated_at")


@admin.register(NotionIntegration)
class NotionIntegrationAdmin(admin.ModelAdmin):
    list_display = ("label", "organization", "database_id", "updated_at")


@admin.register(Call)
class CallAdmin(admin.ModelAdmin):
    list_display = ("id", "organization", "direction", "status", "vapi_call_id", "created_at")


@admin.register(CallEvent)
class CallEventAdmin(admin.ModelAdmin):
    list_display = ("id", "call", "event_type", "created_at")
