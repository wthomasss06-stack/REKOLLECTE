"""Conservation, purge, droits des personnes et mention d'information (brief P0, dossier ARTCI).

Ce module ne dépend PAS de `services` au chargement (services l'importe) : les aides d'identité sont importées à l'appel."""
import logging
import random
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models.fields.json import KeyTextTransform
from django.utils import timezone

from apps.accounts.models import AuditEvent
from apps.billing.services import apply_entitlements_to_schema
from apps.organizations.models import Organization

from .alerts import public_fields_schema
from .models import CheckIn

logger = logging.getLogger("qr_register.privacy")

OTHER_REASON = "Autre"


# --- Durées de conservation ------------------------------------------------------------------------------------------

def retention_days_for(organization: Organization) -> int:
    """Durée de conservation des visites : réglage de l'établissement, sinon défaut de la plateforme. Distincte de la fenêtre
    d'historique affichée par le plan (masquer n'est pas supprimer)."""
    return organization.retention_visits_days or settings.RETENTION_VISITS_DAYS


def retention_policy(organization: Organization) -> dict:
    return {
        "visits_days": retention_days_for(organization),
        "visits_default_days": settings.RETENTION_VISITS_DAYS,
        "clients_days": settings.RETENTION_CLIENTS_DAYS,
        "audit_days": settings.RETENTION_AUDIT_DAYS,
        "payments_years": settings.RETENTION_PAYMENTS_YEARS,
    }


def purge_expired_visits(organization: Organization | None = None, *, now=None, dry_run: bool = False) -> dict:
    """Supprime les visites échues. Ne touche JAMAIS aux paiements ni aux factures (autre modèle, conservés 10 ans)."""
    now = now or timezone.now()
    organizations = [organization] if organization else list(Organization.objects.all())
    deleted_by_org: dict[str, int] = {}
    for org in organizations:
        cutoff = now - timedelta(days=retention_days_for(org))
        expired = CheckIn.objects.filter(organization=org, created_at_client__lt=cutoff)
        count = expired.count()
        if not count:
            continue
        deleted_by_org[str(org.id)] = count
        if not dry_run:
            expired.delete()
            AuditEvent.objects.create(organization=org, action="privacy.visits_purged",
                                      metadata={"deleted": count, "cutoff": cutoff.isoformat(), "retention_days": retention_days_for(org)})
    return {"dry_run": dry_run, "deleted": sum(deleted_by_org.values()), "organizations": deleted_by_org}


def maybe_purge_after_sync(organization: Organization, probability: float = 0.02) -> None:
    """Purge « au fil de l'eau » (comme analytics) pour les environnements sans tâche planifiée. Ne casse JAMAIS une synchronisation."""
    try:
        if random.random() < probability:
            purge_expired_visits(organization)
    except Exception:
        logger.exception("privacy.purge: échec de la purge opportuniste")


# --- Minimisation : motifs prédéfinis, numéro de pièce ----------------------------------------------------------------

def public_visit_reasons(organization: Organization) -> list:
    reasons = list(organization.visit_reasons or [])
    return [reason for reason in reasons if reason != OTHER_REASON] if organization.restrict_visit_reasons else reasons


def apply_privacy_options(fields, organization: Organization) -> list:
    """Motifs prédéfinis uniquement : « Autre » (texte libre) est retiré des listes, où un visiteur pourrait écrire une donnée de santé."""
    if not organization.restrict_visit_reasons:
        return list(fields or [])
    result = []
    for field in fields or []:
        if isinstance(field, dict) and field.get("type") == "select" and field.get("options"):
            field = {**field, "options": [option for option in field["options"] if option != OTHER_REASON]}
        result.append(field)
    return result


def mask_document_number(value) -> str:
    """Numéro de pièce masqué : seuls les 3 derniers caractères restent (de quoi reconnaître la pièce, pas l'identifier)."""
    text = str(value or "").strip()
    return "•" * max(len(text) - 3, 0) + text[-3:] if len(text) > 3 else "•" * len(text)


