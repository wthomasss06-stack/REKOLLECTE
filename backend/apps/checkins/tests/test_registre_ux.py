"""Registre : liste allégée (plus de photos ni de scans bruts), recherche texte, précision « Autre » dans l'export."""
import uuid

from django.utils import timezone

from apps.accounts.models import User
from apps.checkins.models import CheckIn, FormTemplate
from apps.karnet.models import Client
from apps.organizations.models import Organization
from apps.testing_utils import auth_client

BIG_IMAGE = "data:image/jpeg;base64," + "A" * 5000


def _checkin(organization, form_template, responses, **extra):
    return CheckIn.objects.create(
        organization=organization, form_template=form_template, idempotency_key=uuid.uuid4(),
        responses=responses, created_at_client=timezone.now(), **extra,
    )


def test_list_replaces_images_but_keeps_what_is_useful(db, boss_user, form_template, organization):
    record = _checkin(organization, form_template, {
        "nom": "Awa Koné",
        "photo": BIG_IMAGE,
        "piece": {"extracted": {"last_name": "KONE", "document_number": "C0123"}, "image": BIG_IMAGE, "raw_text": "TEXTE OCR BRUT"},
    })

    response = auth_client(boss_user).get("/api/v1/checkins/")

    assert response.status_code == 200
    data = response.data["results"][0]["responses"]
    assert data["nom"] == "Awa Koné"
    assert data["photo"] == "__image__"
    assert data["piece"]["extracted"] == {"last_name": "KONE", "document_number": "C0123"}
    assert data["piece"]["has_image"] is True
    assert "image" not in data["piece"] and "raw_text" not in data["piece"]
    assert "A" * 100 not in str(response.data)
    # Rien n'est perdu en base : seule la réponse de la liste est allégée.
    record.refresh_from_db()
    assert record.responses["photo"] == BIG_IMAGE
    assert record.responses["piece"]["raw_text"] == "TEXTE OCR BRUT"


def test_search_matches_field_values_not_field_names(db, boss_user, form_template, organization):
    _checkin(organization, form_template, {"nom": "Kouassi David", "telephone": "0102030405"})
    _checkin(organization, form_template, {"nom": "Yao Marie", "telephone": "0708091011"})
    client = auth_client(boss_user)

    by_name = client.get("/api/v1/checkins/?q=kouassi")
    by_phone = client.get("/api/v1/checkins/?q=0708")
    by_key_name = client.get("/api/v1/checkins/?q=telephone")
    everything = client.get("/api/v1/checkins/")

    assert by_name.data["count"] == 1 and by_name.data["results"][0]["responses"]["nom"] == "Kouassi David"
    assert by_phone.data["count"] == 1 and by_phone.data["results"][0]["responses"]["nom"] == "Yao Marie"
    # « telephone » est le nom d'une clé, pas une valeur : aucune fiche ne doit remonter.
    assert by_key_name.data["count"] == 0
    assert everything.data["count"] == 2


def test_search_matches_the_karnet_client_name(db, boss_user, form_template, organization):
    linked = Client.objects.create(organization=organization, full_name="Brigitte Diallo")
    _checkin(organization, form_template, {"nom": "B. D."}, client=linked)
    _checkin(organization, form_template, {"nom": "Autre personne"})

    response = auth_client(boss_user).get("/api/v1/checkins/?q=brigitte")

    assert response.data["count"] == 1
    assert response.data["results"][0]["client_name"] == "Brigitte Diallo"


def test_search_never_crosses_organizations(db, boss_user, form_template, organization):
    other_org = Organization.objects.create(name="Autre Cabinet", qr_secure_token="other-token-999")
    other_form = FormTemplate.objects.create(organization=other_org, title="Registre", fields_schema=form_template.fields_schema)
    _checkin(other_org, other_form, {"nom": "Kouassi Voisin"})
    _checkin(organization, form_template, {"nom": "Kouassi Local"})

    response = auth_client(boss_user).get("/api/v1/checkins/?q=kouassi")

    assert response.data["count"] == 1
    assert response.data["results"][0]["responses"]["nom"] == "Kouassi Local"


def test_search_combines_with_the_date_filter(db, boss_user, form_template, organization):
    _checkin(organization, form_template, {"nom": "Kouassi Aujourd'hui"})

    today = timezone.localdate().isoformat()
    inside = auth_client(boss_user).get(f"/api/v1/checkins/?q=kouassi&from={today}")
    outside = auth_client(boss_user).get("/api/v1/checkins/?q=kouassi&from=2999-01-01")

    assert inside.data["count"] == 1
    assert outside.data["count"] == 0


def test_search_with_special_characters_does_not_break(db, boss_user, form_template, organization):
    _checkin(organization, form_template, {"nom": "O'Brien 100%"})

    response = auth_client(boss_user).get("/api/v1/checkins/", {"q": "100%"})

    assert response.status_code == 200
    assert response.data["count"] == 1


def test_export_includes_the_other_reason_precision(db, boss_user, organization):
    template = FormTemplate.objects.create(
        organization=organization, title="Avec motif",
        fields_schema=[{"id": "motif", "type": "select", "label": "Motif", "required": True, "options": ["Rendez-vous", "Autre"]}],
    )
    _checkin(organization, template, {"motif": "Autre", "motif_autre": "Livraison de colis"})
    _checkin(organization, template, {"motif": "Rendez-vous"})

    response = auth_client(boss_user).get("/api/v1/checkins/export/")

    body = b"".join(response.streaming_content).decode("utf-8")
    assert "Autre : Livraison de colis" in body
    assert "Rendez-vous" in body
