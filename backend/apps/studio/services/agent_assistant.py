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
# All voices are ElevenLabs Multilingual v2, which covers EN + RU + UZ from the
# same voiceId — the language tab is a UX grouping, not a different provider.
# These ids are ElevenLabs premade voices whose public preview mp3s back the
# "Play sample" buttons; keep this map in sync with frontend VOICES (types.ts).
SCALE_VOICE_MAP: dict[str, str] = {
    # English
    "v_emma": "EXAVITQu4vr4xnSDxMaL",
    "v_oliver": "CwhRBWXzGAHq8TQ4Fs17",
    "v_aria": "FGY2WhTYpPnrIDTdsKH5",
    "v_marcus": "IKne3meq5aSn9XLyUdCD",
    "v_sophie": "Xb7hH8MSUJpSbSDYk0k2",
    "v_james": "JBFqnCBsd6RMkjVDRZzb",
    # Russian
    "v_alena": "XrExE9yKIg1WjnnlVkGX",
    "v_filipp": "N2lVS1w4EtoT3dr4eOWO",
    "v_jane": "cgSgspJ2msm6clMCkdW9",
    "v_omazh": "hpp4J3VqNfWAUOO0d1Us",
    "v_zahar": "SOYHLrjzK2X1ezoPC6cr",
    "v_ermil": "TX3LPaxmHKxFdv7VOQHJ",
    # Uzbek
    "v_nigora": "pFZP5JQG7iQjIQuC4Bku",
    "v_bekhzod": "bIHbv24MWmeRgasZH58o",
    "v_madina": "EXAVITQu4vr4xnSDxMaL",
    "v_azamat": "cjVigY5qzO86Huf0OWal",
    "v_dilnoza": "FGY2WhTYpPnrIDTdsKH5",
    "v_jasur": "iP95p4xoKVk53GoZ742B",
}


def _elevenlabs_voice_block(voice_id: str, speed: float | None = None) -> dict[str, Any]:
    block: dict[str, Any] = {
        "provider": "11labs",
        "voiceId": voice_id,
        "model": "eleven_multilingual_v2",
    }
    if speed is not None:
        block["speed"] = speed
    return block


# Single low-latency model every agent runs on. The model picker was removed
# from the UI — users care about latency, not the model — so this is fixed
# server-side and config.model is ignored.
_FIXED_OPENAI_MODEL = "gpt-4o-mini"


def _voice_speed(config: dict[str, Any]) -> float:
    try:
        s = float(config.get("speed"))
    except (TypeError, ValueError):
        return 1.0
    # ElevenLabs accepts roughly 0.7–1.2; clamp to stay inside Vapi's range.
    return max(0.7, min(1.2, round(s, 2)))


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
    speed = _voice_speed(config)

    if voice_id in SCALE_VOICE_MAP:
        return _elevenlabs_voice_block(SCALE_VOICE_MAP[voice_id], speed)

    if explicit_provider == "11labs" and voice_id and not voice_id.startswith("v_"):
        return _elevenlabs_voice_block(voice_id or _default_elevenlabs_voice_id(), speed)

    if voice_id and not voice_id.startswith("v_") and len(voice_id) > 12:
        # Heuristic: long ids are likely ElevenLabs ids from integrations.
        return _elevenlabs_voice_block(voice_id, speed)

    return _elevenlabs_voice_block(_default_elevenlabs_voice_id(), speed)


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
        "voice": _voice_block(config),
        "transcriber": _transcriber_for_language(lang),
        "analysisPlan": {
            "summaryPlan": {"enabled": False},
            "successEvaluationPlan": {"enabled": False},
        },
        "backgroundDenoisingEnabled": True,
    }

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
