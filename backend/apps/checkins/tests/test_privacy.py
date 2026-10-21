"""P0 du brief : conservation et purge, droits des personnes, numéro de pièce masqué, motifs prédéfinis, mention d'information, CGU."""
from datetime import timedelta
from decimal import Decimal
from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.accounts.models import AuditEvent
from apps.checkins.models import CheckIn, FormTemplate
from apps.checkins.privacy import mask_document_number, purge_expired_visits
from apps.karnet.models import Client, Reservation
from apps.karnet.tests.helpers import enable_karnet, make_resource
from apps.testing_utils import auth_client, valid_checkin_payload

SCHEMA = [
    {"id": "nom", "type": "text", "label": "Nom", "required": True},
    {"id": "telephone", "type": "phone", "label": "Téléphone", "required": True},
    {"id": "email", "type": "email", "label": "E-mail", "required": False},
    {"id": "motif", "type": "select", "label": "Motif", "required": False, "options": ["Rendez-vous", "Autre"]},
    {"id": "piece", "type": "document_scan", "label": "Pièce", "required": False},
    {"id": "signature", "type": "signature", "label": "Signature", "required": True},
]


def _checkin(organization, template, responses, age_days=0, key="1"):
    return CheckIn.objects.create(organization=organization, form_template=template, idempotency_key=f"00000000-0000-0000-0000-{key.zfill(12)}",
                                  responses=responses, created_at_client=timezone.now() - timedelta(days=age_days))


@pytest.fixture
def template(db, organization):
    return FormTemplate.objects.create(organization=organization, title="Registre", fields_schema=SCHEMA)


# --- conservation et purge -----------------------------------------------------------------------------------------

def test_purge_deletes_only_expired_visits_using_the_default_or_custom_retention(db, organization, template):
    _checkin(organization, template, {"nom": "Vieux"}, age_days=400, key="1")
    _checkin(organization, template, {"nom": "Récent"}, age_days=10, key="2")
    assert purge_expired_visits(dry_run=True)["deleted"] == 1 and CheckIn.objects.count() == 2

    purge_expired_visits()
    assert list(CheckIn.objects.values_list("responses__nom", flat=True)) == ["Récent"]

    organization.retention_visits_days = 30
    organization.save(update_fields=["retention_visits_days"])
    _checkin(organization, template, {"nom": "Quarante jours"}, age_days=40, key="3")
    purge_expired_visits()
    assert CheckIn.objects.count() == 1
    assert AuditEvent.objects.filter(organization=organization, action="privacy.visits_purged").count() == 2


def test_purge_command_supports_dry_run(db, organization, template):
    _checkin(organization, template, {"nom": "Vieux"}, age_days=500)
    out = StringIO()
    call_command("purge_expired_visits", "--dry-run", stdout=out)
    assert "1 visite(s) seraient supprimées" in out.getvalue() and CheckIn.objects.count() == 1
    call_command("purge_expired_visits", stdout=out)
    assert CheckIn.objects.count() == 0


def test_retention_is_configurable_by_the_boss_within_limits(db, boss_user, organization):
    client = auth_client(boss_user)
    assert client.patch("/api/v1/org/me/", {"retention_visits_days": 90}, format="json").data["retention_visits_days"] == 90
    assert client.patch("/api/v1/org/me/", {"retention_visits_days": 5}, format="json").status_code == 400
    assert client.get("/api/v1/privacy/retention/").data["visits_days"] == 90
    assert client.get("/api/v1/privacy/retention/").data["payments_years"] == 10


# --- droits des personnes ---------------------------------------------------------------------------------------------

def test_subject_export_finds_a_person_by_phone_or_email_but_never_by_name(db, boss_user, organization, template):
    _checkin(organization, template, {"nom": "Awa Koné", "telephone": "+2250707070707", "email": "awa@example.com"}, key="1")
    _checkin(organization, template, {"nom": "Awa Koné", "telephone": "+2250101010101"}, key="2")  # homonyme : autre personne
    client = auth_client(boss_user)

    by_phone = client.post("/api/v1/privacy/subject/export/", {"phone": "+225 07 07 07 07 07"}, format="json")
    by_email = client.post("/api/v1/privacy/subject/export/", {"email": "AWA@example.com"}, format="json")
    by_name = client.post("/api/v1/privacy/subject/export/", {"phone": "", "email": ""}, format="json")

    assert by_phone.status_code == 200 and len(by_phone.data["checkins"]) == 1
    assert by_email.status_code == 200 and len(by_email.data["checkins"]) == 1
    assert by_name.status_code == 400  # un nom seul ne suffit jamais : on ne supprime pas les homonymes
    assert by_phone["Cache-Control"] == "no-store"


def test_subject_deletion_removes_only_that_person_and_logs_no_identifier(db, boss_user, organization, template):
    _checkin(organization, template, {"nom": "Awa", "telephone": "+2250707070707"}, key="1")
    _checkin(organization, template, {"nom": "Awa bis", "telephone": "0707070707"}, key="2")
    _checkin(organization, template, {"nom": "Yao", "telephone": "+2250101010101"}, key="3")
    client = auth_client(boss_user)

    refused = client.post("/api/v1/privacy/subject/delete/", {"phone": "+2250707070707"}, format="json")
    done = client.post("/api/v1/privacy/subject/delete/", {"phone": "+2250707070707", "confirm": True}, format="json")

    assert refused.status_code == 400 and done.status_code == 200
    assert list(CheckIn.objects.values_list("responses__nom", flat=True)) == ["Yao"]
    event = AuditEvent.objects.get(organization=organization, action="privacy.subject_deleted")
    assert "0707070707" not in str(event.metadata) and event.metadata["checkins_deleted"] == 2


