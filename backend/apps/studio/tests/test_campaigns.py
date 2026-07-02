"""Campaign builder + API tests."""
from __future__ import annotations

from unittest.mock import patch

import pytest
from django.test import Client
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import Organization, OrganizationMembership
from apps.studio.models import Agent, Campaign, PhoneNumber
from apps.studio.services.campaign_builder import (
    build_vapi_campaign,
    parse_customers_csv,
    validate_customers,
)


# --- builder / parsers --------------------------------------------------------


def test_validate_customers_e164_and_dedupe():
    customers, invalid = validate_customers(
        [
            {"number": "+14155550123", "name": "Jane"},
            {"number": "+14155550123"},  # dup by number
            {"number": "555-1234"},  # invalid
            {"number": "+998901234567"},
        ]
    )
    assert customers == [
        {"number": "+14155550123", "name": "Jane"},
        {"number": "+998901234567"},
    ]
    assert invalid == ["555-1234"]


def test_parse_csv_header_tolerant():
    csv = "name,phone\nJane Doe,+14155550123\nBob,+14155550124\nbad,notanumber"
    customers, invalid = parse_customers_csv(csv)
    assert customers == [
        {"number": "+14155550123", "name": "Jane Doe"},
        {"number": "+14155550124", "name": "Bob"},
    ]
    assert invalid == ["notanumber"]


def test_parse_csv_no_header_numbers_only():
    customers, invalid = parse_customers_csv("+14155550123\n+14155550124")
    assert [c["number"] for c in customers] == ["+14155550123", "+14155550124"]
    assert invalid == []


def test_build_campaign_assistant_target_and_schedule():
    payload = build_vapi_campaign(
        name="Q3",
        vapi_phone_number_id="pn-1",
        assistant_id="asst-1",
        customers=[{"number": "+14155550123", "name": "Jane"}],
        schedule_earliest_at="2026-08-01T09:00:00Z",
    )
    assert payload == {
        "name": "Q3",
        "phoneNumberId": "pn-1",
        "customers": [{"number": "+14155550123", "name": "Jane"}],
        "assistantId": "asst-1",
        "schedulePlan": {"earliestAt": "2026-08-01T09:00:00Z"},
    }


def test_build_campaign_squad_target_no_schedule():
    payload = build_vapi_campaign(
        name="S",
        vapi_phone_number_id="pn-1",
        squad_id="sq-1",
        customers=[{"number": "+14155550123"}],
    )
    assert payload["squadId"] == "sq-1"
    assert "assistantId" not in payload
    assert "schedulePlan" not in payload


# --- API ----------------------------------------------------------------------


@pytest.fixture
def org(db):
    return Organization.objects.create(name="Camp Org", slug="camp-org")


@pytest.fixture
def auth_client(org):
    from django.contrib.auth import get_user_model

    user = get_user_model().objects.create_user(email="camp@example.com", password="pass")
    OrganizationMembership.objects.create(user=user, organization=org, role="owner")
    client = Client()
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {AccessToken.for_user(user)}"
    client.defaults["HTTP_X_ORG_ID"] = str(org.pk)
    return client


@pytest.fixture
def twilio_number(org):
    return PhoneNumber.objects.create(
        organization=org,
        vapi_phone_number_id="pn-twilio",
        number="+14155550100",
        provider="twilio",
    )


@pytest.fixture
def agent(org):
    return Agent.objects.create(
        organization=org, name="Caller", vapi_assistant_id="asst-a", config={}
    )


@patch("apps.studio.views.vapi_service.create_campaign")
def test_create_campaign_twilio_and_target(mock_create, auth_client, org, twilio_number, agent):
    mock_create.return_value = {"id": "cp-vapi-1", "status": "scheduled"}
    res = auth_client.post(
        "/api/v1/campaigns/",
        {
            "name": "Q3 outreach",
            "phone_number_id": f"pn_{twilio_number.pk}",
            "target_kind": "agent",
            "target_id": f"ag_{agent.pk}",
            "customers": [{"number": "+14155550123", "name": "Jane"}],
        },
        content_type="application/json",
    )
    assert res.status_code == 201, res.json()
    body = res.json()
    assert body["vapi_campaign_id"] == "cp-vapi-1"
    assert body["recipient_count"] == 1
    sent = mock_create.call_args[0][0]
    assert sent["assistantId"] == "asst-a"
    assert sent["phoneNumberId"] == "pn-twilio"


@patch("apps.studio.views.vapi_service.create_campaign")
def test_vapi_number_rejected_for_campaign(mock_create, auth_client, org, agent):
    vapi_num = PhoneNumber.objects.create(
        organization=org, vapi_phone_number_id="pn-vapi", provider="vapi"
    )
    res = auth_client.post(
        "/api/v1/campaigns/",
        {
            "name": "X",
            "phone_number_id": f"pn_{vapi_num.pk}",
            "target_kind": "agent",
            "target_id": f"ag_{agent.pk}",
            "customers": [{"number": "+14155550123"}],
        },
        content_type="application/json",
    )
    assert res.status_code == 400
    assert "Twilio" in str(res.json())
    mock_create.assert_not_called()


@patch("apps.studio.views.vapi_service.create_campaign")
def test_invalid_recipients_rejected(mock_create, auth_client, org, twilio_number, agent):
    res = auth_client.post(
        "/api/v1/campaigns/",
        {
            "name": "X",
            "phone_number_id": f"pn_{twilio_number.pk}",
            "target_kind": "agent",
            "target_id": f"ag_{agent.pk}",
            "customers": [{"number": "not-a-number"}],
        },
        content_type="application/json",
    )
    assert res.status_code == 400
    mock_create.assert_not_called()


@patch("apps.studio.views.vapi_service.update_campaign")
def test_stop_campaign_only_ended(mock_update, auth_client, org, twilio_number):
    c = Campaign.objects.create(
        organization=org,
        name="Running",
        target_kind="agent",
        vapi_target_id="asst-a",
        phone_number=twilio_number,
        vapi_phone_number_id="pn-twilio",
        vapi_campaign_id="cp-9",
        status="in-progress",
    )
    res = auth_client.post(f"/api/v1/campaigns/cp_{c.pk}/stop/")
    assert res.status_code == 200
    mock_update.assert_called_once_with("cp-9", {"status": "ended"})
    c.refresh_from_db()
    assert c.status == "ended"


@patch("apps.studio.views.vapi_service.get_campaign")
def test_live_counters(mock_get, auth_client, org, twilio_number):
    c = Campaign.objects.create(
        organization=org,
        name="Live",
        target_kind="agent",
        phone_number=twilio_number,
        vapi_campaign_id="cp-live",
        status="in-progress",
    )
    mock_get.return_value = {
        "status": "in-progress",
        "callsCounterScheduled": 3,
        "callsCounterEnded": 2,
    }
    res = auth_client.get(f"/api/v1/campaigns/cp_{c.pk}/live/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "in-progress"
    assert data["counters"]["scheduled"] == 3
    assert data["counters"]["ended"] == 2


def test_delete_phone_used_by_campaign_blocked(auth_client, org, twilio_number):
    Campaign.objects.create(
        organization=org,
        name="Holds number",
        target_kind="agent",
        phone_number=twilio_number,
        vapi_campaign_id="cp-x",
    )
    with patch("apps.studio.views.vapi_service.get_phone_number") as mock_get:
        mock_get.return_value = {"id": "pn-twilio"}
        res = auth_client.delete("/api/v1/phone-numbers/pn-twilio/")
    assert res.status_code == 409
