"""
Resolve the public base URL embedded in Vapi tool `server.url` fields.

Vapi runs in the cloud and must POST to an internet-reachable endpoint. A bare
`http://localhost:8000` value only works on the developer machine, not from Vapi.
"""
from __future__ import annotations

from urllib.parse import urlparse


def _normalize_url(url: str) -> str:
    u = (url or "").strip().rstrip("/")
    if not u:
        return ""
    if not u.startswith(("http://", "https://")):
        u = f"https://{u}"
    return u.rstrip("/")


def is_local_webhook_base(url: str) -> bool:
    """True when Vapi's servers cannot reach this host (localhost, loopback, .local)."""
    if not url:
        return True
    parsed = urlparse(_normalize_url(url))
    host = (parsed.hostname or "").lower()
    if not host:
        return True
    if host in ("localhost", "127.0.0.1", "::1"):
        return True
    if host.endswith(".local"):
        return True
    return False


def resolve_vapi_webhook_base(
    *,
    explicit: str = "",
    dev_public_origin: str = "",
) -> str:
    """
    Pick the webhook base URL for Vapi tool registration.

    Priority:
      1. `VAPI_WEBHOOK_BASE` when it is a non-local public URL (production or ngrok http 8000)
      2. `DEV_PUBLIC_ORIGIN` only when `VAPI_WEBHOOK_BASE` is empty or localhost
         (single-tunnel dev: ngrok on port 3000 with Next proxying /api/v1 to Django)
      3. Whatever remains (may still be localhost — callers should reject before syncing to Vapi)

    Split tunnels: set `VAPI_WEBHOOK_BASE` to the backend ngrok URL and `DEV_PUBLIC_ORIGIN`
    to the frontend ngrok URL. Do not rely on (2) in that setup.
    """
    base = _normalize_url(explicit)
    dev = _normalize_url(dev_public_origin)

    if base and not is_local_webhook_base(base):
        return base
    if dev and not is_local_webhook_base(dev):
        return dev
    return base or dev
