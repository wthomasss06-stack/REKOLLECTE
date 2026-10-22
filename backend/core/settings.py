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
DEBUG = os.environ.get("DEBUG", "True").strip().lower() in {"true", "1", "yes"}
ALLOWED_HOSTS = [h.strip() for h in os.environ.get("ALLOWED_HOSTS", "*").split(",") if h.strip()]

# Garde-fou : Render définit RENDER=true. Un service Render qui tourne avec DEBUG=True (valeur par défaut quand la
# variable n'est pas définie) affiche des pages d'erreur détaillées et n'active ni HTTPS forcé ni cookies sécurisés ;
# avec ALLOWED_HOSTS="*" il accepte n'importe quel en-tête Host. On ne change pas le comportement (un déploiement
# existant ne doit pas casser au redémarrage), mais l'avertissement est visible dans les logs de démarrage.
if os.environ.get("RENDER"):
    import warnings

    if DEBUG:
        warnings.warn("DEBUG=True sur Render : définir DEBUG=False dans les variables d'environnement.", RuntimeWarning, stacklevel=1)
    if "*" in ALLOWED_HOSTS:
        warnings.warn("ALLOWED_HOSTS='*' sur Render : définir le domaine exact de l'API.", RuntimeWarning, stacklevel=1)

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
    "apps.analytics",
    "apps.billing",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "apps.common.middleware.RequestCorrelationMiddleware",
    "apps.common.middleware.RequestBodyLimitMiddleware",
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
        # Neon coupe les connexions inactives : sans test de santé, la 1re requête après une pause tombait sur une
        # connexion morte (« SSL connection has been closed unexpectedly » → 500) au lieu d'en rouvrir une.
        conn_health_checks=True,
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
        # Connexion de l'administration de la plateforme (compte le plus puissant).
        "admin_login": "10/min",
        # Collecte du suivi de la vitrine (une requête par page vue ou clic d'action), limitée par adresse.
        "analytics": "120/min",
    },
    # Nombre de proxys de confiance devant l'API (Vercel + Render = 2) : sert à lire l'IP réelle dans X-Forwarded-For
    # pour les limiteurs de débit. Non défini : l'en-tête entier sert de clé (comportement historique).
    "NUM_PROXIES": int(os.environ["NUM_PROXIES"]) if os.environ.get("NUM_PROXIES", "").strip().isdigit() else None,
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

# Taille maximale d'un corps de requête API (octets). Les endpoints publics sont anonymes : sans plafond, un seul
# POST géant remplit la mémoire de l'instance. Le plus gros usage légitime est une photo visiteur (data URL base64).
API_MAX_BODY_BYTES = int(os.environ.get("API_MAX_BODY_BYTES", str(24 * 1024 * 1024)))
# Documentation OpenAPI et admin Django : exposés seulement en développement (ou sur demande explicite).
EXPOSE_API_DOCS = DEBUG or os.environ.get("EXPOSE_API_DOCS", "").strip().lower() in {"true", "1", "yes"}
# Chemin de l'admin Django (vide = non monté). L'espace d'administration réel est celui de la plateforme (Next.js).
DJANGO_ADMIN_URL = os.environ.get("DJANGO_ADMIN_URL", "admin/")

REFRESH_COOKIE_NAME = "qr_refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth/"
# Fenêtre de grâce (secondes) pendant laquelle un refresh token DÉJÀ tourné reste accepté :
# l'appel retardataire reçoit un nouvel access token mais ne touche pas au cookie (celui posé
# par le premier appel reste le bon). Sans ça, deux refresh simultanés avec le même cookie
# s'invalident et le 401 du second efface le cookie du premier : session perdue.
REFRESH_ROTATION_LEEWAY_SECONDS = int(os.environ.get("REFRESH_ROTATION_LEEWAY_SECONDS", "30"))

# --- CORS ----------------------------------------------------------------
# Jamais de "*" : origines explicites, obligatoire car CORS_ALLOW_CREDENTIALS=True
# (le cookie de refresh httpOnly ne peut circuler qu'avec des credentials cross-site).
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
]
CORS_ALLOW_CREDENTIALS = True

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")

