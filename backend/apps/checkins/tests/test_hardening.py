"""Registre, export CSV, synchronisation publique, points d'accueil : correctifs d'audit."""
import uuid
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.checkins.models import AccessPoint, CheckIn, FormTemplate
from apps.organizations.models import Organization
from apps.testing_utils import auth_client, valid_checkin_payload

SYNC_URL = "/api/v1/checkins/sync/"


def _export(user):
    response = auth_client(user).get("/api/v1/checkins/export/")
    assert response.status_code == 200
    return b"".join(response.streaming_content).decode("utf-8")


def _checkin(organization, template, responses, **extra):
    return CheckIn.objects.create(organization=organization, form_template=template, idempotency_key=uuid.uuid4(), responses=responses, created_at_client=timezone.now(), **extra)


# --- Export CSV ---------------------------------------------------------------------------------------------------

def test_csv_neutralises_formula_injection_but_keeps_phone_numbers(db, boss_user, organization, form_template):
    _checkin(organization, form_template, {"nom": '=HYPERLINK("http://evil.example","clic")', "telephone": "+225 07 07 07 07 07"}, signature_blob="data:...")
    _checkin(organization, form_template, {"nom": "@SUM(A1:A9)", "telephone": "-1"})
    _checkin(organization, form_template, {"nom": "+cmd|' /C calc'!A0", "telephone": "(225) 01-02"})

    content = _export(boss_user)

    assert "'=HYPERLINK" in content and "'@SUM" in content and "'+cmd" in content
    assert ",=HYPERLINK" not in content and ",@SUM" not in content
    assert "+225 07 07 07 07 07" in content and "'+225" not in content  # un numéro n'est pas une formule
    assert "(225) 01-02" in content


def test_csv_starts_with_a_bom_so_excel_reads_accents(db, boss_user, organization, form_template):
    assert _export(boss_user).startswith("﻿Heure d'arrivée")


def test_csv_has_one_column_per_field_even_when_templates_share_fields(db, boss_user, organization, form_template):
    FormTemplate.objects.create(organization=organization, title="Autre", fields_schema=[
        {"id": "nom", "type": "text", "label": "Nom & Prénoms"},
        {"id": "societe", "type": "text", "label": "Société"},
    ])
    _checkin(organization, form_template, {"nom": "Awa", "telephone": "0707", "societe": "ACME"})

    header, row = _export(boss_user).strip().splitlines()[:2]

    assert header.lstrip("﻿").split(",").count("Nom & Prénoms") == 1
    assert "Société" in header and row.count("Awa") == 1


def test_csv_summarises_document_scans_without_image_or_raw_text(db, boss_user, organization):
    template = FormTemplate.objects.create(organization=organization, title="CNI", fields_schema=[
        {"id": "piece", "type": "document_scan", "label": "Pièce"}, {"id": "photo", "type": "photo", "label": "Photo"},
    ])
    _checkin(organization, template, {
        "piece": {"document_type": "cni", "extracted": {"last_name": "KOUASSI", "document_number": "C0012"}, "raw_text": "TEXTE BRUT", "image": "data:image/jpeg;base64,AAAA"},
        "photo": "data:image/jpeg;base64,BBBB",
    })

    content = _export(boss_user)

    assert "last_name: KOUASSI" in content and "document_number: C0012" in content
    assert "TEXTE BRUT" not in content and "base64" not in content
    assert "Fourni" in content


# --- Synchronisation publique ---------------------------------------------------------------------------------------

def test_sync_ignores_garbage_items_instead_of_crashing(db, api_client, organization, form_template):
    response = api_client.post(SYNC_URL, {"checkins": ["texte", 12, None, valid_checkin_payload(organization.qr_secure_token)]}, format="json")

    assert response.status_code == 200
    assert [item["status"] for item in response.data["processed"]] == ["invalid", "invalid", "invalid", "created"]


def test_sync_rejects_oversized_signature_and_response_payloads(db, api_client, organization, form_template):
    huge_signature = valid_checkin_payload(organization.qr_secure_token, signature_blob="x" * 700_000)
    huge_responses = valid_checkin_payload(organization.qr_secure_token, responses={f"k{i}": "v" for i in range(500)})

    response = api_client.post(SYNC_URL, {"checkins": [huge_signature, huge_responses]}, format="json")

    assert [item["status"] for item in response.data["processed"]] == ["invalid", "invalid"]
    assert CheckIn.objects.count() == 0


