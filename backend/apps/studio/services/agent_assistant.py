"""Map Scale Labs agent `config` JSON → Vapi `POST/PATCH /assistant` payloads.

Matches Vapi dashboard “Blank template” shape (minus read-only fields like id/orgId).
`AgentViewSet.perform_create` POSTs this to Vapi before saving `vapi_assistant_id` on the row.
"""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import quote

from django.conf import settings

from apps.studio.services.voice_catalog import (
    DEFAULT_VOICE,
    VAPI_VOICES,
    YANDEX_LANGUAGES,
    is_bridge_language,
    resolve_bridge_voice,
)

_BLANK_TEMPLATE_SYSTEM = (
    "This is a blank template with minimal defaults, you can change the model, "
    "temperature, and messages."
)

_DEFAULT_VOICEMAIL = "Please call back when you're available."
_DEFAULT_END_CALL = "Goodbye."


def _openai_model_id(scale_model: str) -> str:
    """Map Scale model picker strings to OpenAI ids Vapi accepts."""
    s = (scale_model or "").lower()
    # Default Scale template id — mirror Vapi dashboard “Blank template” (gpt-4.1).
    if not s or s == "gpt-4o-mini-cluster":
        return "gpt-4.1"
    if "gpt-4.1" in s or "gpt-4-1" in s:
        return "gpt-4.1"
    if "gpt-4o-mini" in s:
        return "gpt-4o-mini"
    if "gpt-4o" in s:
        return "gpt-4o"
    if "claude" in s or "haiku" in s or "sonnet" in s:
        return "gpt-4o-mini"
    return "gpt-4.1"


# Single low-latency model every agent runs on. The model picker was removed
# from the UI — users care about latency, not the model — so this is fixed
# server-side and config.model is ignored.
_FIXED_OPENAI_MODEL = "gpt-4o-mini"


def _voice_speed(config: dict[str, Any]) -> float:
    try:
        s = float(config.get("speed"))
    except (TypeError, ValueError):
        return 1.0
    return max(0.7, min(1.2, round(s, 2)))


def _language_code(config: dict[str, Any]) -> str:
    lang = str(config.get("language") or "en").strip().lower()
    if lang in ("en", "ru", "uz"):
        return lang
    return "en"


def _bridge_configured() -> bool:
    return bool(settings.BRIDGE_BASE_URL and settings.BRIDGE_SECRET)


def _bridge_urls(lang: str, voice: str, role: str) -> tuple[str, str]:
    """Build the bridge custom-voice / custom-transcriber URLs.

    Byte-identical port of the proven ScaleOps construction (scale-labs-ops
    src/lib/agents/config.ts): single trailing slash stripped, http->ws prefix
    swap, encodeURIComponent params, secret duplicated in the WS query string
    because the WebSocket handshake cannot read server.secret.
    """
    http_base = re.sub(r"/$", "", settings.BRIDGE_BASE_URL or "")
    wss_base = re.sub(r"^http", "ws", http_base)
    secret = settings.BRIDGE_SECRET or ""
    stt_lang = YANDEX_LANGUAGES[lang]["stt_lang"]

    voice_url = f"{http_base}/custom-voice?voice={quote(voice, safe='')}"
    if role:
        voice_url += f"&role={quote(role, safe='')}"
    transcriber_url = (
        f"{wss_base}/custom-transcriber?lang={quote(stt_lang, safe='')}"
        f"&secret={quote(secret, safe='')}"
    )
    return voice_url, transcriber_url


def _transcriber_for_language(lang: str, config: dict[str, Any]) -> dict[str, Any]:
    """STT per language: Deepgram for English, the Yandex bridge for uz/ru."""
    if is_bridge_language(lang) and _bridge_configured():
        voice, role = resolve_bridge_voice(
            lang,
            str(config.get("voiceId") or "").strip(),
            str(config.get("voiceRole") or "").strip(),
        )
        _, transcriber_url = _bridge_urls(lang, voice, role)
        return {
            "provider": "custom-transcriber",
            "server": {"url": transcriber_url, "secret": settings.BRIDGE_SECRET},
        }
    if lang == "ru":
        return {"provider": "deepgram", "model": "nova-2", "language": "ru"}
    if lang == "uz":
        return {"provider": "deepgram", "model": "nova-2", "language": "uz"}
    return {"provider": "deepgram", "model": "nova-3", "language": "en"}


def _voice_block(lang: str, config: dict[str, Any]) -> dict[str, Any]:
    """Resolve the agent's voice.

    English -> Vapi native voice (lowest TTS latency). Uzbek/Russian -> the
    Yandex SpeechKit bridge via custom-voice (the only real uz option; ru gets
    the SpeechKit voice set). Falls back to Deepgram/native only when the
    bridge env is not configured (local dev without the bridge).
    """
    if is_bridge_language(lang) and _bridge_configured():
        voice, role = resolve_bridge_voice(
            lang,
            str(config.get("voiceId") or "").strip(),
            str(config.get("voiceRole") or "").strip(),
        )
        voice_url, _ = _bridge_urls(lang, voice, role)
        return {
            "provider": "custom-voice",
            "server": {"url": voice_url, "secret": settings.BRIDGE_SECRET},
        }
    voice_id = str(config.get("voiceId") or "").strip()
    if voice_id not in VAPI_VOICES:
        # Old ElevenLabs `v_*` ids and anything unknown fall back to the default.
        voice_id = DEFAULT_VOICE
    return {"provider": "vapi", "voiceId": voice_id, "speed": _voice_speed(config)}


