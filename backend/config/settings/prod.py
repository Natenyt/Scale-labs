"""
Production Django settings — used on Railway.

Reads everything from env vars (no .env file in container). Hardening:
trust X-Forwarded-Proto from Railway's proxy, force HTTPS, secure cookies,
HSTS, and a wildcard ALLOWED_HOSTS suffix for Railway's auto-generated domains.
"""
import os

from .base import *  # noqa: F403

DEBUG = False

# Railway terminates TLS at the edge and forwards http to the container.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = os.environ.get("DJANGO_SSL_REDIRECT", "true").lower() == "true"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = int(os.environ.get("DJANGO_HSTS_SECONDS", "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_HSTS_SECONDS > 0
SECURE_HSTS_PRELOAD = SECURE_HSTS_SECONDS > 0
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

# ALLOWED_HOSTS comes from env (comma-separated). Always allow Railway's
# wildcard suffix so the auto-assigned *.up.railway.app domain works without
# editing env when Railway rotates URLs.
_env_hosts = [h.strip() for h in os.environ.get("ALLOWED_HOSTS", "").split(",") if h.strip()]
ALLOWED_HOSTS = list({*_env_hosts, ".up.railway.app", ".railway.app"})

# Stream all logs to stdout so they show up in Railway's log viewer.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "simple"},
    },
    "root": {"handlers": ["console"], "level": os.environ.get("DJANGO_LOG_LEVEL", "INFO")},
}