def test_sync_clamps_a_future_client_clock_but_keeps_a_normal_offline_date(db, api_client, organization, form_template):
    future = valid_checkin_payload(organization.qr_secure_token, created_at_client=(timezone.now() + timedelta(days=400)).isoformat())
    yesterday = timezone.now() - timedelta(days=1)
    offline = valid_checkin_payload(organization.qr_secure_token, created_at_client=yesterday.isoformat())

    api_client.post(SYNC_URL, {"checkins": [future, offline]}, format="json")

    assert CheckIn.objects.get(idempotency_key=future["idempotency_key"]).created_at_client <= timezone.now()
    assert abs(CheckIn.objects.get(idempotency_key=offline["idempotency_key"]).created_at_client - yesterday) < timedelta(seconds=1)


def test_replaying_a_key_through_another_establishment_never_reveals_its_client(db, api_client, organization, form_template):
    other = Organization.objects.create(name="Autre", qr_secure_token="autre-token", karnet_enabled=True)
    FormTemplate.objects.create(organization=other, title="Registre", fields_schema=form_template.fields_schema, is_default=True)
    organization.karnet_enabled = True
    organization.save(update_fields=["karnet_enabled"])
    first = valid_checkin_payload(organization.qr_secure_token)
    api_client.post(SYNC_URL, {"checkins": [first]}, format="json")

    replay = api_client.post(SYNC_URL, {"checkins": [{**first, "qr_token": "autre-token"}]}, format="json")

    outcome = replay.data["processed"][0]
    assert outcome["status"] == "already_exists" and "client_id" not in outcome


def test_public_page_and_sync_choose_the_same_form_when_none_is_default(db, api_client, organization):
    first = FormTemplate.objects.create(organization=organization, title="A", fields_schema=[{"id": "nom", "type": "text", "label": "Nom", "required": True}])
    FormTemplate.objects.create(organization=organization, title="B", fields_schema=[{"id": "tel", "type": "phone", "label": "Tél", "required": True}])

    page = api_client.get(f"/api/v1/public/forms/{organization.qr_secure_token}/")
    sync = api_client.post(SYNC_URL, {"checkins": [valid_checkin_payload(organization.qr_secure_token, responses={})]}, format="json")

    assert page.data["form_title"] == "A" == first.title
    assert sync.data["processed"][0]["fields"] == ["nom"]  # validé contre le même formulaire que celui affiché


# --- Filtres du registre ------------------------------------------------------------------------------------------

@pytest.mark.parametrize("query", ["from=pas-une-date", "to=2026-13-45", "client=pas-un-uuid"])
def test_invalid_list_filters_are_a_400_not_a_500(db, boss_user, query):
    assert auth_client(boss_user).get(f"/api/v1/checkins/?{query}").status_code == 400


def test_date_only_upper_bound_includes_that_whole_day(db, boss_user, organization, form_template):
    afternoon = timezone.make_aware(timezone.datetime(2026, 5, 10, 15, 30))
    CheckIn.objects.create(organization=organization, form_template=form_template, idempotency_key=uuid.uuid4(), responses={}, created_at_client=afternoon)

    inclusive = auth_client(boss_user).get("/api/v1/checkins/?from=2026-05-10&to=2026-05-10")
    before = auth_client(boss_user).get("/api/v1/checkins/?to=2026-05-09")

    assert inclusive.data["count"] == 1 and before.data["count"] == 0


# --- Points d'accueil et formulaires ---------------------------------------------------------------------------------

def test_duplicate_access_point_name_is_a_400_on_create_and_rename(db, boss_user, organization, form_template):
    api = auth_client(boss_user)
    body = {"name": "Entrée nord", "form_template": str(form_template.id)}
    assert api.post("/api/v1/access-points/", body, format="json").status_code == 201
    assert api.post("/api/v1/access-points/", {**body, "name": "entrée NORD"}, format="json").status_code == 400
    other = api.post("/api/v1/access-points/", {**body, "name": "Entrée sud"}, format="json")
    assert api.patch(f"/api/v1/access-points/{other.data['id']}/", {"name": "Entrée nord"}, format="json").status_code == 400
    assert api.patch(f"/api/v1/access-points/{other.data['id']}/", {"name": "Entrée sud"}, format="json").status_code == 200  # son propre nom reste valide


def test_deleting_a_form_keeps_its_access_points_and_qr_codes(db, boss_user, organization):
    keep = FormTemplate.objects.create(organization=organization, title="Garder", fields_schema=[], is_default=False)
    doomed = FormTemplate.objects.create(organization=organization, title="Supprimer", fields_schema=[], is_default=True)
    point = AccessPoint.objects.create(organization=organization, form_template=doomed, name="Comptoir", secure_token="tok-comptoir")

    response = auth_client(boss_user).delete(f"/api/v1/form-templates/{doomed.id}/")

    assert response.status_code == 204
    point.refresh_from_db()  # le point d'accueil (et son QR imprimé) existe toujours
    assert point.form_template_id == keep.id
    keep.refresh_from_db()
    assert keep.is_default  # le formulaire par défaut passe au suivant
