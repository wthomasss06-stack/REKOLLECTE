"""Shared client identity normalization and deduplication helpers."""
import re

from django.db import transaction

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
        client = None
        if email:
            client = Client.objects.filter(organization=organization, email__iexact=email).first()
        if not client and phone:
            candidates = Client.objects.filter(organization=organization).exclude(phone="")
            client = next((item for item in candidates if normalize_phone(item.phone) == phone), None)

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