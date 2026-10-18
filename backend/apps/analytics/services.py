"""Règles de la collecte : ce qui est accepté, nettoyé, ou ignoré. Tout vient du navigateur, donc rien n'est cru tel quel."""
import re
import uuid
from datetime import timedelta
from urllib.parse import urlsplit

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from .models import ConsentTally, SiteAction, SitePageView, SiteSession, SiteVisitor

VISITOR_COOKIE = "rk_vid"
SESSION_COOKIE = "rk_sid"
COOKIE_PATH = "/api/v1/analytics/"
VISITOR_MAX_AGE = 60 * 60 * 24 * 395  # 13 mois : durée maximale recommandée pour un cookie de mesure d'audience
SESSION_MAX_AGE = 60 * 30
SESSION_IDLE = timedelta(seconds=SESSION_MAX_AGE)

# Liste fermée : le navigateur ne peut pas faire enregistrer autre chose.
ACTION_TYPES = {
    "cta_click",      # bouton « Se connecter / Commencer » de la vitrine
    "login_start",    # identifiant reçu sur la page de connexion (la personne a choisi un fournisseur)
    "contact_click",  # lien téléphone, e-mail ou WhatsApp
}

# Zones jamais suivies : application connectée, administration, formulaires remplis par les visiteurs des établissements.
BLOCKED_PREFIXES = ("/dashboard", "/admin", "/v/", "/onboarding", "/api", "/connexion/callback", "/_next")

_BOT = re.compile(r"bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|uptime|curl|wget|python-requests|httpclient|facebookexternalhit|whatsapp", re.I)
_UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
_SOURCE = re.compile(r"[^a-z0-9._-]")


def is_valid_key(value) -> bool:
    return isinstance(value, str) and bool(_UUID.match(value))


def clean_path(raw) -> str | None:
    """Chemin seul (sans paramètres ni fragment), ou None si ce n'est pas une page de la vitrine."""
    if not isinstance(raw, str):
        return None
    path = raw.strip().split("?", 1)[0].split("#", 1)[0]
    if not path.startswith("/") or path.startswith("//") or len(path) > 200:
        return None
    if len(path) > 1:
        path = path.rstrip("/") or "/"
    if any(path == prefix.rstrip("/") or path.startswith(prefix) for prefix in BLOCKED_PREFIXES):
        return None
    return path


def parse_user_agent(user_agent: str) -> tuple[str, str, str, bool]:
    """(appareil, navigateur, système, est_un_robot). Volontairement grossier : aucune empreinte fine du navigateur."""
    ua = user_agent or ""
    if not ua or _BOT.search(ua):
        return "desktop", "", "", True
    if re.search(r"ipad|tablet", ua, re.I) or (re.search(r"android", ua, re.I) and not re.search(r"mobile", ua, re.I)):
        device = "tablet"
    elif re.search(r"mobi|iphone|ipod|android", ua, re.I):
        device = "mobile"
    else:
        device = "desktop"
    if re.search(r"edg(e|a|ios)?/", ua, re.I):
        browser = "Edge"
    elif re.search(r"opr/|opera", ua, re.I):
        browser = "Opera"
    elif re.search(r"firefox|fxios", ua, re.I):
        browser = "Firefox"
    elif re.search(r"samsungbrowser", ua, re.I):
        browser = "Samsung Internet"
    elif re.search(r"chrome|crios", ua, re.I):
        browser = "Chrome"
    elif re.search(r"safari", ua, re.I):
        browser = "Safari"
    else:
        browser = "Autre"
    if re.search(r"windows", ua, re.I):
        system = "Windows"
    elif re.search(r"android", ua, re.I):
        system = "Android"
    elif re.search(r"iphone|ipad|ipod|ios", ua, re.I):
        system = "iOS"
    elif re.search(r"mac os|macintosh", ua, re.I):
        system = "macOS"
    elif re.search(r"linux|x11", ua, re.I):
        system = "Linux"
    else:
        system = "Autre"
    return device, browser, system, False


def own_hosts() -> set[str]:
    hosts = {urlsplit(settings.FRONTEND_URL).hostname or ""}
    hosts.update((urlsplit(origin).hostname or "") for origin in getattr(settings, "CORS_ALLOWED_ORIGINS", []))
    hosts.discard("")
    return hosts


