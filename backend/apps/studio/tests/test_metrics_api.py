"""API tests for metrics dashboard."""
from __future__ import annotations

from unittest.mock import patch

import pytest
from django.core.cache import cache
from django.test import Client
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import Organization, OrganizationMembership
from apps.studio.models import Agent


@pytest.fixture(autouse=True)
def clear_metrics_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def auth_client(db):
    from django.contrib.auth import get_user_model

    user = get_user_model().objects.create_user(
        email="metricsuser@example.com",
        password="pass",
    )
    org = Organization.objects.create(name="Metrics Org", slug="metrics-org")
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


@patch("apps.studio.services.vapi_metrics.vapi_service.list_calls")
@patch("apps.studio.services.vapi_metrics.vapi_service.post_analytics")
def test_metrics_api_ok(mock_analytics, mock_list, auth_client):
    client, _org = auth_client
    mock_list.return_value = [
        {
            "id": "call-1",
            "type": "webCall",
            "createdAt": "2026-05-16T18:53:00.000Z",
            "assistantId": "asst-org-1",
            "cost": 0.05,
            "duration": 60,
            "endedReason": "customer-ended-call",
        },
    ]
    mock_analytics.return_value = [
        {
            "name": "kpi_by_assistant",
            "result": [
                {
                    "assistantId": "asst-org-1",
                    "sumDuration": 60,
                    "countId": 1,
                    "sumCost": 0.05,
                },
            ],
        },
        {"name": "spark_by_day", "result": []},
        {"name": "duration_by_assistant", "result": []},
        {"name": "ended_reason", "result": []},
        {"name": "calls_by_type", "result": []},
        {"name": "avg_duration_series", "result": []},
        {"name": "cost_series", "result": []},
        {"name": "success_eval", "result": []},
        {"name": "cost_llm", "result": []},
        {"name": "cost_stt", "result": []},
        {"name": "cost_tts", "result": []},
        {"name": "cost_platform", "result": []},
        {"name": "concurrency", "result": []},
    ]
    res = client.get("/api/v1/metrics/?days=7&step=day")
    assert res.status_code == 200
    data = res.json()
    assert data["kpis"]["callCount"] >= 1
    assert "charts" in data
    assert "unsuccessfulCalls" in data


@patch("apps.studio.services.vapi_metrics.vapi_service.list_calls")
@patch("apps.studio.services.vapi_metrics.vapi_service.post_analytics")
def test_metrics_api_cache_hit(mock_analytics, mock_list, auth_client):
    cache.clear()
    client, _org = auth_client
    mock_list.return_value = []
    mock_analytics.return_value = [
        {
            "name": "kpi_by_assistant",
            "result": [
                {
                    "assistantId": "asst-org-1",
                    "sumDuration": 0,
                    "countId": 0,
                    "sumCost": 0,
                },
            ],
        },
        {"name": "spark_by_day", "result": []},
        {"name": "duration_by_assistant", "result": []},
        {"name": "ended_reason", "result": []},
        {"name": "calls_by_type", "result": []},
        {"name": "avg_duration_series", "result": []},
        {"name": "cost_series", "result": []},
        {"name": "success_eval", "result": []},
        {"name": "cost_llm", "result": []},
        {"name": "cost_stt", "result": []},
        {"name": "cost_tts", "result": []},
        {"name": "cost_platform", "result": []},
        {"name": "concurrency", "result": []},
    ]
    res1 = client.get("/api/v1/metrics/?days=7&step=day")
    assert res1.status_code == 200
    res2 = client.get("/api/v1/metrics/?days=7&step=day")
    assert res2.status_code == 200
    assert res2.json() == res1.json()
    assert mock_list.call_count == 1
    assert mock_analytics.call_count == 1

    res_fresh = client.get("/api/v1/metrics/?days=7&step=day&fresh=1")
    assert res_fresh.status_code == 200
    assert mock_list.call_count == 2
    assert mock_analytics.call_count == 2


@patch("apps.studio.services.vapi_metrics.vapi_service.list_calls")
@patch("apps.studio.services.vapi_metrics.vapi_service.post_analytics")
def test_metrics_api_invalid_agent(mock_analytics, mock_list, auth_client):
    client, _org = auth_client
    res = client.get("/api/v1/metrics/?agent_id=ag_99999")
    assert res.status_code == 200
    assert res.json()["kpis"]["callCount"] == 0
    mock_analytics.assert_not_called()
