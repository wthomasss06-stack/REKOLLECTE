"""Validation et ingestion offline-first idempotente pour plusieurs points d'accueil.

Quand REKOLLECTE+ est actif, une visite valide alimente automatiquement une fiche
client. Le check-in reste toujours la source historique du passage.
"""
from dataclasses import dataclass, field
import re
import unicodedata

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.karnet.models import Client
from apps.organizations.models import Organization

from .models import AccessPoint, CheckIn, FormTemplate


@dataclass
class SyncOutcome:
    idempotency_key: str
    status: str
    missing_fields: list = field(default_factory=list)
    client_id: str | None = None
    client_action: str | None = None

    def as_dict(self) -> dict:
        payload = {"idempotency_key": self.idempotency_key, "status": self.status}
        if self.missing_fields:
            payload["fields"] = self.missing_fields
        if self.client_id:
            payload["client_id"] = self.client_id
        if self.client_action:
            payload["client_action"] = self.client_action
        return payload


def missing_required_fields(template: FormTemplate | None, responses: dict, signature_blob: str = "") -> list[str]:
    if not template:
        return []
    missing = []
    for f in template.fields_schema:
        if f.get("required") and not (
            bool(signature_blob) if f["type"] == "signature" else bool(responses.get(f["id"]))
        ):
            missing.append(f["id"])
    return missing


def resolve_target(token):
    point = AccessPoint.objects.select_related("organization", "form_template").filter(
        secure_token=token,
        is_active=True,
        organization__is_suspended=False,
    ).first()
    if point:
        if point.secure_token == point.organization.qr_secure_token:
            template = (
                point.organization.form_templates.filter(is_default=True).first()
                or point.organization.form_templates.filter(is_active=True).first()
            )
            return point.organization, template, point
        return point.organization, point.form_template, point
    organization = Organization.objects.filter(qr_secure_token=token, is_suspended=False).first()
    if not organization:
        return None, None, None
    template = (
        organization.form_templates.filter(is_default=True).first()
        or organization.form_templates.filter(is_active=True).first()
    )
    return organization, template, None


def _normalized_label(value: object) -> str:
    text = str(value or "").strip().lower()
    return "".join(
        char for char in unicodedata.normalize("NFKD", text)
        if not unicodedata.combining(char)
    )


def _as_text(value: object) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float)):
        return str(value).strip()
    return ""


def normalize_email(value: object) -> str:
    return _as_text(value).lower()


def normalize_phone(value: object) -> str:
    """Ramène un numéro à une forme stable pour la détection de doublon.

    Spécifique à la Côte d'Ivoire : un numéro écrit localement (10 chiffres,
    ex. `0701020304`) et le même numéro écrit avec l'indicatif international
    (`+225`/`00225` suivi des 10 chiffres) sont ramenés à la **même** clé
    locale à 10 chiffres — sinon deux saisies du même client créent deux
    fiches distinctes (point technique identifié dans le rapport de fusion,
    confirmé par `test_sync_matches_same_client_with_dashes_or_country_code_variants`).
    Les numéros hors Côte d'Ivoire gardent le comportement d'origine (chiffres
    bruts, `+` conservé si saisi ainsi) : on ne devine pas leur plan de
    numérotation national."""
    raw = _as_text(value)
    if not raw:
        return ""
    digits = re.sub(r"\D", "", raw)
    if not digits:
        return ""

    local_ci = _as_ivorian_local_number(digits)
    if local_ci:
        return local_ci

    return f"+{digits}" if raw.lstrip().startswith("+") else digits


def _as_ivorian_local_number(digits: str) -> str | None:
    """Renvoie la forme locale à 10 chiffres (ex. `0701020304`) si `digits`
    correspond à un numéro ivoirien saisi localement ou avec son indicatif
    international, sinon `None`."""
    if len(digits) == 10 and digits[0] == "0":
        return digits
    for prefix in ("00225", "225"):
        if digits.startswith(prefix) and len(digits) == len(prefix) + 10:
            remainder = digits[len(prefix):]
            if remainder[0] == "0":
                return remainder
    return None


