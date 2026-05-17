"""Tests for Vapi webhook shared-secret verification."""
from __future__ import annotations

import pytest
from django.test import RequestFactory

from apps.studio.services.vapi_webhook_auth import verify_vapi_webhook_secret


@pytest.fixture
def rf():
    return RequestFactory()


@pytest.mark.django_db
def test_verify_header_secret(settings, rf):
    settings.VAPI_SHARED_SECRET = "test-shared-secret"
    request = rf.post(
        "/api/v1/webhooks/vapi/notion/1/save/",
        HTTP_X_SCALE_LABS_SECRET="test-shared-secret",
    )
    assert verify_vapi_webhook_secret(request) is True


@pytest.mark.django_db
def test_verify_bearer_secret(settings, rf):
    settings.VAPI_SHARED_SECRET = "test-shared-secret"
    request = rf.post(
        "/api/v1/webhooks/vapi/notion/1/save/",
        HTTP_AUTHORIZATION="Bearer test-shared-secret",
    )
    assert verify_vapi_webhook_secret(request) is True


@pytest.mark.django_db
def test_verify_rejects_wrong_secret(settings, rf):
    settings.VAPI_SHARED_SECRET = "test-shared-secret"
    request = rf.post(
        "/api/v1/webhooks/vapi/notion/1/save/",
        HTTP_X_SCALE_LABS_SECRET="wrong",
    )
    assert verify_vapi_webhook_secret(request) is False
