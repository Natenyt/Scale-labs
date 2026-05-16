from .base import *  # noqa: F403

DEBUG = True
ALLOWED_HOSTS = ["*"]
# Local Next.js (webpack dev server)
if "http://localhost:3000" not in CORS_ALLOWED_ORIGINS:  # noqa: F405
    CORS_ALLOWED_ORIGINS.append("http://localhost:3000")  # noqa: F405
if "http://127.0.0.1:3000" not in CORS_ALLOWED_ORIGINS:  # noqa: F405
    CORS_ALLOWED_ORIGINS.append("http://127.0.0.1:3000")  # noqa: F405