# Yandex STT emits unpunctuated transcripts, so onNoPunctuationSeconds is the
# endpointing lever. These exact values were tuned on live uz calls in ScaleOps
# (~1.3s turns) — do NOT "clean up" the magic numbers.
_BRIDGE_START_SPEAKING_PLAN: dict[str, Any] = {
    "waitSeconds": 0.2,
    "transcriptionEndpointingPlan": {
        "onPunctuationSeconds": 0.05,
        "onNoPunctuationSeconds": 0.6,
        "onNumberSeconds": 0.2,
    },
}


def resolve_language_voice(
    language: str, voice_id: str = "", voice_role: str = ""
) -> dict[str, Any]:
    """Voice + transcriber (+ endpointing) for one language.

    Shared by the agent payload builder and the workflow sync so both emit an
    identical Yandex bridge stack for uz/ru: English -> Vapi native voice +
    Deepgram STT; Uzbek/Russian -> custom-voice / custom-transcriber built from
    the bridge env (secret stays server-side). Returns the three payload pieces;
    `startSpeakingPlan` is present only for bridge languages when the bridge is
    configured.
    """
    lang = language.strip().lower() if isinstance(language, str) else "en"
    if lang not in ("en", "ru", "uz"):
        lang = "en"
    config = {"voiceId": voice_id, "voiceRole": voice_role}
    stack: dict[str, Any] = {
        "voice": _voice_block(lang, config),
        "transcriber": _transcriber_for_language(lang, config),
    }
    if is_bridge_language(lang) and _bridge_configured():
        stack["startSpeakingPlan"] = _BRIDGE_START_SPEAKING_PLAN
    return stack


def _e164(raw: str) -> str:
    """Best-effort normalize a phone number to E.164 (keep leading +, digits)."""
    s = (raw or "").strip()
    if not s:
        return ""
    plus = s.startswith("+")
    digits = "".join(ch for ch in s if ch.isdigit())
    return ("+" if plus else "+") + digits if digits else ""


def _build_tools(config: dict[str, Any]) -> list[dict[str, Any]]:
    """Translate enabled agent capabilities into Vapi default tools."""
    tools: list[dict[str, Any]] = []

    if config.get("transferEnabled"):
        destinations: list[dict[str, Any]] = []
        for d in config.get("transferDestinations") or []:
            if not isinstance(d, dict):
                continue
            number = _e164(str(d.get("number") or ""))
            if not number:
                continue  # skip incomplete rows rather than fail the whole sync
            dest: dict[str, Any] = {"type": "number", "number": number}
            msg = str(d.get("message") or "").strip()
            if msg:
                dest["message"] = msg
            label = str(d.get("name") or "").strip()
            if label:
                dest["description"] = label
            mode = str(d.get("mode") or "warm").strip().lower()
            dest["transferPlan"] = {
                "mode": "warm-transfer-with-summary"
                if mode == "warm"
                else "blind-transfer"
            }
            destinations.append(dest)
        if destinations:
            tools.append({"type": "transferCall", "destinations": destinations})

    return tools


def build_vapi_assistant_payload(name: str, config: dict[str, Any]) -> dict[str, Any]:
    raw_system = str(config.get("systemPrompt") or "").strip()
    system = raw_system or _BLANK_TEMPLATE_SYSTEM

    raw_first = str(config.get("firstMessage") or "").strip()
    first = raw_first or "Hello."

    max_minutes = int(config.get("maxCallMinutes") or 10)
    max_seconds = max(60, min(max_minutes * 60, 43200))

    lang = _language_code(config)
    end_call = str(config.get("endCallMessage") or "").strip() or _DEFAULT_END_CALL

    safe_name = (name or "New Assistant")[:40]

    model_block: dict[str, Any] = {
        "provider": "openai",
        "model": _FIXED_OPENAI_MODEL,
        "messages": [{"role": "system", "content": system}],
    }
    tools = _build_tools(config)
    if tools:
        model_block["tools"] = tools

    payload: dict[str, Any] = {
        "name": safe_name,
        "firstMessage": first,
        "endCallMessage": end_call,
        "maxDurationSeconds": max_seconds,
        "model": model_block,
        "voice": _voice_block(lang, config),
        "transcriber": _transcriber_for_language(lang, config),
        "analysisPlan": {
            "summaryPlan": {"enabled": False},
            "successEvaluationPlan": {"enabled": False},
        },
        "backgroundDenoisingEnabled": True,
    }

    # When the agent first speaks. Default (assistant-speaks-first) greets on
    # answer; "assistant-waits-for-user" stays silent until it hears the person
    # — the fix for calling reception/PBX numbers that pick up before a human.
    mode = str(config.get("firstMessageMode") or "").strip()
    if mode in (
        "assistant-speaks-first",
        "assistant-waits-for-user",
        "assistant-speaks-first-with-model-generated-message",
    ):
        payload["firstMessageMode"] = mode

    # Bridge languages need the tuned endpointing plan (unpunctuated Yandex STT).
    # English agents keep Vapi defaults — payload unchanged vs. pre-bridge builds.
    if is_bridge_language(lang) and _bridge_configured():
        payload["startSpeakingPlan"] = _BRIDGE_START_SPEAKING_PLAN

    # Voicemail: when detection is on and the agent should leave a message, send
    # the message (TTS); on "hang up" omit it so Vapi ends the call on voicemail.
    if config.get("voicemailDetection"):
        payload["voicemailDetection"] = {
            "provider": "vapi",
            "beepMaxAwaitSeconds": 30,
        }
        action = str(config.get("voicemailAction") or "hangup").strip().lower()
        if action == "leave_message":
            payload["voicemailMessage"] = (
                str(config.get("voicemailMessage") or "").strip()
                or _DEFAULT_VOICEMAIL
            )

    return payload