def sanitize_responses(organization: Organization, fields, responses: dict) -> dict:
    """Réponses telles qu'elles sont ENREGISTRÉES : texte OCR brut jamais conservé, numéro de pièce masqué (sauf choix contraire
    de l'établissement), précision « Autre » écartée quand les motifs sont prédéfinis."""
    cleaned = dict(responses)
    for field in fields or []:
        if not isinstance(field, dict) or not field.get("id"):
            continue
        field_id = field["id"]
        if field.get("type") == "document_scan" and isinstance(cleaned.get(field_id), dict):
            value = {**cleaned[field_id]}
            value.pop("raw_text", None)
            extracted = value.get("extracted")
            if isinstance(extracted, dict) and extracted.get("document_number") and not organization.store_document_number:
                value["extracted"] = {**extracted, "document_number": mask_document_number(extracted["document_number"])}
            cleaned[field_id] = value
        if organization.restrict_visit_reasons and field.get("type") == "select":
            cleaned.pop(f"{field_id}_autre", None)
    return cleaned


def public_schema(template, organization: Organization) -> list:
    """Schéma réellement servi (et exigé) pour un visiteur : liste « Qui venez-vous voir ? », champs inclus dans le plan, motifs prédéfinis."""
    # La lecture de pièce d'identité est retirée du produit : un champ « document_scan » resté dans un ancien formulaire n'est plus servi.
    fields = [field for field in public_fields_schema(template, organization) if not (isinstance(field, dict) and field.get("type") == "document_scan")]
    return apply_privacy_options(apply_entitlements_to_schema(fields, organization), organization)


# --- Mention d'information (sous le formulaire visiteur) ---------------------------------------------------------------

def build_privacy_notice(organization: Organization, fields) -> dict:
    """Responsable, finalité, catégories, destinataires, droits, durée, transfert. Textes de départ À FAIRE VALIDER dans le dossier ARTCI."""
    contact = (organization.privacy_contact or "").strip()
    categories = [field["label"] for field in fields if isinstance(field, dict) and field.get("label") and field.get("type") != "checkbox"]
    categories.append("date et heure de la visite")
    return {
        "controller": organization.name,
        "contact": contact,
        "purpose": f"Tenir le registre d’accès et d’accueil de {organization.name} (sécurité des lieux et suivi des visites).",
        "categories": categories,
        "recipients": f"{organization.name} et les personnes habilitées de son équipe ; AKATech Studio, qui héberge et exploite le service pour son compte.",
        "retention": f"{retention_days_for(organization)} jours à compter de la visite, puis suppression automatique.",
        "rights": "Vous pouvez demander l’accès à vos informations, leur rectification, leur suppression, ou vous opposer à leur traitement, "
                  + (f"en écrivant à {contact}." if contact else f"en vous adressant à l’accueil de {organization.name}."),
        "transfer": settings.PRIVACY_TRANSFER_NOTE,
    }


# --- Droits des personnes : export et suppression complets pour UNE personne --------------------------------------------

def _subject_identity(phone: str, email: str) -> tuple[str, str]:
    from .services import normalize_email, normalize_phone

    normalized_phone = normalize_phone(phone) if phone else ""
    normalized_email = normalize_email(email) if email else ""
    if not normalized_phone and not normalized_email:
        raise ValueError("Indiquez un numéro de téléphone ou une adresse e-mail.")
    return normalized_phone, normalized_email


def _identity_field_ids(organization: Organization) -> tuple[list[str], list[str]]:
    from .services import _field_identity_role

    phones: list[str] = []
    emails: list[str] = []
    for schema in organization.form_templates.values_list("fields_schema", flat=True):
        for field in schema or []:
            if not isinstance(field, dict) or not field.get("id"):
                continue
            role = _field_identity_role(field)
            if role == "phone" and field["id"] not in phones:
                phones.append(field["id"])
            elif role == "email" and field["id"] not in emails:
                emails.append(field["id"])
    return phones, emails


