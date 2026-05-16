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
    Vapi blank template uses built-in Vapi voice (e.g. Elliot). Scale UI uses internal `v_*`
    placeholders — map those to the same dashboard default unless user supplied an
    external provider voice id (e.g. ElevenLabs id).
    """
    voice_id = str(config.get("voiceId") or "").strip()
    explicit_provider = str(config.get("vapiVoiceProvider") or "").strip().lower()

    if explicit_provider == "11labs" and voice_id and not voice_id.startswith("v_"):
        return {"provider": "11labs", "voiceId": voice_id or _default_elevenlabs_voice_id()}
    if voice_id and not voice_id.startswith("v_") and len(voice_id) > 12:
        # Heuristic: long ids are often ElevenLabs / PlayHT style ids from integrations.
        return {"provider": "11labs", "voiceId": voice_id}

    # Blank-template parity: Vapi stock voice (dashboard default for new assistants).
    return {"provider": "vapi", "voiceId": "Elliot"}


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
