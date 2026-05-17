import os

from .base import *  # noqa: F403

DEBUG = True
ALLOWED_HOSTS = ["*"]


def _append_origin(url: str) -> None:
    u = url.strip()
    if not u:
        return
    if not u.startswith("http"):
        u = f"https://{u}"
    if u not in CORS_ALLOWED_ORIGINS:  # noqa: F405
        CORS_ALLOWED_ORIGINS.append(u)  # noqa: F405
    if u not in CSRF_TRUSTED_ORIGINS:  # noqa: F405
        CSRF_TRUSTED_ORIGINS.append(u)  # noqa: F405


# Local Next.js (webpack dev server)
_append_origin("http://localhost:3000")
_append_origin("http://127.0.0.1:3000")

# Frontend dev tunnel (ngrok http 3000) — browser UI origin
_append_origin(os.environ.get("DEV_PUBLIC_ORIGIN", ""))

# Backend dev tunnel (ngrok http 8000) — Vapi webhooks + optional direct API from browser
_append_origin(os.environ.get("VAPI_WEBHOOK_BASE", ""))

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "loggers": {
        "apps.studio.webhooks": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