def find_subject_records(organization: Organization, phone: str = "", email: str = ""):
    """Fiches clients et visites d'une personne, retrouvées par téléphone et/ou e-mail EXACTS (jamais par nom : on ne supprime pas
    les homonymes). Les visites sans fiche client sont retrouvées dans les champs d'identité, sans charger photos ni signatures."""
    from apps.karnet.models import Client

    from .services import normalize_email, normalize_phone

    wanted_phone, wanted_email = _subject_identity(phone, email)
    # Comparaison sur les valeurs NORMALISÉES (une fiche ancienne peut avoir été saisie « 07 07 07 07 07 » ou « +225… »).
    client_ids = [
        client_id
        for client_id, client_phone, client_email in Client.objects.filter(organization=organization).values_list("id", "phone", "email")
        if (wanted_phone and client_phone and normalize_phone(client_phone) == wanted_phone)
        or (wanted_email and client_email and normalize_email(client_email) == wanted_email)
    ]
    clients = list(Client.objects.filter(organization=organization, id__in=client_ids))
    checkin_ids = set(CheckIn.objects.filter(organization=organization, client__in=clients).values_list("id", flat=True))

    phone_ids, email_ids = _identity_field_ids(organization)
    annotations = {f"p{index}": KeyTextTransform(field_id, "responses") for index, field_id in enumerate(phone_ids)}
    annotations |= {f"e{index}": KeyTextTransform(field_id, "responses") for index, field_id in enumerate(email_ids)}
    if annotations:
        names = list(annotations)
        rows = CheckIn.objects.filter(organization=organization).annotate(**annotations).values_list("id", *names).iterator(chunk_size=2000)
        for checkin_id, *values in rows:
            for name, value in zip(names, values):
                if not value:
                    continue
                if name[0] == "p" and wanted_phone and normalize_phone(value) == wanted_phone:
                    checkin_ids.add(checkin_id)
                elif name[0] == "e" and wanted_email and normalize_email(value) == wanted_email:
                    checkin_ids.add(checkin_id)
    return clients, sorted(checkin_ids, key=str)


def export_subject_data(organization: Organization, phone: str = "", email: str = "") -> dict:
    clients, checkin_ids = find_subject_records(organization, phone, email)
    checkins = CheckIn.objects.filter(id__in=checkin_ids).select_related("form_template").order_by("created_at_client")
    return {
        "generated_at": timezone.now().isoformat(),
        "organization": organization.name,
        "clients": [{"id": str(c.id), "full_name": c.full_name, "phone": c.phone, "email": c.email, "note": c.note, "created_at": c.created_at.isoformat()} for c in clients],
        "checkins": [
            {"id": str(ci.id), "created_at": ci.created_at_client.isoformat(), "form": ci.form_template.title if ci.form_template else "",
             "responses": ci.responses, "signature": bool(ci.signature_blob)}
            for ci in checkins
        ],
    }


def delete_subject_data(organization: Organization, phone: str = "", email: str = "", *, actor=None) -> dict:
    """Supprime les visites de la personne. Sa fiche client est supprimée, ou ANONYMISÉE si des réservations y sont rattachées
    (l'historique d'exploitation reste cohérent). Le journal ne garde jamais le numéro ni l'e-mail, seulement un indice."""
    clients, checkin_ids = find_subject_records(organization, phone, email)
    removed_clients = anonymized_clients = 0
    with transaction.atomic():
        CheckIn.objects.filter(id__in=checkin_ids).delete()
        for client in clients:
            if client.reservations.exists():
                client.full_name, client.phone, client.email, client.note = "Personne supprimée", "", "", ""
                client.save(update_fields=["full_name", "phone", "email", "note"])
                anonymized_clients += 1
            else:
                client.delete()
                removed_clients += 1
        hint = (phone.strip()[-3:] if phone else "") or (f"…@{email.split('@')[-1]}" if "@" in email else "")
        AuditEvent.objects.create(organization=organization, actor=actor, action="privacy.subject_deleted",
                                  metadata={"checkins_deleted": len(checkin_ids), "clients_deleted": removed_clients, "clients_anonymized": anonymized_clients, "hint": hint})
    return {"checkins_deleted": len(checkin_ids), "clients_deleted": removed_clients, "clients_anonymized": anonymized_clients}
