from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.studio import views

router = DefaultRouter()
router.register(r"agents", views.AgentViewSet, basename="agent")
router.register(r"workflows", views.WorkflowViewSet, basename="workflow")
router.register(
    r"integrations/notion",
    views.NotionIntegrationViewSet,
    basename="notion-integration",
)
router.register(r"calls", views.CallViewSet, basename="call")

urlpatterns = [
    # Before router `calls/<pk>/` or `web-config` is treated as a call id (405 on POST).
    path("calls/voice-ready/", views.VoiceReadyView.as_view(), name="call-voice-ready"),
    path("calls/web-config/", views.WebCallConfigView.as_view(), name="call-web-config"),
    path("calls/outbound/", views.OutboundCallView.as_view(), name="call-outbound"),
    path("calls/chat/", views.AssistantChatView.as_view(), name="call-chat"),
    path("", include(router.urls)),
    path(
        "webhooks/vapi/events/",
        views.VapiWebhookEventView.as_view(),
        name="vapi-events",
    ),
    path(
        "webhooks/vapi/notion/<int:integration_id>/<str:kind>/",
        views.VapiNotionWebhookView.as_view(),
        name="vapi-notion-webhook",
    ),
]
