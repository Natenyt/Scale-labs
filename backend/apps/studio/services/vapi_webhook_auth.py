"""Authenticate inbound Vapi server URL requests."""
from __future__ import annotations

from django.conf import settings
from django.http import HttpRequest


def expected_webhook_secret() -> str:
    return (settings.VAPI_SHARED_SECRET or "").strip()


def verify_vapi_webhook_secret(request: HttpRequest) -> bool:
    expected = expected_webhook_secret()
    if not expected:
        return False
    presented = (request.headers.get("X-Scale-Labs-Secret") or "").strip()
    if presented and presented == expected:
        return True
    auth = (request.headers.get("Authorization") or "").strip()
    if auth.lower().startswith("bearer "):
        token = auth[7:].strip()
        if token and token == expected:
            return True
    return False
