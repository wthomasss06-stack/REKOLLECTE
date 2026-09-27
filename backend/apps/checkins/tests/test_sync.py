"""Flows critiques : idempotence anti-doublon + validation serveur des champs
obligatoires (le client PWA peut etre contourne, cf. senior-dev-guardrails)."""
from apps.checkins.models import CheckIn

from apps.testing_utils import valid_checkin_payload


def test_sync_creates_checkin(db, api_client, organization, form_template):
    payload = valid_checkin_payload(organization.qr_secure_token)

    response = api_client.post("/api/v1/checkins/sync/", {"checkins": [payload]}, format="json")

    assert response.status_code == 200
    assert response.data["processed"][0]["status"] == "created"
    assert CheckIn.objects.filter(organization=organization).count() == 1


def test_sync_is_idempotent_on_replay(db, api_client, organization, form_template):
    """Simule une PWA qui renvoie la meme fiche apres une coupure reseau survenue
    juste avant reception de la reponse serveur."""
    payload = valid_checkin_payload(organization.qr_secure_token)

    first = api_client.post("/api/v1/checkins/sync/", {"checkins": [payload]}, format="json")
    second = api_client.post("/api/v1/checkins/sync/", {"checkins": [payload]}, format="json")

    assert first.data["processed"][0]["status"] == "created"
    assert second.data["processed"][0]["status"] == "already_exists"
    assert CheckIn.objects.filter(organization=organization).count() == 1


def test_sync_rejects_missing_required_field(db, api_client, organization, form_template):
    payload = valid_checkin_payload(organization.qr_secure_token, responses={"nom": "Kouassi Jean"})

    response = api_client.post("/api/v1/checkins/sync/", {"checkins": [payload]}, format="json")

    assert response.data["processed"][0]["status"] == "missing_required_fields"
    assert "telephone" in response.data["processed"][0]["fields"]
    assert CheckIn.objects.count() == 0


def test_sync_never_trusts_client_supplied_organization_id(db, api_client, organization, form_template):
    """Le contrat n'accepte qu'un qr_token — un organization_id fourni par le client
    n'a tout simplement aucun champ ou aller (protection IDOR)."""
    payload = valid_checkin_payload("token-qui-nexiste-pas")

    response = api_client.post("/api/v1/checkins/sync/", {"checkins": [payload]}, format="json")

    assert response.data["processed"][0]["status"] == "unknown_organization"
    assert CheckIn.objects.count() == 0


def test_suspended_organization_cannot_receive_public_or_offline_checkins(db, api_client, organization, form_template):
    organization.is_suspended = True
    organization.save(update_fields=["is_suspended"])

    public_response = api_client.get(f"/api/v1/public/forms/{organization.qr_secure_token}/")
    sync_response = api_client.post(
        "/api/v1/checkins/sync/",
        {"checkins": [valid_checkin_payload(organization.qr_secure_token)]},
        format="json",
    )

    assert public_response.status_code == 404
    assert sync_response.data["processed"][0]["status"] == "unknown_organization"
    assert CheckIn.objects.count() == 0


def test_sync_creates_client_and_links_checkin_when_karnet_enabled(db, api_client, organization, form_template):
    from apps.karnet.models import Client

    organization.karnet_enabled = True
    organization.save(update_fields=["karnet_enabled"])
    form_template.fields_schema = [
        {"id": "nom", "type": "text", "label": "Nom complet", "required": True},
        {"id": "telephone", "type": "phone", "label": "Téléphone", "required": True},
        {"id": "email", "type": "email", "label": "Email", "required": False},
        {"id": "signature", "type": "signature", "label": "Signature", "required": True},
    ]
    form_template.save(update_fields=["fields_schema"])
    payload = valid_checkin_payload(
        organization.qr_secure_token,
        responses={"nom": "Awa Kone", "telephone": "+225 07 00 00 00 00", "email": "AWA@EXAMPLE.COM"},
    )

    response = api_client.post("/api/v1/checkins/sync/", {"checkins": [payload]}, format="json")

    assert response.data["processed"][0]["status"] == "created"
    assert response.data["processed"][0]["client_action"] == "created"
    client = Client.objects.get(organization=organization)
    checkin = CheckIn.objects.get(idempotency_key=payload["idempotency_key"])
    assert checkin.client_id == client.id
    assert client.full_name == "Awa Kone"
    assert client.phone == "0700000000"  # forme locale canonique (indicatif +225 normalisé)
    assert client.email == "awa@example.com"