def test_subject_deletion_anonymizes_a_client_who_has_reservations(db, boss_user, organization, template):
    enable_karnet(organization)
    person = Client.objects.create(organization=organization, full_name="Awa Koné", phone="+2250707070707", email="awa@example.com")
    resource = make_resource(organization)
    Reservation.objects.create(organization=organization, client=person, resource=resource, quantity=1, unit_price=Decimal("30000"), total_amount=Decimal("30000"))
    lone = Client.objects.create(organization=organization, full_name="Sans réservation", phone="+2250202020202")

    result = auth_client(boss_user).post("/api/v1/privacy/subject/delete/", {"phone": "+2250707070707", "confirm": True}, format="json").data
    person.refresh_from_db()

    assert result["clients_anonymized"] == 1 and (person.full_name, person.phone, person.email) == ("Personne supprimée", "", "")
    assert Reservation.objects.count() == 1  # l'historique d'exploitation reste cohérent
    assert auth_client(boss_user).post("/api/v1/privacy/subject/delete/", {"phone": "+2250202020202", "confirm": True}, format="json").data["clients_deleted"] == 1
    assert not Client.objects.filter(id=lone.id).exists()


def test_subject_rights_are_reserved_to_the_boss(db, staff_user, gerant_user):
    for user in (staff_user, gerant_user):
        client = auth_client(user)
        assert client.post("/api/v1/privacy/subject/export/", {"phone": "+2250707070707"}, format="json").status_code == 403
        assert client.post("/api/v1/privacy/subject/delete/", {"phone": "+2250707070707", "confirm": True}, format="json").status_code == 403


# --- minimisation ---------------------------------------------------------------------------------------------------------

def test_document_number_is_masked_and_raw_ocr_text_is_never_stored(db, api_client, organization, template):
    scan = {"extracted": {"last_name": "KONE", "document_number": "CI0123456789"}, "raw_text": "KONE CI0123456789 ...", "document_type": "cni"}
    payload = valid_checkin_payload(organization.qr_secure_token, responses={"nom": "Awa", "telephone": "+2250707070707", "piece": scan})

    assert api_client.post("/api/v1/checkins/sync/", {"checkins": [payload]}, format="json").data["processed"][0]["status"] == "created"

    stored = CheckIn.objects.get().responses["piece"]
    assert stored["extracted"]["document_number"] == "•" * 9 + "789"
    assert stored["extracted"]["last_name"] == "KONE" and "raw_text" not in stored


def test_document_number_is_kept_when_the_establishment_chooses_so(db, api_client, organization, template):
    organization.store_document_number = True
    organization.save(update_fields=["store_document_number"])
    scan = {"extracted": {"document_number": "CI0123456789"}, "raw_text": "x"}
    payload = valid_checkin_payload(organization.qr_secure_token, responses={"nom": "Awa", "telephone": "+2250707070707", "piece": scan})

    api_client.post("/api/v1/checkins/sync/", {"checkins": [payload]}, format="json")

    assert CheckIn.objects.get().responses["piece"]["extracted"]["document_number"] == "CI0123456789"


def test_mask_document_number_edge_cases():
    assert mask_document_number("") == "" and mask_document_number("AB") == "••" and mask_document_number("ABC") == "•••" and mask_document_number("ABCD") == "•BCD"


def test_predefined_reasons_remove_other_from_the_form_and_drop_free_text(db, api_client, boss_user, organization, template):
    assert auth_client(boss_user).patch("/api/v1/org/me/", {"restrict_visit_reasons": True}, format="json").status_code == 200

    form = api_client.get(f"/api/v1/public/forms/{organization.qr_secure_token}/").data
    motif = next(field for field in form["fields_schema"] if field["id"] == "motif")
    payload = valid_checkin_payload(organization.qr_secure_token, responses={"nom": "Awa", "telephone": "+2250707070707", "motif": "Autre", "motif_autre": "Je suis malade"})
    api_client.post("/api/v1/checkins/sync/", {"checkins": [payload]}, format="json")

    assert motif["options"] == ["Rendez-vous"]
    assert "motif_autre" not in CheckIn.objects.get().responses


# --- mention d'information -----------------------------------------------------------------------------------------------

def test_public_form_carries_the_privacy_notice_with_the_legal_headings(db, api_client, boss_user, organization, template):
    organization.retention_visits_days = 90
    organization.privacy_contact = "privacy@cabinet.ci"
    organization.save(update_fields=["retention_visits_days", "privacy_contact"])

    notice = api_client.get(f"/api/v1/public/forms/{organization.qr_secure_token}/").data["privacy_notice"]

    assert notice["controller"] == "Cabinet Test" and notice["contact"] == "privacy@cabinet.ci"
    assert {"purpose", "categories", "recipients", "retention", "rights", "transfer"} <= set(notice)
    assert "90 jours" in notice["retention"] and "privacy@cabinet.ci" in notice["rights"]
    assert "Nom" in notice["categories"] and "date et heure de la visite" in notice["categories"]


# --- conditions d'utilisation -----------------------------------------------------------------------------------------------

def test_terms_acceptance_is_traced_on_the_account(db, boss_user, organization, settings):
    client = auth_client(boss_user)
    me = client.get("/api/v1/auth/me/").data
    assert me["terms_accepted_at"] is None and me["terms_current_version"] == settings.TERMS_VERSION

    assert client.post("/api/v1/auth/accept-terms/", {"version": "ancienne"}, format="json").status_code == 400
    accepted = client.post("/api/v1/auth/accept-terms/", {"version": settings.TERMS_VERSION}, format="json")

    assert accepted.status_code == 200 and accepted.data["terms_version"] == settings.TERMS_VERSION and accepted.data["terms_accepted_at"]
    assert AuditEvent.objects.filter(organization=organization, action="terms.accepted").count() == 1
