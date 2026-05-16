from __future__ import annotations

from django.conf import settings
from cryptography.fernet import Fernet, InvalidToken


def _fernet() -> Fernet:
    key = (settings.FIELD_ENCRYPTION_KEY or "").strip()
    if not key:
        raise RuntimeError("FIELD_ENCRYPTION_KEY is not configured")
    # Fernet accepts url-safe base64-encoded 32-byte key as str
    return Fernet(key.encode("utf-8"))


def encrypt_str(plain: str) -> bytes:
    return _fernet().encrypt(plain.encode("utf-8"))


def decrypt_str(blob: bytes) -> str:
    try:
        return _fernet().decrypt(blob).decode("utf-8")
    except InvalidToken as e:
        raise ValueError("Invalid encrypted payload") from e