def test_sync_reuses_existing_client_on_second_visit(db, api_client, organization, form_template):
    from apps.karnet.models import Client

    organization.karnet_enabled = True
    organization.save(update_fields=["karnet_enabled"])
    form_template.fields_schema = [
        {"id": "nom", "type": "text", "label": "Nom", "required": True},
        {"id": "telephone", "type": "phone", "label": "Téléphone", "required": True},
        {"id": "signature", "type": "signature", "label": "Signature", "required": True},
    ]
    form_template.save(update_fields=["fields_schema"])

    first_payload = valid_checkin_payload(
        organization.qr_secure_token,
        responses={"nom": "Awa Kone", "telephone": "0700000000"},
    )
    second_payload = valid_checkin_payload(
        organization.qr_secure_token,
        responses={"nom": "Awa Kone", "telephone": "07 00 00 00 00"},
    )

    api_client.post("/api/v1/checkins/sync/", {"checkins": [first_payload]}, format="json")
    second = api_client.post("/api/v1/checkins/sync/", {"checkins": [second_payload]}, format="json")

    assert second.data["processed"][0]["client_action"] == "matched"
    assert Client.objects.filter(organization=organization).count() == 1
    assert CheckIn.objects.filter(organization=organization, client__isnull=False).count() == 2


def test_sync_matches_same_client_with_dashes_or_country_code_variants(db, api_client, organization, form_template):
    """Recette phase 10 — un même numéro écrit avec des tirets ou un indicatif
    international (+225/00225) ne doit pas créer un doublon (normalisation
    spécifique à la Côte d'Ivoire, corrigée suite à la recette)."""
    from apps.karnet.models import Client

    organization.karnet_enabled = True
    organization.save(update_fields=["karnet_enabled"])
    form_template.fields_schema = [
        {"id": "nom", "type": "text", "label": "Nom", "required": True},
        {"id": "telephone", "type": "phone", "label": "Téléphone", "required": True},
        {"id": "signature", "type": "signature", "label": "Signature", "required": True},
    ]
    form_template.save(update_fields=["fields_schema"])

    api_client.post(
        "/api/v1/checkins/sync/",
        {"checkins": [valid_checkin_payload(organization.qr_secure_token, responses={"nom": "Bakary Traore", "telephone": "07-01-02-03-04"})]},
        format="json",
    )
    second = api_client.post(
        "/api/v1/checkins/sync/",
        {"checkins": [valid_checkin_payload(organization.qr_secure_token, responses={"nom": "Bakary Traore", "telephone": "+2250701020304"})]},
        format="json",
    )
    third = api_client.post(
        "/api/v1/checkins/sync/",
        {"checkins": [valid_checkin_payload(organization.qr_secure_token, responses={"nom": "Bakary Traore", "telephone": "00 225 07 01 02 03 04"})]},
        format="json",
    )

    assert second.data["processed"][0]["client_action"] == "matched"
    assert third.data["processed"][0]["client_action"] == "matched"
    assert Client.objects.filter(organization=organization).count() == 1


def test_normalize_phone_leaves_non_ivorian_numbers_untouched():
    """Un numéro hors Côte d'Ivoire (ex. France) ne doit pas être réinterprété
    comme un numéro local — seul le format +225/00225 à 10 chiffres locaux est
    reconnu."""
    from apps.checkins.services import normalize_phone

    assert normalize_phone("+33 6 12 34 56 78") == "+33612345678"
    assert normalize_phone("06 12 34 56 78") == "0612345678"  # pas d'indicatif ivoirien détecté, inchangé


def test_sync_matches_same_client_with_case_insensitive_email(db, api_client, organization, form_template):
    """Recette phase 10 — un email saisi avec une casse différente doit rattacher
    la même fiche client plutôt que d'en créer une seconde."""
    from apps.karnet.models import Client

    organization.karnet_enabled = True
    organization.save(update_fields=["karnet_enabled"])
    form_template.fields_schema = [
        {"id": "nom", "type": "text", "label": "Nom", "required": True},
        {"id": "email", "type": "email", "label": "Email", "required": True},
        {"id": "signature", "type": "signature", "label": "Signature", "required": True},
    ]
    form_template.save(update_fields=["fields_schema"])

    api_client.post(
        "/api/v1/checkins/sync/",
        {"checkins": [valid_checkin_payload(organization.qr_secure_token, responses={"nom": "Fatou Diabate", "email": "Fatou@Example.com"})]},
        format="json",
    )
    second = api_client.post(
        "/api/v1/checkins/sync/",
        {"checkins": [valid_checkin_payload(organization.qr_secure_token, responses={"nom": "Fatou Diabate", "email": "fatou@example.com"})]},
        format="json",
    )

    assert second.data["processed"][0]["client_action"] == "matched"
    assert Client.objects.filter(organization=organization).count() == 1


def test_sync_keeps_level_one_without_creating_client(db, api_client, organization, form_template):
    from apps.karnet.models import Client

    payload = valid_checkin_payload(organization.qr_secure_token)
    response = api_client.post("/api/v1/checkins/sync/", {"checkins": [payload]}, format="json")

    assert response.data["processed"][0]["status"] == "created"
    assert "client_id" not in response.data["processed"][0]
    assert Client.objects.filter(organization=organization).count() == 0
    assert CheckIn.objects.get(idempotency_key=payload["idempotency_key"]).client_id is None
