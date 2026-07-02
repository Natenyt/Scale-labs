"""Per-language voice catalog.

English runs on Vapi-native voices (lowest latency, no external TTS hop).
Uzbek and Russian run on the Scale Labs Yandex SpeechKit bridge via Vapi's
custom-voice / custom-transcriber providers. Ported from the proven ScaleOps
catalog (scale-labs-ops src/lib/agents/languages.ts) — voices verified against
SpeechKit v3 gRPC (v1 catalogs differ; e.g. yulduz is v3-only).

Keep in sync with the frontend catalog in frontend/src/lib/agents/types.ts.
"""

from __future__ import annotations

from typing import Any

# provider "vapi" — native voices (English).
VAPI_VOICES: frozenset[str] = frozenset(
    {"Elliot", "Clara", "Savannah", "Kai", "Rohan", "Emma"}
)
DEFAULT_VOICE = "Elliot"

# provider "yandex" (bridge) — SpeechKit v3 voices per language.
YANDEX_LANGUAGES: dict[str, dict[str, Any]] = {
    "uz": {
        "stt_lang": "uz-UZ",
        "voices": frozenset({"yulduz"}),
        "default_voice": "yulduz",
        "roles": frozenset({"neutral", "strict", "friendly", "whisper"}),
        "default_role": "neutral",
    },
    "ru": {
        "stt_lang": "ru-RU",
        "voices": frozenset({"alena", "oksana", "jane", "filipp", "ermil", "zahar"}),
        "default_voice": "alena",
        "roles": frozenset({"neutral"}),
        "default_role": "neutral",
    },
}


def is_bridge_language(lang: str) -> bool:
    return lang in YANDEX_LANGUAGES


def resolve_bridge_voice(lang: str, voice_id: str, role: str) -> tuple[str, str]:
    """Validate (voice, role) for a bridge language, falling back to defaults."""
    spec = YANDEX_LANGUAGES[lang]
    voice = voice_id if voice_id in spec["voices"] else spec["default_voice"]
    resolved_role = role if role in spec["roles"] else spec["default_role"]
    return voice, resolved_role
