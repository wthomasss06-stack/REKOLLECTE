"""Journal d'audit de l'établissement : catégories, libellés, filtres, export CSV et description des appareils (réservé au Patron).

Une seule source de vérité : les libellés et catégories vivent ici (le journal, l'export et le résumé disent donc la même chose),
l'interface n'a plus de table de libellés à tenir à jour. Un événement inconnu reste lisible : on affiche son code."""
from __future__ import annotations

import csv
import io
import json
import re
import uuid

from django.db.models import Q, QuerySet
from django.utils import timezone
from django.utils.dateparse import parse_date

CATEGORIES: dict[str, str] = {"connexions": "Connexions", "equipe": "Équipe", "donnees": "Données", "offre": "Offre"}

# action -> (catégorie, libellé, action sensible ?). « Sensible » = change l'accès, les données ou l'offre de l'établissement.
ACTIONS: dict[str, tuple[str, str, bool]] = {
    "auth.login": ("connexions", "Connexion", False),
    "auth.logout": ("connexions", "Déconnexion", False),
    "auth.session_revoked": ("connexions", "Appareil déconnecté", False),
    "auth.member_sessions_revoked": ("connexions", "Appareils d’un membre déconnectés", True),
    "auth.identity_linked": ("connexions", "Méthode de connexion ajoutée", False),
    "terms.accepted": ("connexions", "Conditions d’utilisation acceptées", False),
    "invitation.revoked": ("equipe", "Invitation révoquée", True),
    "member.revoked": ("equipe", "Membre révoqué", True),
    "member.visit_host_updated": ("equipe", "Personne à prévenir modifiée", True),
    "privacy.visits_purged": ("donnees", "Anciennes visites supprimées", True),
    "privacy.subject_exported": ("donnees", "Données d’une personne exportées", True),
    "privacy.subject_deleted": ("donnees", "Données d’une personne supprimées", True),
    "export.exit": ("donnees", "Export de sortie", True),
    "audit.exported": ("donnees", "Journal d’audit exporté", True),
    "organization.karnet_enabled": ("offre", "REKOLLECTE+ activé", True),
    "organization.karnet_disabled": ("offre", "REKOLLECTE+ désactivé", True),
    "organization.karnet_capability_updated": ("offre", "Capacité REKOLLECTE+ mise à jour", True),
    "billing.subscription_changed": ("offre", "Abonnement modifié", True),
}
SENSITIVE_ACTIONS = [action for action, (_, _, sensitive) in ACTIONS.items() if sensitive]


def category_actions(category: str) -> list[str]:
    return [action for action, (cat, _, _) in ACTIONS.items() if cat == category]


def sensitive_q() -> Q:
    """Événements sensibles, y compris la déconnexion d'un appareil décidée par le Patron (le simple « Se déconnecter » ne l'est pas)."""
    return Q(action__in=SENSITIVE_ACTIONS) | Q(action="auth.session_revoked", metadata__reason="boss")


def describe(action: str, metadata: dict | None = None) -> tuple[str, str, bool]:
    """(catégorie, libellé, sensible) d'un événement. `auth.session_revoked` change de libellé selon la raison inscrite à la révocation."""
    category, label, sensitive = ACTIONS.get(action, ("autres", action, False))
    if action == "auth.session_revoked":
        reason = (metadata or {}).get("reason")
        label = {"logout": "Déconnexion", "boss": "Appareil déconnecté par le patron"}.get(reason, label)
        sensitive = reason == "boss"
    return category, label, sensitive


def filter_events(queryset: QuerySet, params) -> QuerySet:
    """Filtres du journal : `category`, `sensitive=1`, `actor` (id), `since` / `until` (AAAA-MM-JJ, inclus), `q` (nom ou e-mail de l'auteur ou de la cible).
    Un filtre invalide est ignoré plutôt que de faire échouer la page."""
    category = params.get("category", "")
    if category in CATEGORIES:
        queryset = queryset.filter(action__in=category_actions(category))
    if params.get("sensitive") == "1":
        queryset = queryset.filter(sensitive_q())
    actor = params.get("actor", "")
    if actor:
        try:
            queryset = queryset.filter(actor_id=uuid.UUID(actor))
        except ValueError:
            pass
    since, until = parse_date(params.get("since", "") or ""), parse_date(params.get("until", "") or "")
    if since:
        queryset = queryset.filter(created_at__date__gte=since)
    if until:
        queryset = queryset.filter(created_at__date__lte=until)
    q = (params.get("q", "") or "").strip()[:80]
    if q:
        queryset = queryset.filter(
            Q(actor__email__icontains=q) | Q(actor__full_name__icontains=q) | Q(target_user__email__icontains=q) | Q(target_user__full_name__icontains=q)
        )
    return queryset


def csv_cell(value) -> str:
    """Protège le tableur : une cellule qui commencerait par = + - @ serait interprétée comme une formule (injection CSV)."""
    text = "" if value is None else str(value).replace("\r", " ").replace("\n", " ")
    return "'" + text if text[:1] in ("=", "+", "-", "@", "\t") else text


def build_csv(events) -> bytes:
    """CSV lisible dans Excel (BOM UTF-8, séparateur « ; ») : une ligne par événement, heure d'Abidjan."""
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";", lineterminator="\r\n")
    writer.writerow(["Date", "Catégorie", "Événement", "Code", "Auteur", "E-mail de l’auteur", "Cible", "E-mail de la cible", "Détail"])
    for event in events:
        category, label, _ = describe(event.action, event.metadata)
        detail = json.dumps(event.metadata, ensure_ascii=False, sort_keys=True)[:500] if event.metadata else ""
        writer.writerow([
            csv_cell(timezone.localtime(event.created_at).strftime("%Y-%m-%d %H:%M:%S")),
            csv_cell(CATEGORIES.get(category, "Autres")),
            csv_cell(label),
            csv_cell(event.action),
            csv_cell(event.actor.full_name if event.actor else ""),
            csv_cell(event.actor.email if event.actor else ""),
            csv_cell(event.target_user.full_name if event.target_user else ""),
            csv_cell(event.target_user.email if event.target_user else ""),
            csv_cell(detail),
        ])
    return ("\ufeff" + buffer.getvalue()).encode("utf-8")


_BROWSERS = [(r"Edg/|EdgA/|EdgiOS/", "Edge"), (r"OPR/|Opera", "Opera"), (r"SamsungBrowser", "Samsung Internet"), (r"Firefox/|FxiOS/", "Firefox"), (r"Chrome/|CriOS/", "Chrome"), (r"Safari/", "Safari")]
_SYSTEMS = [(r"Android", "Android"), (r"iPhone|iPad|iPod", "iOS"), (r"Windows", "Windows"), (r"Mac OS X|Macintosh", "macOS"), (r"CrOS", "ChromeOS"), (r"Linux", "Linux")]


def describe_device(user_agent: str) -> tuple[str, str]:
    """(« Chrome · Android », « mobile » | « ordinateur ») déduit de l'agent utilisateur ; jamais plus précis que nécessaire."""
    ua = user_agent or ""
    browser = next((name for pattern, name in _BROWSERS if re.search(pattern, ua)), "Navigateur")
    system = next((name for pattern, name in _SYSTEMS if re.search(pattern, ua)), "Appareil inconnu")
    return f"{browser} · {system}", "mobile" if system in ("Android", "iOS") else "ordinateur"
