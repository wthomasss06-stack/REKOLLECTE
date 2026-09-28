"""
Django settings — QR-Register SaaS.
Stack : Django REST Framework + Neon (PostgreSQL) + JWT (Google-only auth).
Architecture graduee "Niveau A" (akatech-backend-architect v4.0) : un CRUD reste un CRUD.
"""
import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-me-32-bytes-minimum")
DEBUG = os.environ.get("DEBUG", "True") == "True"
ALLOWED_HOSTS = [h.strip() for h in os.environ.get("ALLOWED_HOSTS", "*").split(",")]

# Les validations bloquantes sont exécutées par `scripts/verify_production.py`.
# Elles ne doivent pas s’exécuter à l’import pendant le build Render : certains
# secrets sont injectés uniquement au démarrage du service, pas dans le builder.

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "corsheaders",
    "apps.accounts",
    "apps.organizations",
    "apps.checkins",
    "apps.feedback",
    "apps.karnet",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "apps.common.middleware.RequestCorrelationMiddleware",
    "apps.common.middleware.ApiTrailingSlashMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

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

WSGI_APPLICATION = "core.wsgi.application"

# --- Base de donnees --------------------------------------------------------
# En local sans DATABASE_URL : SQLite (zero setup). En prod : Neon (Postgres).
DATABASES = {
    "default": dj_database_url.parse(
        os.environ.get("DATABASE_URL", f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
        conn_max_age=600,
        ssl_require=os.environ.get("DATABASE_URL", "").startswith("postgres"),
    )
}

AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = []  # Auth Google uniquement : pas de mot de passe local a valider

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Abidjan"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- DRF ---------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    # Ordres de grandeur akatech-report-templates (Template 7, section Securite).
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "300/min",
        # Chaque appel fait tourner Tesseract côté serveur (CPU) — throttle
        # dédié, bien plus strict que les autres endpoints publics.
        "ocr": "6/min",
    },
    "EXCEPTION_HANDLER": "apps.common.exceptions.standard_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "QR Register SaaS API",
    "DESCRIPTION": "Contrat API versionné pour le registre visiteurs et ses espaces d’équipe.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# Le refresh token vit dans un cookie httpOnly, jamais dans le JSON de réponse ni
# le localStorage côté client. La rotation et la révocation par appareil sont
# gérées par RefreshSession, ce qui évite qu'un token réutilisé reste valable.
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=10),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

REFRESH_COOKIE_NAME = "qr_refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth/"

# --- CORS ----------------------------------------------------------------
# Jamais de "*" : origines explicites, obligatoire car CORS_ALLOW_CREDENTIALS=True
# (le cookie de refresh httpOnly ne peut circuler qu'avec des credentials cross-site).
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
]
CORS_ALLOW_CREDENTIALS = True

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
PLATFORM_ADMIN_EMAIL = os.environ.get("PLATFORM_ADMIN_EMAIL", "")
PLATFORM_ADMIN_PASSWORD = os.environ.get("PLATFORM_ADMIN_PASSWORD", "")
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")

CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "https://renseignement.vercel.app").split(",")
]

# --- Securite prod (desactives en dev pour ne pas gener http://localhost) --------
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    CSRF_COOKIE_SECURE = True
    CSRF_COOKIE_SAMESITE = "Lax"
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

    if not CORS_ALLOWED_ORIGINS or "*" in CORS_ALLOWED_ORIGINS:
        raise RuntimeError("CORS_ALLOWED_ORIGINS doit contenir des origines explicites en production.")
    if not CSRF_TRUSTED_ORIGINS or "*" in CSRF_TRUSTED_ORIGINS:
        raise RuntimeError("CSRF_TRUSTED_ORIGINS doit contenir des origines HTTPS explicites en production.")

    # SECRET_KEY signe les JWT d'accès/refresh : une valeur par défaut ou un
    # placeholder documenté (donc devinable par quiconque a vu le dépôt, y
    # compris .env.example) permettrait de forger un jeton valide pour
    # n'importe quel compte. On refuse de démarrer plutôt que de tourner
    # silencieusement avec une clé connue ou trop courte.
    _INSECURE_SECRET_KEYS = {
        "dev-secret-key-change-me-32-bytes-minimum",
        "change-moi-en-production-avec-une-cle-aleatoire-de-32-caracteres-minimum",
    }
    if SECRET_KEY in _INSECURE_SECRET_KEYS or "change-moi" in SECRET_KEY or "change-me" in SECRET_KEY:
        raise RuntimeError(
            "SECRET_KEY utilise encore une valeur de placeholder (.env.example). "
            "Génère une clé aléatoire (ex. `python -c \"import secrets; print(secrets.token_urlsafe(64))\")` "
            "et définis-la dans les variables d'environnement de l'hébergeur."
        )
    if len(SECRET_KEY) < 32:
        raise RuntimeError("SECRET_KEY doit faire au moins 32 caractères en production.")

X_FRAME_OPTIONS = "DENY"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"structured": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s request_id=%(request_id)s path=%(path)s status=%(status)s duration_ms=%(duration_ms)s"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "structured"}},
    "loggers": {"qr_register.request": {"handlers": ["console"], "level": "INFO", "propagate": False}},
}
