"""« Qui venez-vous voir ? » et alertes d'arrivée dans le tableau de bord.

- Un champ de formulaire de type `host` propose la liste des membres marqués `is_visit_host`.
- La réponse (le nom affiché) est rattachée à un utilisateur à la synchronisation : `CheckIn.host`.
- Une alerte d'arrivée va à la personne visitée ; sans réponse, au patron et aux gérants.

Ce module ne dépend pas de `services` (qui l'importe) : il reste autonome pour éviter tout import circulaire.
"""
from __future__ import annotations

import unicodedata
from collections import Counter
from datetime import datetime, timedelta

from django.db.models import Q, QuerySet
from django.utils import timezone

from apps.accounts.models import User
from apps.organizations.models import Organization

from .models import CheckIn, FormTemplate

HOST_FIELD_TYPE = "host"

# Une visite synchronisée bien après son arrivée (tablette restée hors ligne) ne doit pas sonner comme une arrivée « en direct ».
LATE_AFTER = timedelta(minutes=30)
# On ne rejoue jamais plus d'une journée d'alertes, quel que soit le curseur transmis par le navigateur.
MAX_LOOKBACK = timedelta(hours=24)
# Marge de recouvrement : une visite validée juste après un sondage ne doit pas passer entre deux interrogations.
CURSOR_OVERLAP = timedelta(seconds=10)
MAX_ALERT_ITEMS = 20
_TEXT_LIMIT = 80


def _normalize(value: object) -> str:
    text = str(value or "").strip().lower()
    return "".join(char for char in unicodedata.normalize("NFKD", text) if not unicodedata.combining(char))


def _display_name(user: User) -> str:
    return (user.full_name or "").strip() or user.email.split("@")[0]


def host_options(organization: Organization) -> list[tuple[str, User]]:
    """Personnes visitables : (libellé affiché, utilisateur). Libellés uniques : deux homonymes sont départagés
    par leur rôle, puis par leur adresse — la même fonction sert au formulaire public ET à la synchronisation."""
    members = list(
        User.objects.filter(
            organization=organization, is_active=True, is_visit_host=True, access_revoked_at__isnull=True, is_superuser=False
        ).order_by("full_name", "email", "id")
    )
    labels = [_display_name(user) for user in members]
    counts = Counter(_normalize(label) for label in labels)
    labels = [f"{label} ({user.get_role_display()})" if counts[_normalize(label)] > 1 else label for label, user in zip(labels, members)]
    counts = Counter(_normalize(label) for label in labels)
    labels = [f"{label} · {user.email.split('@')[0]}" if counts[_normalize(label)] > 1 else label for label, user in zip(labels, members)]
    return list(zip(labels, members))


def public_fields_schema(template: FormTemplate, organization: Organization) -> list[dict]:
    """Schéma servi aux visiteurs : un champ `host` devient une liste déroulante facultative des personnes visitables
    (le schéma enregistré n'est pas modifié). Sans personne visitable, le champ est masqué plutôt que vide."""
    fields = template.fields_schema or []
    if not any(isinstance(f, dict) and f.get("type") == HOST_FIELD_TYPE for f in fields):
        return fields
    labels = [label for label, _ in host_options(organization)]
    public: list[dict] = []
    for field in fields:
        if not isinstance(field, dict) or field.get("type") != HOST_FIELD_TYPE:
            public.append(field)
        elif labels:
            public.append({**field, "type": "select", "required": False, "options": labels})
    return public


def resolve_host(organization: Organization, template: FormTemplate | None, responses: dict) -> User | None:
    """Utilisateur désigné par la réponse au champ `host`, ou None (pas de réponse, nom inconnu ou retiré depuis)."""
    if not template or not isinstance(responses, dict):
        return None
    for field in template.fields_schema or []:
        if not isinstance(field, dict) or field.get("type") != HOST_FIELD_TYPE:
            continue
        answer = responses.get(field.get("id"))
        if not isinstance(answer, str) or not answer.strip():
            continue
        wanted = _normalize(answer)
        for label, user in host_options(organization):
            if _normalize(label) == wanted:
                return user
    return None


# --- Alertes ---------------------------------------------------------------------------------------------------------

def alerts_queryset(user: User, since: datetime, until: datetime) -> QuerySet[CheckIn]:
    """Visites qui concernent `user` : celles où on le demande ; et, pour le patron et les gérants, celles sans personne désignée."""
    queryset = CheckIn.objects.filter(organization_id=user.organization_id, synced_at__gt=since, synced_at__lte=until)
    if user.role in (User.Role.BOSS, User.Role.GERANT):
        return queryset.filter(Q(host__isnull=True) | Q(host_id=user.id))
    return queryset.filter(host_id=user.id)


def _short(value: object) -> str:
    text = " ".join(str(value or "").split())
    return text[:_TEXT_LIMIT]


def _visitor_name(template: FormTemplate | None, responses: dict) -> str:
    # Import tardif : `services` importe ce module.
    from .services import extract_client_identity

    name = extract_client_identity(template, responses).get("full_name") if template else None
    return _short(name) or "Un visiteur"


def _visit_reason(template: FormTemplate | None, responses: dict) -> str | None:
    if not template:
        return None
    for field in template.fields_schema or []:
        if not isinstance(field, dict) or field.get("type") != "select":
            continue
        haystack = _normalize(f"{field.get('id', '')} {field.get('label', '')}")
        if "motif" not in haystack and "raison" not in haystack:
            continue
        value = responses.get(field.get("id"))
        if isinstance(value, str) and value.strip():
            if _normalize(value) == "autre":
                other = responses.get(f"{field.get('id')}_autre")
                if isinstance(other, str) and other.strip():
                    return _short(other)
            return _short(value)
    return None


def serialize_alert(checkin: CheckIn, viewer: User, now: datetime) -> dict:
    """Uniquement ce que montre une notification : jamais la fiche complète (pièce d'identité, signature, téléphone…)."""
    responses = checkin.responses if isinstance(checkin.responses, dict) else {}
    template = checkin.form_template
    return {
        "id": str(checkin.id),
        "visitor_name": _visitor_name(template, responses),
        "reason": _visit_reason(template, responses),
        "access_point": _short(checkin.access_point.name) if checkin.access_point_id else None,
        "for_you": "host" if checkin.host_id == viewer.id else "team",
        "arrived_at": checkin.created_at_client.isoformat(),
        "late": (now - checkin.created_at_client) > LATE_AFTER,
    }


def build_alert_payload(user: User, since: datetime | None) -> dict:
    now = timezone.now()
    cursor = (now - CURSOR_OVERLAP).isoformat()
    if since is None:
        return {"now": now.isoformat(), "cursor": cursor, "total": 0, "items": []}
    since = max(since, now - MAX_LOOKBACK)
    queryset = alerts_queryset(user, since, now)
    total = queryset.count()
    recent = list(queryset.select_related("form_template", "access_point").order_by("-synced_at")[:MAX_ALERT_ITEMS])
    recent.reverse()  # du plus ancien au plus récent : l'ordre naturel d'affichage
    return {
        "now": now.isoformat(),
        "cursor": cursor,
        "total": total,
        "items": [serialize_alert(item, user, now) for item in recent],
    }
