"""Golden-payload tests for the Vapi assistant builder.

The uz/ru expectations are captured from the WORKING ScaleOps output
(scale-labs-ops buildVapiAssistant) — the bridge URL construction must stay
byte-identical or uz/ru calls die with silent dead-air. The en expectations
pin backward compatibility: English agents must be untouched by the bridge port.
"""
from __future__ import annotations

import pytest
from django.test import override_settings

from apps.studio.services.agent_assistant import build_vapi_assistant_payload

BRIDGE_BASE = "https://scale-labs-voice-bridge-production.up.railway.app"
SECRET = "test-secret-123"

bridge_env = override_settings(BRIDGE_BASE_URL=BRIDGE_BASE, BRIDGE_SECRET=SECRET)
no_bridge_env = override_settings(BRIDGE_BASE_URL="", BRIDGE_SECRET="")


# --- English: byte-compatible with the pre-bridge builder ---------------------


@bridge_env
def test_en_agent_unchanged_by_bridge_port():
    payload = build_vapi_assistant_payload(
        "Support", {"language": "en", "voiceId": "Clara"}
    )
    assert payload["voice"] == {"provider": "vapi", "voiceId": "Clara", "speed": 1.0}
    assert payload["transcriber"] == {
        "provider": "deepgram",
        "model": "nova-3",
        "language": "en",
    }
    assert "startSpeakingPlan" not in payload


@bridge_env
def test_en_unknown_voice_falls_back_to_default():
    payload = build_vapi_assistant_payload("A", {"language": "en", "voiceId": "v_old"})
    assert payload["voice"]["voiceId"] == "Elliot"


# --- Uzbek: the Yandex bridge (golden from ScaleOps) --------------------------


@bridge_env
def test_uz_agent_uses_bridge_custom_voice_and_transcriber():
    payload = build_vapi_assistant_payload(
        "Uzbek Agent",
        {"language": "uz", "voiceId": "yulduz", "voiceRole": "neutral"},
    )
    assert payload["voice"] == {
        "provider": "custom-voice",
        "server": {
            "url": f"{BRIDGE_BASE}/custom-voice?voice=yulduz&role=neutral",
            "secret": SECRET,
        },
    }
    assert payload["transcriber"] == {
        "provider": "custom-transcriber",
        "server": {
            "url": f"wss://scale-labs-voice-bridge-production.up.railway.app"
            f"/custom-transcriber?lang=uz-UZ&secret={SECRET}",
            "secret": SECRET,
        },
    }
    # Tuned on live uz calls (unpunctuated Yandex STT) — exact values matter.
    assert payload["startSpeakingPlan"] == {
        "waitSeconds": 0.2,
        "transcriptionEndpointingPlan": {
            "onPunctuationSeconds": 0.05,
            "onNoPunctuationSeconds": 0.6,
            "onNumberSeconds": 0.2,
        },
    }


@bridge_env
@pytest.mark.parametrize("role", ["strict", "friendly", "whisper"])
def test_uz_roles_flow_into_voice_url(role):
    payload = build_vapi_assistant_payload(
        "A", {"language": "uz", "voiceId": "yulduz", "voiceRole": role}
    )
    assert payload["voice"]["server"]["url"].endswith(f"?voice=yulduz&role={role}")


@bridge_env
def test_uz_invalid_voice_and_role_fall_back():
    payload = build_vapi_assistant_payload(
        "A", {"language": "uz", "voiceId": "Elliot", "voiceRole": "sassy"}
    )
    assert "voice=yulduz&role=neutral" in payload["voice"]["server"]["url"]


# --- Russian ------------------------------------------------------------------


@bridge_env
def test_ru_agent_uses_bridge_with_ru_catalog():
    payload = build_vapi_assistant_payload(
        "RU", {"language": "ru", "voiceId": "oksana"}
    )
    assert payload["voice"]["server"]["url"] == (
        f"{BRIDGE_BASE}/custom-voice?voice=oksana&role=neutral"
    )
    assert "lang=ru-RU" in payload["transcriber"]["server"]["url"]
    assert payload["startSpeakingPlan"]["waitSeconds"] == 0.2


@bridge_env
def test_ru_invalid_voice_falls_back_to_alena():
    payload = build_vapi_assistant_payload("RU", {"language": "ru", "voiceId": "nope"})
    assert "voice=alena" in payload["voice"]["server"]["url"]


# --- Trailing slash + missing bridge env ---------------------------------------


@override_settings(BRIDGE_BASE_URL=BRIDGE_BASE + "/", BRIDGE_SECRET=SECRET)
def test_trailing_slash_stripped_once():
    payload = build_vapi_assistant_payload("A", {"language": "uz"})
    assert "//custom-voice" not in payload["voice"]["server"]["url"].replace(
        "https://", ""
    )
    assert payload["voice"]["server"]["url"].startswith(f"{BRIDGE_BASE}/custom-voice")


@bridge_env
def test_first_message_mode_wait_for_user_is_emitted():
    payload = build_vapi_assistant_payload(
        "Reception dialer", {"firstMessageMode": "assistant-waits-for-user"}
    )
    assert payload["firstMessageMode"] == "assistant-waits-for-user"


@bridge_env
def test_first_message_mode_omitted_when_unset():
    payload = build_vapi_assistant_payload("A", {})
    assert "firstMessageMode" not in payload


@bridge_env
def test_first_message_mode_invalid_value_ignored():
    payload = build_vapi_assistant_payload("A", {"firstMessageMode": "bogus"})
    assert "firstMessageMode" not in payload


@no_bridge_env
def test_bridge_unconfigured_falls_back_to_legacy_deepgram():
    payload = build_vapi_assistant_payload("A", {"language": "uz", "voiceId": "yulduz"})
    assert payload["voice"]["provider"] == "vapi"  # native fallback
    assert payload["transcriber"] == {
        "provider": "deepgram",
        "model": "nova-2",
        "language": "uz",
    }
    assert "startSpeakingPlan" not in payload
