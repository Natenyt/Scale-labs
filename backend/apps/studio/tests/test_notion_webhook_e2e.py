"""
Full-circle tests: Vapi-shaped POST → Django webhook → Notion handler.

External Notion HTTP is mocked so tests run offline.
"""
from __future__ import annotations

import json
from unittest.mock import patch

import pytest
from django.conf import settings
from django.test import Client


@pytest.fixture
def api_client():
    return Client()


@pytest.fixture
def webhook_secret(settings):
    settings.VAPI_SHARED_SECRET = "test-shared-secret"
    return "test-shared-secret"


def _post_webhook(
    client: Client,
    *,
    integration_pk: int,
    kind: str,
    body: dict,
    secret: str,
):
    return client.post(
        f"/api/v1/webhooks/vapi/notion/{integration_pk}/{kind}/",
        data=json.dumps(body),
        content_type="application/json",
        HTTP_X_SCALE_LABS_SECRET=secret,
    )


@pytest.mark.django_db
@patch("apps.studio.services.notion_webhook_handlers.pages_create")
@patch("apps.studio.services.notion_webhook_handlers.data_sources_retrieve")
def test_save_webhook_full_circle(
    mock_retrieve,
    mock_create,
    api_client,
    notion_integration,
    vapi_tool_calls_payload,
    webhook_secret,
):
    mock_retrieve.return_value = {
        "properties": {
            "Name": {"type": "title"},
            "Age": {"type": "number"},
        }
    }
    mock_create.return_value = {"id": "page-new-99"}

    response = _post_webhook(
        api_client,
        integration_pk=notion_integration.pk,
        kind="save",
        body=vapi_tool_calls_payload,
        secret=webhook_secret,
    )

    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert data["results"][0]["toolCallId"] == "toolu_test_abc"
    result = json.loads(data["results"][0]["result"])
    assert result["ok"] is True
    assert result["pageId"] == "page-new-99"

    mock_create.assert_called_once()
    call_kwargs = mock_create.call_args.kwargs
    assert call_kwargs["data_source_id"] == "ds-test-123"
    props = call_kwargs["properties"]
    assert "Name" in props
    assert props["Name"]["title"][0]["text"]["content"] == "Jane Doe"


@pytest.mark.django_db
def test_save_webhook_rejects_bad_secret(
    api_client,
    notion_integration,
    vapi_tool_calls_payload,
    webhook_secret,
):
    response = _post_webhook(
        api_client,
        integration_pk=notion_integration.pk,
        kind="save",
        body=vapi_tool_calls_payload,
        secret="wrong-secret",
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_save_webhook_rejects_legacy_payload_without_tool_call_list(
    api_client,
    notion_integration,
    webhook_secret,
):
    legacy_body = {"message": {"type": "tool-calls", "toolCalls": []}}
    response = _post_webhook(
        api_client,
        integration_pk=notion_integration.pk,
        kind="save",
        body=legacy_body,
        secret=webhook_secret,
    )
    assert response.status_code == 400


@pytest.mark.django_db
@patch("apps.studio.services.notion_webhook_handlers.data_sources_retrieve")
def test_save_webhook_unknown_integration_returns_404(
    mock_retrieve,
    api_client,
    vapi_tool_calls_payload,
    webhook_secret,
):
    response = _post_webhook(
        api_client,
        integration_pk=99999,
        kind="save",
        body=vapi_tool_calls_payload,
        secret=webhook_secret,
    )
    assert response.status_code == 404
    mock_retrieve.assert_not_called()


def test_tool_builder_registers_public_webhook_url_without_token_header():
    from apps.studio.services.notion_tool_builder import build_notion_tool_payloads

    integration = {
        "id": "42",
        "label": "CRM",
        "databaseId": "db-1",
        "dataSourceId": "ds-1",
        "fieldMap": [
            {
                "key": "name",
                "notionPropertyName": "Name",
                "notionType": "title",
            },
        ],
    }
    built = build_notion_tool_payloads(
        integration,
        webhook_base="https://api-tunnel.example.com",
        shared_secret="secret",
        notion_token="not-used-in-headers",
    )
    save_tool = next(t for t in built if t["kind"] == "save")
    server_url = save_tool["payload"]["server"]["url"]
    assert (
        server_url
        == "https://api-tunnel.example.com/api/v1/webhooks/vapi/notion/42/save/"
    )
    headers = save_tool["payload"]["server"]["headers"]
    assert headers == {"X-Scale-Labs-Secret": "secret"}
    assert "X-Notion-Token" not in headers
