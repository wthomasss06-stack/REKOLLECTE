"""Shared client identity normalization and deduplication helpers."""
import re

from django.db import transaction
from django.db.models import Q

from apps.organizations.models import Organization

from .models import Client


def normalize_phone(value: object) -> str:
    """Canonicalize formatting and Ivorian local/international number variants."""
    raw = str(value or "").strip()
    if not raw:
        return ""
    digits = re.sub(r"\D", "", raw)
    if not digits:
        return ""

    if len(digits) == 10 and digits.startswith("0"):
        return digits
    for prefix in ("00225", "225"):
        if digits.startswith(prefix) and len(digits) == len(prefix) + 10:
            local = digits[len(prefix):]
            if local.startswith("0"):
                return local
    return f"+{digits}" if raw.startswith("+") else digits


def find_matching_client(organization: Organization, *, phone: str = "", email: str = "", exclude_id=None) -> Client | None:
    """Client déjà connu de cet établissement : même e-mail (casse ignorée) ou même téléphone
    une fois normalisé (0701020304 = +2250701020304). Règle unique, partagée par la création,
    la modification et la fusion des doublons."""
    phone = normalize_phone(phone)
    email = (email or "").strip().lower()
    scope = Client.objects.filter(organization=organization)
    if exclude_id:
        scope = scope.exclude(pk=exclude_id)
    if email:
        match = scope.filter(email__iexact=email).first()
        if match:
            return match
    if phone:
        return next((item for item in scope.exclude(phone="") if normalize_phone(item.phone) == phone), None)
    return None


def search_clients(queryset, term: str):
    """Recherche par nom, e-mail ou téléphone (« 07 01 », « +225 07 01 02 03 04 » et « 0701020304 »
    trouvent la même fiche)."""
    term = (term or "").strip()
    if not term:
        return queryset
    lookup = Q(full_name__icontains=term) | Q(email__icontains=term)
    digits = re.sub(r"\D", "", term)
    for prefix in ("00225", "225"):
        if digits.startswith(prefix) and len(digits) > len(prefix):
            digits = digits[len(prefix):]
            break
    if len(digits) >= 3:
        lookup |= Q(phone__contains=digits)
    return queryset.filter(lookup)


def find_or_create_client(
    organization: Organization,
    *,
    full_name: str,
    phone: str = "",
    email: str = "",
    note: str = "",
) -> tuple[Client, bool]:
    """Reuse a client by email/normalized phone, or create one atomically."""
    phone = normalize_phone(phone)
    email = email.strip().lower()
    full_name = full_name.strip()

    with transaction.atomic():
        Organization.objects.select_for_update().get(pk=organization.pk)
        client = find_matching_client(organization, phone=phone, email=email)

        if client:
            changed_fields: list[str] = []
            for field, value in (("full_name", full_name), ("phone", phone), ("email", email), ("note", note)):
                if value and not getattr(client, field):
                    setattr(client, field, value)
                    changed_fields.append(field)
            if changed_fields:
                client.save(update_fields=changed_fields)
            return client, False

        client = Client.objects.create(
            organization=organization,
            full_name=full_name,
            phone=phone,
            email=email,
            note=note,
        )
        return client, True


def duplicate_groups(organization: Organization) -> list[list[Client]]:
    """Groupes de fiches qui désignent la même personne (même e-mail ou même téléphone
    normalisé, transitivement). Chaque groupe est trié : la fiche à conserver vient en premier
    (la plus active, puis la plus ancienne)."""
    clients = list(Client.objects.filter(organization=organization).with_activity())
    parent = {c.id: c.id for c in clients}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    seen: dict[str, object] = {}
    for client in clients:
        keys = []
        if client.email.strip():
            keys.append("e:" + client.email.strip().lower())
        phone = normalize_phone(client.phone)
        if phone:
            keys.append("p:" + phone)
        for key in keys:
            if key in seen:
                parent[find(client.id)] = find(seen[key])
            else:
                seen[key] = client.id
    groups: dict[object, list[Client]] = {}
    for client in clients:
        groups.setdefault(find(client.id), []).append(client)
    ranked = []
    for members in groups.values():
        if len(members) > 1:
            members.sort(key=lambda c: (-(c.checkins_count + c.reservations_count), c.created_at))
            ranked.append(members)
    return ranked


@transaction.atomic
def merge_clients(survivor: Client, duplicates: list[Client]) -> None:
    """Fusionne des fiches doublons dans `survivor` : réservations et passages sont rattachés à
    la fiche conservée, les champs vides sont complétés, puis les doublons sont supprimés."""
    for duplicate in duplicates:
        if duplicate.pk == survivor.pk or duplicate.organization_id != survivor.organization_id:
            continue
        for field in ("full_name", "phone", "email", "note"):
            if not getattr(survivor, field) and getattr(duplicate, field):
                setattr(survivor, field, getattr(duplicate, field))
        duplicate.reservations.update(client=survivor)
        duplicate.checkins.update(client=survivor)
        duplicate.delete()
    survivor.phone = normalize_phone(survivor.phone)
    survivor.email = survivor.email.strip().lower()
    survivor.save(update_fields=["full_name", "phone", "email", "note"])