# --- Connexion Facebook / Apple (voir GUIDE_CONNEXION_FACEBOOK_APPLE.md) ----------------
OAUTH_STATE_COOKIE = "qr_oauth_state"
FACEBOOK_APP_ID = os.environ.get("FACEBOOK_APP_ID", "")
FACEBOOK_APP_SECRET = os.environ.get("FACEBOOK_APP_SECRET", "")
FACEBOOK_GRAPH_VERSION = os.environ.get("FACEBOOK_GRAPH_VERSION", "v25.0")
# Meta ne fournit pas de champ « email_verified » : voir apps/accounts/oauth.py.
FACEBOOK_EMAIL_TRUSTED = os.environ.get("FACEBOOK_EMAIL_TRUSTED", "true").lower() == "true"
APPLE_SERVICES_ID = os.environ.get("APPLE_SERVICES_ID", "")  # l'identifiant du « Services ID », pas le Bundle ID
APPLE_TEAM_ID = os.environ.get("APPLE_TEAM_ID", "")
APPLE_KEY_ID = os.environ.get("APPLE_KEY_ID", "")
APPLE_PRIVATE_KEY = os.environ.get("APPLE_PRIVATE_KEY", "")  # contenu du .p8, retours à la ligne écrits \n
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
PLATFORM_ADMIN_EMAIL = os.environ.get("PLATFORM_ADMIN_EMAIL", "")
PLATFORM_ADMIN_PASSWORD = os.environ.get("PLATFORM_ADMIN_PASSWORD", "")
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")

CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "https://rekollecte-ci.vercel.app").split(",")
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
    "formatters": {
        "structured": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s request_id=%(request_id)s path=%(path)s status=%(status)s duration_ms=%(duration_ms)s"},
        "plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "structured"},
        "console_plain": {"class": "logging.StreamHandler", "formatter": "plain"},
    },
    "loggers": {
        "qr_register.request": {"handlers": ["console"], "level": "INFO", "propagate": False},
        # Connexion Facebook/Apple : cause réelle d'un échec « provider » (jamais de secret dans les messages).
        "qr_register.oauth": {"handlers": ["console_plain"], "level": "INFO", "propagate": False},
    },
}


# --- Plans et abonnements (apps.billing) ---------------------------------------------------------------------------
# Les plans ne verrouillent RIEN tant que PLAN_ENFORCEMENT_STARTS_AT est vide. PLAN_OBSERVE_MODE journalise alors ce qui
# serait bloqué (action d'audit « plan.would_block ») sans rien bloquer. Format de la date : ISO 8601, ex. 2026-12-01T00:00:00+00:00.
def _optional_datetime(name: str):
    raw = os.environ.get(name, "").strip()
    if not raw:
        return None
    from datetime import datetime, timezone as _tz

    value = datetime.fromisoformat(raw)
    return value if value.tzinfo else value.replace(tzinfo=_tz.utc)


PLAN_ENFORCEMENT_STARTS_AT = _optional_datetime("PLAN_ENFORCEMENT_STARTS_AT")
PLAN_OBSERVE_MODE = os.environ.get("PLAN_OBSERVE_MODE", "true").lower() in ("1", "true", "yes", "on")
PLAN_TRIAL_DAYS = int(os.environ.get("PLAN_TRIAL_DAYS", "14"))

# --- Conservation des données (réglages SÉPARÉS de la fenêtre d'historique d'un plan) --------------------------------
# Valeurs par défaut à faire valider dans le dossier ARTCI ; chaque établissement peut choisir une durée plus courte.
RETENTION_VISITS_DAYS = int(os.environ.get("RETENTION_VISITS_DAYS", "365"))
RETENTION_CLIENTS_DAYS = int(os.environ.get("RETENTION_CLIENTS_DAYS", "730"))  # après la dernière activité ; suppression à la demande
RETENTION_AUDIT_DAYS = int(os.environ.get("RETENTION_AUDIT_DAYS", "365"))
RETENTION_PAYMENTS_YEARS = 10  # obligation comptable : jamais purgés avec les visites
PRIVACY_TRANSFER_NOTE = os.environ.get(
    "PRIVACY_TRANSFER_NOTE",
    "Le service est hébergé par des prestataires techniques qui peuvent être situés hors de Côte d’Ivoire.",
)

# Version des conditions générales d'utilisation que les comptes acceptent (tracée sur chaque compte).
TERMS_VERSION = os.environ.get("TERMS_VERSION", "cgu-2026-11")
