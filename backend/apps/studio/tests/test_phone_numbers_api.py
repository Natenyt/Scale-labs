"""API tests for phone numbers."""
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
        email="phoneuser@example.com",
        password="pass",
    )
    org = Organization.objects.create(name="Phone Org", slug="phone-org")
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


@patch("apps.studio.views.vapi_service.list_phone_numbers")
def test_phone_numbers_list_filters(mock_list, auth_client):
    client, _org = auth_client
    mock_list.return_value = [
        {
            "id": "pn-1",
            "number": "+14155551234",
            "provider": "vapi",
            "assistantId": "asst-org-1",
            "status": "active",
        },
        {
            "id": "pn-2",
            "number": "+19998887777",
            "provider": "twilio",
            "assistantId": "asst-other",
            "status": "active",
        },
    ]
    res = client.get("/api/v1/phone-numbers/")
    assert res.status_code == 200
    data = res.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["id"] == "pn-1"


@patch("apps.studio.views.vapi_service.create_phone_number")
def test_phone_numbers_create_vapi(mock_create, auth_client):
    client, _org = auth_client
    mock_create.return_value = {
        "id": "pn-new",
        "number": "+14155559999",
        "provider": "vapi",
        "status": "activating",
        "assistantId": "asst-org-1",
    }
    res = client.post(
        "/api/v1/phone-numbers/",
        data={
            "provider": "vapi",
            "area_code": "415",
            "name": "Support",
            "assign_agent_id": "ag_1",
        },
        content_type="application/json",
    )
    assert res.status_code == 201
    assert res.json()["id"] == "pn-new"
    mock_create.assert_called_once()


@patch("apps.studio.views.vapi_service.get_phone_number")
@patch("apps.studio.views.vapi_service.delete_phone_number")
def test_phone_numbers_delete_denied(mock_delete, mock_get, auth_client):
    client, _org = auth_client
    mock_get.return_value = {
        "id": "pn-x",
        "assistantId": "asst-other-org",
        "provider": "vapi",
    }
    res = client.delete("/api/v1/phone-numbers/pn-x/")
    assert res.status_code == 403
    mock_delete.assert_not_called()
