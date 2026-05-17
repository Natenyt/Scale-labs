"""API tests for org-scoped call logs."""
from __future__ import annotations

from unittest.mock import patch

import pytest
from django.test import Client
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import Organization, OrganizationMembership
from apps.studio.models import Agent


@pytest.fixture
def auth_client(db):
    from django.contrib.auth import get_user_model

    user = get_user_model().objects.create_user(
        email="logsuser@example.com",
        password="pass",
    )
    org = Organization.objects.create(name="Logs Org", slug="logs-org")
    OrganizationMembership.objects.create(user=user, organization=org, role="owner")
    Agent.objects.create(
        organization=org,
        name="Agent One",
        vapi_assistant_id="asst-org-1",
        config={},
    )
    client = Client()
    token = AccessToken.for_user(user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    client.defaults["HTTP_X_ORG_ID"] = str(org.pk)
    return client, org


@patch("apps.studio.views.vapi_service.list_calls")
def test_call_logs_list_filters_by_org(mock_list, auth_client):
    client, org = auth_client
    mock_list.return_value = [
        {
            "id": "call-1",
            "type": "webCall",
            "createdAt": "2026-05-16T18:53:00.000Z",
            "assistantId": "asst-org-1",
            "cost": 0.05,
        },
        {
            "id": "call-other",
            "type": "webCall",
            "createdAt": "2026-05-16T17:00:00.000Z",
            "assistantId": "asst-other-org",
            "cost": 0.01,
        },
    ]
    res = client.get("/api/v1/call-logs/?days=7")
    assert res.status_code == 200
    data = res.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["id"] == "call-1"


@patch("apps.studio.views.vapi_service.get_call")
def test_call_logs_detail_denies_other_org(mock_get, auth_client):
    client, _org = auth_client
    mock_get.return_value = {
        "id": "call-x",
        "assistantId": "asst-other-org",
        "type": "webCall",
    }
    res = client.get("/api/v1/call-logs/call-x/")
    assert res.status_code == 403


@patch("apps.studio.views.vapi_service.get_call")
def test_call_logs_detail_ok(mock_get, auth_client):
    client, org = auth_client
    mock_get.return_value = {
        "id": "call-1",
        "assistantId": "asst-org-1",
        "type": "webCall",
        "cost": 0.08,
        "artifact": {
            "messages": [{"role": "user", "message": "Hi"}],
            "logs": [{"level": "info", "category": "Call", "message": "Started"}],
        },
        "costBreakdown": [{"type": "vapi", "cost": 0.08}],
    }
    res = client.get("/api/v1/call-logs/call-1/")
    assert res.status_code == 200
    body = res.json()
    assert body["id"] == "call-1"
    assert len(body["transcript"]) == 1
    assert len(body["logs"]) == 1
    assert body["costDetail"]["total"] == 0.08