def clean_source(utm_source, referrer) -> str:
    """Provenance : `utm_source` s'il y en a un, sinon le domaine du site référent, sinon « direct ». Jamais l'URL complète."""
    if isinstance(utm_source, str):
        utm = _SOURCE.sub("", utm_source.strip().lower())[:40]
        if utm:
            return utm
    if isinstance(referrer, str) and referrer:
        try:
            host = (urlsplit(referrer).hostname or "").lower().removeprefix("www.")[:120]
        except ValueError:
            host = ""
        if host and host not in own_hosts():
            return host
    return "direct"


def tally_consent(accepted: bool) -> None:
    today = timezone.localdate()
    field = "accepted" if accepted else "rejected"
    try:
        with transaction.atomic():
            tally, _ = ConsentTally.objects.get_or_create(day=today)
    except IntegrityError:  # deux premières décisions du jour en même temps
        tally = ConsentTally.objects.get(day=today)
    ConsentTally.objects.filter(pk=tally.pk).update(**{field: F(field) + 1})


def get_visitor(key: str | None) -> SiteVisitor | None:
    return SiteVisitor.objects.filter(key=key).first() if is_valid_key(key) else None


def ensure_visitor(key: str | None) -> tuple[SiteVisitor, bool]:
    """Le visiteur du cookie, ou un nouveau si le cookie manque / est inconnu. Renvoie (visiteur, créé)."""
    existing = get_visitor(key)
    if existing:
        return existing, False
    return SiteVisitor.objects.create(key=str(uuid.uuid4())), True


def ensure_session(visitor: SiteVisitor, key: str | None, *, device: str, browser: str, system: str, source: str, landing: str) -> tuple[SiteSession, bool]:
    """La session du cookie si elle est encore active (< 30 min), sinon une nouvelle (une visite de plus pour ce navigateur)."""
    now = timezone.now()
    if is_valid_key(key):
        session = SiteSession.objects.filter(key=key, visitor=visitor).first()
        if session and now - session.last_activity_at <= SESSION_IDLE:
            return session, False
    session = SiteSession.objects.create(
        key=str(uuid.uuid4()), visitor=visitor, started_at=now, last_activity_at=now,
        device=device, browser=browser, os=system, source=source, landing_path=landing,
    )
    SiteVisitor.objects.filter(pk=visitor.pk).update(visit_count=F("visit_count") + 1, last_seen_at=now)
    return session, True


def record_page_view(session: SiteSession, path: str) -> None:
    now = timezone.now()
    SitePageView.objects.create(session=session, path=path, viewed_at=now)
    SiteSession.objects.filter(pk=session.pk).update(page_count=F("page_count") + 1, last_activity_at=now)
    SiteVisitor.objects.filter(pk=session.visitor_id).update(last_seen_at=now)


def record_action(session: SiteSession, action: str, path: str) -> None:
    now = timezone.now()
    SiteAction.objects.create(session=session, type=action, path=path, created_at=now)
    SiteSession.objects.filter(pk=session.pk).update(last_activity_at=now)


def purge_old(days: int | None = None) -> dict[str, int]:
    """Supprime les mesures plus vieilles que la durée de conservation (13 mois par défaut) et les visiteurs qui ne sont pas revenus."""
    days = days or getattr(settings, "ANALYTICS_RETENTION_DAYS", 395)
    cutoff = timezone.now() - timedelta(days=days)
    sessions, _ = SiteSession.objects.filter(last_activity_at__lt=cutoff).delete()
    visitors, _ = SiteVisitor.objects.filter(last_seen_at__lt=cutoff).delete()
    tallies, _ = ConsentTally.objects.filter(day__lt=cutoff.date()).delete()
    return {"sessions": sessions, "visitors": visitors, "tallies": tallies}


def forget_visitor(key: str | None) -> int:
    """Droit de retrait : efface le visiteur et tout ce qui s'y rattache (visites, pages, clics)."""
    if not is_valid_key(key):
        return 0
    deleted, _ = SiteVisitor.objects.filter(key=key).delete()
    return deleted
