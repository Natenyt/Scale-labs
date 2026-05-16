"""
Base Django settings — imported by dev.py and prod.py.
"""
from pathlib import Path

import environ
from corsheaders.defaults import default_headers

# PyMySQL as MySQLdb driver when using MySQL engine
try:
    import pymysql

    pymysql.install_as_MySQLdb()
except ImportError:
    pass

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    DJANGO_SECRET_KEY=(str, "change-me-in-production"),
    DATABASE_URL=(str, "sqlite:///db.sqlite3"),
    CORS_ALLOWED_ORIGINS=(list, []),
    VAPI_API_KEY=(str, ""),
    VAPI_PUBLIC_KEY=(str, ""),
    VAPI_WEBHOOK_BASE=(str, ""),
    VAPI_SHARED_SECRET=(str, ""),
    FIELD_ENCRYPTION_KEY=(str, ""),
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    env.read_env(str(_env_file), overwrite=False)

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env("DJANGO_DEBUG")

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "apps.accounts",
    "apps.studio",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.accounts.middleware.ApiUserMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.studio.middleware.ActiveOrganizationMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {"default": env.db("DATABASE_URL")}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PARSER_CLASSES": (
        "rest_framework.parsers.JSONParser",
    ),
}

from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
}

CORS_ALLOW_CREDENTIALS = True
_raw_cors = env("CORS_ALLOWED_ORIGINS")
if isinstance(_raw_cors, str):
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _raw_cors.split(",") if o.strip()]
else:
    CORS_ALLOWED_ORIGINS = list(_raw_cors) if _raw_cors else []

# Org tenancy header from the Next.js client (not in corsheaders defaults).
CORS_ALLOW_HEADERS = (*default_headers, "x-org-id")

CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# --- Scale Labs service env (read in services, not all required at import) ---
VAPI_API_KEY = env("VAPI_API_KEY", default="")
VAPI_PUBLIC_KEY = env("VAPI_PUBLIC_KEY", default="")
VAPI_WEBHOOK_BASE = env("VAPI_WEBHOOK_BASE", default="").rstrip("/")
VAPI_SHARED_SECRET = env("VAPI_SHARED_SECRET", default="")
FIELD_ENCRYPTION_KEY = env("FIELD_ENCRYPTION_KEY", default="")
