"""Map Scale Labs agent `config` JSON → Vapi `POST/PATCH /assistant` payloads.

Matches Vapi dashboard “Blank template” shape (minus read-only fields like id/orgId).
`AgentViewSet.perform_create` POSTs this to Vapi before saving `vapi_assistant_id` on the row.
"""

from __future__ import annotations

from typing import Any

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


def _default_elevenlabs_voice_id() -> str:
    """Rachel — widely available default when UI passes a real ElevenLabs voice id."""
    return "21m00Tcm4TlvDq8ikWAM"


# Map Scale Labs catalog ids (`v_*`) to real ElevenLabs voice ids.
# All voices are ElevenLabs Multilingual v2, which covers EN + RU + UZ from
# the same voiceId — the language tab in the studio is a UX grouping, not
# a different TTS provider. Reuse across languages is intentional (the same
# voice can speak any of the three; the UI just curates which appear where).
_EL_RACHEL = "21m00Tcm4TlvDq8ikWAM"
_EL_ADAM = "pNInz6obpZtJ3jQNfsvB"
_EL_BELLA = "EXAVITQu4vr4xnSDxMaL"
_EL_ANTONI = "ErXwobaYiN019PkySvjV"
_EL_LILY = "pFZP5JQG7iQjIQuC4Bku"
_EL_DANIEL = "onwK4e9ZLuTAKqWW03F9"
_EL_CHARLOTTE = "XB0fDUnXU5powFXDhCwa"
_EL_GEORGE = "JBFqnCBsd6RMkjVDRZzb"
_EL_DOMI = "AZnzlk1XvdvUeBnXmlld"
_EL_ELLI = "MF3mGyEYCl7XYWbV9V6O"
_EL_ARNOLD = "VR6AewLTigWG4xSOukaG"
_EL_SAM = "yoZ06aMxZJJ28mfd3POQ"
_EL_JESSICA = "cgSgspJ2msm6clMCkdW9"
_EL_CHARLIE = "IKne3meq5aSn9XLyUdCD"
_EL_BRIAN = "nPczCjzI2devNBz1zQrb"
_EL_CHRIS = "iP95p4xoKVk53GoZ742B"

SCALE_VOICE_MAP: dict[str, str] = {
    # English
    "v_emma": _EL_BELLA,
    "v_oliver": _EL_ADAM,
    "v_aria": _EL_RACHEL,
    "v_marcus": _EL_ANTONI,
    "v_sophie": _EL_LILY,
    "v_james": _EL_DANIEL,
    # Russian
    "v_alena": _EL_CHARLOTTE,
    "v_filipp": _EL_GEORGE,
    "v_jane": _EL_DOMI,
    "v_omazh": _EL_ELLI,
    "v_zahar": _EL_ARNOLD,
    "v_ermil": _EL_SAM,
    # Uzbek
    "v_nigora": _EL_JESSICA,
    "v_bekhzod": _EL_CHARLIE,
    "v_madina": _EL_CHARLOTTE,
    "v_azamat": _EL_BRIAN,
    "v_dilnoza": _EL_BELLA,
    "v_jasur": _EL_CHRIS,
}


def _elevenlabs_voice_block(voice_id: str) -> dict[str, Any]:
    return {
        "provider": "11labs",
        "voiceId": voice_id,
        "model": "eleven_multilingual_v2",
    }


def _language_code(config: dict[str, Any]) -> str:
    lang = str(config.get("language") or "en").strip().lower()
    if lang in ("en", "ru", "uz"):
        return lang
    return "en"


def _transcriber_for_language(lang: str) -> dict[str, Any]:
    """Deepgram defaults aligned with Vapi blank / common locales."""
    if lang == "ru":
        return {"provider": "deepgram", "model": "nova-2", "language": "ru"}
    if lang == "uz":
        return {"provider": "deepgram", "model": "nova-2", "language": "uz"}
    return {"provider": "deepgram", "model": "flux-general-en", "language": "en"}


def _voice_block(config: dict[str, Any]) -> dict[str, Any]:
    """
    Resolve the Scale Labs voice catalog entry into a Vapi voice config.

    Precedence:
      1. Recognized Scale Labs id (`v_emma`, `v_alena`, ...) → mapped ElevenLabs voice.
      2. Caller supplied an explicit ElevenLabs id (or a long id-shaped string)
         → pass it through to 11labs with the multilingual model.
      3. Anything else (unknown / empty) → Rachel as a safe multilingual default.
    """
    voice_id = str(config.get("voiceId") or "").strip()
    explicit_provider = str(config.get("vapiVoiceProvider") or "").strip().lower()

    if voice_id in SCALE_VOICE_MAP:
        return _elevenlabs_voice_block(SCALE_VOICE_MAP[voice_id])

    if explicit_provider == "11labs" and voice_id and not voice_id.startswith("v_"):
        return _elevenlabs_voice_block(voice_id or _default_elevenlabs_voice_id())

    if voice_id and not voice_id.startswith("v_") and len(voice_id) > 12:
        # Heuristic: long ids are likely ElevenLabs ids from integrations.
        return _elevenlabs_voice_block(voice_id)

    return _elevenlabs_voice_block(_default_elevenlabs_voice_id())


def build_vapi_assistant_payload(name: str, config: dict[str, Any]) -> dict[str, Any]:
    raw_system = str(config.get("systemPrompt") or "").strip()
    system = raw_system or _BLANK_TEMPLATE_SYSTEM

    raw_first = str(config.get("firstMessage") or "").strip()
    first = raw_first or "Hello."

    model_key = str(config.get("model") or "gpt-4o-mini-cluster")
    max_minutes = int(config.get("maxCallMinutes") or 10)
    max_seconds = max(60, min(max_minutes * 60, 43200))

    lang = _language_code(config)
    voicemail = str(config.get("voicemailMessage") or "").strip() or _DEFAULT_VOICEMAIL
    end_call = str(config.get("endCallMessage") or "").strip() or _DEFAULT_END_CALL

    safe_name = (name or "New Assistant")[:40]

    payload: dict[str, Any] = {
        "name": safe_name,
        "firstMessage": first,
        "voicemailMessage": voicemail,
        "endCallMessage": end_call,
        "maxDurationSeconds": max_seconds,
        "model": {
            "provider": "openai",
            "model": _openai_model_id(model_key),
            "messages": [{"role": "system", "content": system}],
        },
        "voice": _voice_block(config),
        "transcriber": _transcriber_for_language(lang),
        "analysisPlan": {
            "summaryPlan": {"enabled": False},
            "successEvaluationPlan": {"enabled": False},
        },
        "backgroundDenoisingEnabled": True,
    }
    return payload
