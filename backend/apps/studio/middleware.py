import logging
from typing import Callable

from django.http import HttpRequest, HttpResponse

logger = logging.getLogger("apps.studio.webhooks")

from apps.accounts.models import Organization, OrganizationMembership


class ActiveOrganizationMiddleware:
    """
    Attaches `request.organization` when `X-Org-Id` is present and the user
    is a member. Falls back to `user.last_active_organization` if valid.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        request.organization = None  # type: ignore[attr-defined]
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return self.get_response(request)

        org_id = request.headers.get("X-Org-Id")
        org = None
        if org_id:
            try:
                org = Organization.objects.get(pk=int(org_id))
            except (ValueError, Organization.DoesNotExist):
                org = None
            if org and not OrganizationMembership.objects.filter(
                user=user,
                organization=org,
            ).exists():
                org = None

        if org is None and user.last_active_organization_id:
            la = user.last_active_organization
            if la and OrganizationMembership.objects.filter(
                user=user,
                organization=la,
            ).exists():
                org = la

        request.organization = org  # type: ignore[attr-defined]
        return self.get_response(request)


class VapiWebhookRequestLogMiddleware:
    """Log every request to Vapi webhook paths (visible in runserver console)."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        path = request.path or ""
        if "/webhooks/vapi/" in path:
            logger.info(
                "Vapi webhook %s %s (content-length=%s)",
                request.method,
                path,
                request.headers.get("Content-Length", "?"),
            )
        response = self.get_response(request)
        if "/webhooks/vapi/" in path:
            logger.info(
                "Vapi webhook %s %s -> %s",
                request.method,
                path,
                response.status_code,
            )
        return response