def _field_identity_role(field: dict) -> str | None:
    explicit = field.get("identity_role")
    if explicit in {"full_name", "phone", "email"}:
        return explicit

    field_id = _normalized_label(field.get("id"))
    label = _normalized_label(field.get("label"))
    haystack = f"{field_id} {label}"
    field_type = field.get("type")

    if field_type == "email" or any(token in haystack for token in ("email", "e-mail", "courriel", "mail")):
        return "email"
    if field_type == "phone" or any(token in haystack for token in ("telephone", "tel", "phone", "mobile", "whatsapp", "contact")):
        return "phone"
    if any(token in haystack for token in ("nom", "name", "fullname", "full_name", "identite")):
        return "full_name"
    return None


def extract_client_identity(template: FormTemplate | None, responses: dict) -> dict[str, str]:
    """Extrait l'identité client à partir du schéma, sans dépendre d'un libellé unique."""
    identity: dict[str, str] = {}
    if not template:
        return identity

    for field in template.fields_schema:
        role = _field_identity_role(field)
        if not role or role in identity:
            continue
        value = _as_text(responses.get(field.get("id")))
        if not value:
            continue
        if role == "email":
            value = normalize_email(value)
        elif role == "phone":
            value = normalize_phone(value)
        if value:
            identity[role] = value
    return identity


def find_or_create_client(organization: Organization, identity: dict[str, str]) -> tuple[Client | None, str | None]:
    """Rattache par email puis téléphone, sinon crée une fiche si le nom existe."""
    full_name = identity.get("full_name", "")
    email = identity.get("email", "")
    phone = identity.get("phone", "")

    if not full_name:
        return None, None

    client = None
    if email:
        client = Client.objects.filter(organization=organization, email__iexact=email).first()
    if not client and phone:
        candidates = Client.objects.filter(organization=organization).exclude(phone="")
        client = next((item for item in candidates if normalize_phone(item.phone) == phone), None)

    if client:
        changed_fields = []
        if not client.full_name and full_name:
            client.full_name = full_name
            changed_fields.append("full_name")
        if not client.email and email:
            client.email = email
            changed_fields.append("email")
        if not client.phone and phone:
            client.phone = phone
            changed_fields.append("phone")
        if changed_fields:
            client.save(update_fields=changed_fields)
        return client, "matched"

    client = Client.objects.create(
        organization=organization,
        full_name=full_name,
        phone=phone,
        email=email,
    )
    return client, "created"


def _client_for_existing_checkin(key: str) -> tuple[str | None, str | None]:
    existing = CheckIn.objects.select_related("client").filter(idempotency_key=key).first()
    if existing and existing.client_id:
        return str(existing.client_id), "matched"
    return None, None


def sync_single_checkin(item: dict) -> SyncOutcome:
    key = str(item["idempotency_key"])
    organization, template, access_point = resolve_target(item["qr_token"])
    if not organization:
        return SyncOutcome(key, "unknown_organization")

    missing = missing_required_fields(template, item["responses"], item.get("signature_blob", ""))
    if missing:
        return SyncOutcome(key, "missing_required_fields", missing)

    try:
        with transaction.atomic():
            client = None
            client_action = None
            if organization.karnet_enabled:
                identity = extract_client_identity(template, item["responses"])
                client, client_action = find_or_create_client(organization, identity)

            CheckIn.objects.create(
                organization=organization,
                form_template=template,
                client=client,
                access_point=access_point,
                idempotency_key=item["idempotency_key"],
                responses=item["responses"],
                signature_blob=item.get("signature_blob", ""),
                created_at_client=item["created_at_client"],
            )
            if access_point:
                AccessPoint.objects.filter(id=access_point.id).update(last_seen_at=timezone.now())
        return SyncOutcome(
            key,
            "created",
            client_id=str(client.id) if client else None,
            client_action=client_action,
        )
    except IntegrityError:
        client_id, client_action = _client_for_existing_checkin(key)
        return SyncOutcome(key, "already_exists", client_id=client_id, client_action=client_action)
