"""Workflow per-language voice: the shared resolver + the sync injection.

Workflows reuse the exact Yandex bridge stack the agent builder emits (uz/ru via
custom-voice/custom-transcriber). These tests pin that the workflow sync injects
the bridge voice server-side for uz/ru and leaves English payloads untouched, so
the bridge secret never has to reach the browser.
"""
from __future__ import annotations

from unittest.mock import patch

import pytest
from django.test import Client, override_settings
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import Organization, OrganizationMembership
from apps.studio.models import Workflow
from apps.studio.services.agent_assistant import resolve_language_voice

BRIDGE_BASE = "https://scale-labs-voice-bridge-production.up.railway.app"
SECRET = "test-secret-123"

bridge_env = override_settings(BRIDGE_BASE_URL=BRIDGE_BASE, BRIDGE_SECRET=SECRET)


# --- resolve_language_voice (shared with the agent builder) -------------------


@bridge_env
def test_resolve_en_uses_native_voice_and_no_speaking_plan():
    stack = resolve_language_voice("en", "Clara")
    assert stack["voice"] == {"provider": "vapi", "voiceId": "Clara", "speed": 1.0}
    assert stack["transcriber"] == {
        "provider": "deepgram",
        "model": "nova-3",
        "language": "en",
    }
    assert "startSpeakingPlan" not in stack


@bridge_env
def test_resolve_uz_uses_bridge_stack():
    stack = resolve_language_voice("uz", "yulduz", "friendly")
    assert stack["voice"] == {
        "provider": "custom-voice",
        "server": {
            "url": f"{BRIDGE_BASE}/custom-voice?voice=yulduz&role=friendly",
            "secret": SECRET,
        },
    }
    assert stack["transcriber"] == {
        "provider": "custom-transcriber",
        "server": {
            "url": f"wss://scale-labs-voice-bridge-production.up.railway.app"
            f"/custom-transcriber?lang=uz-UZ&secret={SECRET}",
            "secret": SECRET,
        },
    }
    assert stack["startSpeakingPlan"] == {
        "waitSeconds": 0.2,
        "transcriptionEndpointingPlan": {
            "onPunctuationSeconds": 0.05,
            "onNoPunctuationSeconds": 0.6,
            "onNumberSeconds": 0.2,
        },
    }


@bridge_env
def test_resolve_ru_defaults_to_alena():
    stack = resolve_language_voice("ru")
    assert "voice=alena" in stack["voice"]["server"]["url"]
    assert "lang=ru-RU" in stack["transcriber"]["server"]["url"]


@bridge_env
def test_resolve_unknown_language_falls_back_to_english():
    stack = resolve_language_voice("fr")
    assert stack["voice"]["provider"] == "vapi"
    assert "startSpeakingPlan" not in stack


# --- sync-vapi injection ------------------------------------------------------


@pytest.fixture
def org(db):
    return Organization.objects.create(name="WF Org", slug="wf-org")


@pytest.fixture
def auth_client(org):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.create_user(
        email="wf@scalelabs.test", password="pw", first_name="W", last_name="F"
    )
    OrganizationMembership.objects.create(user=user, organization=org, role="owner")
    client = Client()
    token = AccessToken.for_user(user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    client.defaults["HTTP_X_ORG_ID"] = str(org.pk)
    return client


BASE_PAYLOAD = {
    "name": "Flow",
    "nodes": [{"type": "conversation", "name": "start", "prompt": "Hi", "isStart": True}],
    "edges": [],
    "voice": {"provider": "vapi", "voiceId": "Elliot"},
    "transcriber": {"provider": "deepgram", "model": "nova-3", "language": "en"},
}


@bridge_env
@patch("apps.studio.views.vapi_service.create_workflow")
def test_sync_uz_injects_bridge_voice(mock_create, auth_client, org):
    mock_create.return_value = {"id": "wf-vapi-1"}
    wf = Workflow.objects.create(organization=org, name="Flow", language="uz")

    res = auth_client.post(
        f"/api/v1/workflows/wf_{wf.pk}/sync-vapi/",
        {
            "vapi_payload": dict(BASE_PAYLOAD),
            "language": "uz",
            "voice_id": "yulduz",
            "voice_role": "whisper",
        },
        content_type="application/json",
    )
    assert res.status_code == 200, res.content
    sent = mock_create.call_args[0][0]
    assert sent["voice"] == {
        "provider": "custom-voice",
        "server": {
            "url": f"{BRIDGE_BASE}/custom-voice?voice=yulduz&role=whisper",
            "secret": SECRET,
        },
    }
    assert sent["transcriber"]["provider"] == "custom-transcriber"
    assert sent["startSpeakingPlan"]["waitSeconds"] == 0.2
    # Snapshot persisted for rehydration.
    wf.refresh_from_db()
    assert (wf.language, wf.voice_id, wf.voice_role) == ("uz", "yulduz", "whisper")


@bridge_env
@patch("apps.studio.views.vapi_service.create_workflow")
def test_sync_en_leaves_payload_voice_untouched(mock_create, auth_client, org):
    mock_create.return_value = {"id": "wf-vapi-2"}
    wf = Workflow.objects.create(organization=org, name="Flow", language="en")

    res = auth_client.post(
        f"/api/v1/workflows/wf_{wf.pk}/sync-vapi/",
        {"vapi_payload": dict(BASE_PAYLOAD), "language": "en"},
        content_type="application/json",
    )
    assert res.status_code == 200, res.content
    sent = mock_create.call_args[0][0]
    assert sent["voice"] == {"provider": "vapi", "voiceId": "Elliot"}
    assert sent["transcriber"] == {
        "provider": "deepgram",
        "model": "nova-3",
        "language": "en",
    }
    assert "startSpeakingPlan" not in sent
