"""« Qui venez-vous voir ? » (champ `host`) et alertes d'arrivée dans le tableau de bord."""
import uuid
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.models import AuditEvent, User
from apps.checkins.alerts import MAX_ALERT_ITEMS, host_options
from apps.checkins.models import CheckIn, FormTemplate
from apps.checkins.services import extract_client_identity
from apps.organizations.models import Organization
from apps.testing_utils import auth_client, valid_checkin_payload

SYNC_URL = "/api/v1/checkins/sync/"
ALERTS_URL = "/api/v1/checkins/alerts/"

HOST_SCHEMA = [
    {"id": "nom", "type": "text", "label": "Nom & Prénoms", "required": True},
    {"id": "telephone", "type": "phone", "label": "Téléphone", "required": True},
    {"id": "motif", "type": "select", "label": "Motif de la visite", "options": ["Rendez-vous", "Livraison", "Autre"]},
    {"id": "visite", "type": "host", "label": "Qui venez-vous voir ?"},
    {"id": "signature", "type": "signature", "label": "Signature", "required": True},
]


def make_member(organization, email, name, role=User.Role.STAFF, host=True, **extra):
    return User.objects.create_user(email=email, full_name=name, role=role, organization=organization, is_visit_host=host, **extra)


@pytest.fixture
def host_form(db, organization):
    return FormTemplate.objects.create(organization=organization, title="Registre", fields_schema=HOST_SCHEMA, is_default=True)


@pytest.fixture
def marie(db, organization, boss_user):
    boss_user.full_name, boss_user.is_visit_host = "Marie Koné", True
    boss_user.save(update_fields=["full_name", "is_visit_host"])
    return boss_user


def visit(api_client, organization, who=None, **payload):
    responses = {"nom": "Kouassi Jean", "telephone": "+2250707070707", "motif": "Rendez-vous", **({"visite": who} if who else {})}
    body = valid_checkin_payload(organization.qr_secure_token, responses=responses, **payload)
    response = api_client.post(SYNC_URL, {"checkins": [body]}, format="json")
    assert response.status_code == 200 and response.data["processed"][0]["status"] == "created", response.data
    return CheckIn.objects.get(idempotency_key=body["idempotency_key"])


def alerts(user, since="past"):
    params = {} if since is None else {"since": (timezone.now() - timedelta(minutes=10)).isoformat() if since == "past" else since}
    return auth_client(user).get(ALERTS_URL, params)


# --- Formulaire public ---------------------------------------------------------------------------------------------------

def test_public_form_turns_the_host_field_into_an_optional_list_of_listed_members(db, api_client, organization, host_form, marie):
    make_member(organization, "paul@example.com", "Paul Yao")
    make_member(organization, "discret@example.com", "Discrète", host=False)
    make_member(organization, "parti@example.com", "Parti", host=True, is_active=False)
    other = Organization.objects.create(name="Autre", qr_secure_token="autre-token")
    make_member(other, "etranger@example.com", "Étranger")

    data = api_client.get(f"/api/v1/public/forms/{organization.qr_secure_token}/").data
    field = next(f for f in data["fields_schema"] if f["id"] == "visite")

    assert field["type"] == "select" and field["required"] is False
    assert field["options"] == ["Marie Koné", "Paul Yao"]
    assert "@example.com" not in str(data)  # jamais d'adresse e-mail dans une page publique
    host_form.refresh_from_db()
    assert next(f for f in host_form.fields_schema if f["id"] == "visite")["type"] == "host"  # le schéma enregistré ne change pas


def test_host_field_is_hidden_when_nobody_can_be_visited(db, api_client, organization, host_form, boss_user):
    data = api_client.get(f"/api/v1/public/forms/{organization.qr_secure_token}/").data

    assert [f["id"] for f in data["fields_schema"]] == ["nom", "telephone", "motif", "signature"]


def test_host_field_is_always_saved_as_optional_without_hand_typed_options(db, boss_user, organization, host_form):
    schema = [*HOST_SCHEMA[:3], {"id": "visite", "type": "host", "label": "Qui venez-vous voir ?", "required": True, "options": ["Faux"], "identity_role": "full_name"}, HOST_SCHEMA[4]]

    response = auth_client(boss_user).put("/api/v1/form-template/", {"fields_schema": schema}, format="json")

    assert response.status_code == 200
    saved = next(f for f in response.data["fields_schema"] if f["id"] == "visite")
    assert saved["required"] is False and "options" not in saved and not saved.get("identity_role")


def test_homonyms_are_told_apart_in_the_list(db, organization, boss_user):
    gerant = make_member(organization, "a@example.com", "Awa Traoré", role=User.Role.GERANT)
    agent = make_member(organization, "b@example.com", "awa traore", role=User.Role.STAFF)

    labels = dict((user.id, label) for label, user in host_options(organization))

    assert labels[gerant.id] == "Awa Traoré (Gérant)" and labels[agent.id] == "awa traore (Agent)"


# --- Rattachement à la synchronisation -----------------------------------------------------------------------------------

def test_visit_is_attached_to_the_chosen_person_ignoring_case_and_accents(db, api_client, organization, host_form, marie):
    assert visit(api_client, organization, "Marie Koné").host_id == marie.id
    assert visit(api_client, organization, "  marie kone ").host_id == marie.id


def test_unknown_or_missing_host_never_refuses_the_visit(db, api_client, organization, host_form, marie):
    assert visit(api_client, organization, "Quelqu'un d'inconnu").host_id is None
    assert visit(api_client, organization).host_id is None
    host_form.fields_schema = [{**f, "required": True} if f["type"] == "host" else f for f in HOST_SCHEMA]
    host_form.save()
    assert visit(api_client, organization).host_id is None  # même un ancien « obligatoire » ne bloque plus


def test_host_answer_is_not_mistaken_for_the_visitors_identity(db, organization):
    template = FormTemplate.objects.create(organization=organization, title="X", fields_schema=[
        {"id": "visite", "type": "host", "label": "Nom de la personne à voir"},
        {"id": "nom", "type": "text", "label": "Nom"},
        {"id": "telephone", "type": "phone", "label": "Téléphone"},
    ])

    identity = extract_client_identity(template, {"visite": "Marie Koné", "nom": "Kouassi", "telephone": "0707070707"})

    assert identity["full_name"] == "Kouassi" and "0707070707" in identity["phone"]  # sans garde, « Nom de la personne… » volerait le rôle full_name


# --- Alertes -------------------------------------------------------------------------------------------------------------

def test_alerts_require_a_logged_in_member(db, api_client):
    assert api_client.get(ALERTS_URL).status_code == 401


def test_first_call_returns_only_a_cursor_and_bad_dates_are_a_400(db, boss_user, organization, host_form, api_client):
    visit(api_client, organization)

    first = alerts(boss_user, since=None)

    assert first.status_code == 200 and first.data["items"] == [] and first.data["cursor"]  # pas de rejeu de l'historique
    assert alerts(boss_user, since="demain-matin").status_code == 400


def test_alert_goes_to_the_person_visited_else_to_boss_and_managers(db, api_client, organization, host_form, marie, gerant_user, staff_user):
    staff_user.full_name, staff_user.is_visit_host = "Paul Yao", True
    staff_user.save(update_fields=["full_name", "is_visit_host"])
    for_paul = visit(api_client, organization, "Paul Yao")
    for_team = visit(api_client, organization)

    boss_ids = [i["id"] for i in alerts(marie).data["items"]]
    manager_ids = [i["id"] for i in alerts(gerant_user).data["items"]]
    paul = alerts(staff_user).data["items"]

    assert boss_ids == manager_ids == [str(for_team.id)]
    assert [i["id"] for i in paul] == [str(for_paul.id)] and paul[0]["for_you"] == "host"
    assert alerts(marie).data["items"][0]["for_you"] == "team"


def test_a_boss_visited_by_name_gets_the_alert_and_a_plain_agent_gets_nothing(db, api_client, organization, host_form, marie, staff_user):
    visited = visit(api_client, organization, "Marie Koné")

    assert [i["id"] for i in alerts(marie).data["items"]] == [str(visited.id)]
    assert alerts(staff_user).data["items"] == []


def test_alerts_never_cross_establishments(db, api_client, organization, host_form, marie):
    visit(api_client, organization)
    other = Organization.objects.create(name="Autre", qr_secure_token="autre-token")
    rival = User.objects.create_user(email="rival@example.com", role=User.Role.BOSS, organization=other)

    assert alerts(rival).data["items"] == []


def test_alert_shows_name_reason_and_place_but_nothing_sensitive(db, api_client, organization, host_form, marie):
    visit(api_client, organization)

    response = alerts(marie)
    item = response.data["items"][0]

    assert item["visitor_name"] == "Kouassi Jean" and item["reason"] == "Rendez-vous" and item["late"] is False
    assert set(item) == {"id", "visitor_name", "reason", "access_point", "for_you", "arrived_at", "late"}
    body = response.content.decode()
    assert "0707070707" not in body and "base64" not in body  # ni téléphone, ni signature, ni pièce d'identité


def test_other_reason_text_replaces_the_word_other(db, api_client, organization, host_form, marie):
    body = valid_checkin_payload(organization.qr_secure_token, responses={"nom": "Awa", "telephone": "0707", "motif": "Autre", "motif_autre": "Contrôle sanitaire"})
    api_client.post(SYNC_URL, {"checkins": [body]}, format="json")

    assert alerts(marie).data["items"][0]["reason"] == "Contrôle sanitaire"


def test_visit_synced_long_after_arrival_is_flagged_late(db, api_client, organization, host_form, marie):
    visit(api_client, organization, created_at_client=(timezone.now() - timedelta(hours=2)).isoformat())
    visit(api_client, organization)

    late_flags = sorted(i["late"] for i in alerts(marie).data["items"])

    assert late_flags == [False, True]


def test_cursor_overlaps_slightly_and_lookback_is_capped_to_a_day(db, api_client, organization, host_form, marie):
    recent = visit(api_client, organization)
    old = visit(api_client, organization)
    CheckIn.objects.filter(id=old.id).update(synced_at=timezone.now() - timedelta(days=3))
    CheckIn.objects.filter(id=recent.id).update(synced_at=timezone.now() - timedelta(seconds=60))

    days_ago = (timezone.now() - timedelta(days=4)).isoformat()
    assert [i["id"] for i in alerts(marie, since=days_ago).data["items"]] == [str(recent.id)]  # 24 h maximum
    assert alerts(marie, since=(timezone.now() - timedelta(seconds=30)).isoformat()).data["items"] == []
    assert alerts(marie, since=(timezone.now() - timedelta(seconds=120)).isoformat()).data["items"] == [alerts(marie).data["items"][0]]


def test_a_burst_is_capped_but_still_counted(db, api_client, organization, host_form, marie):
    for _ in range(MAX_ALERT_ITEMS + 5):
        visit(api_client, organization)

    data = alerts(marie).data

    assert data["total"] == MAX_ALERT_ITEMS + 5 and len(data["items"]) == MAX_ALERT_ITEMS


# --- Case « Peut être visité·e » -----------------------------------------------------------------------------------------

def test_boss_marks_a_member_as_visitable_and_it_is_audited(db, boss_user, staff_user):
    api = auth_client(boss_user)
    url = f"/api/v1/auth/team/members/{staff_user.id}/visit-host/"

    response = api.patch(url, {"is_visit_host": True}, format="json")

    assert response.status_code == 200 and response.data["is_visit_host"] is True
    staff_user.refresh_from_db()
    assert staff_user.is_visit_host is True
    assert AuditEvent.objects.filter(action="member.visit_host_updated", target_user=staff_user).count() == 1
    api.patch(url, {"is_visit_host": True}, format="json")  # sans changement : pas de bruit dans le journal
    assert AuditEvent.objects.filter(action="member.visit_host_updated").count() == 1
    team = api.get("/api/v1/auth/team/").data["members"]
    assert next(m for m in team if m["id"] == str(staff_user.id))["is_visit_host"] is True


def test_only_the_boss_can_change_it_and_only_inside_his_establishment(db, boss_user, gerant_user, staff_user):
    other = Organization.objects.create(name="Autre", qr_secure_token="autre-token")
    stranger = make_member(other, "x@example.com", "Étranger", host=False)
    revoked = make_member(boss_user.organization, "r@example.com", "Révoqué", host=False, is_active=False)

    assert auth_client(gerant_user).patch(f"/api/v1/auth/team/members/{staff_user.id}/visit-host/", {"is_visit_host": True}, format="json").status_code == 403
    api = auth_client(boss_user)
    assert api.patch(f"/api/v1/auth/team/members/{stranger.id}/visit-host/", {"is_visit_host": True}, format="json").status_code == 404
    assert api.patch(f"/api/v1/auth/team/members/{revoked.id}/visit-host/", {"is_visit_host": True}, format="json").status_code == 404
    assert api.patch(f"/api/v1/auth/team/members/{uuid.uuid4()}/visit-host/", {"is_visit_host": True}, format="json").status_code == 404
    assert api.patch(f"/api/v1/auth/team/members/{staff_user.id}/visit-host/", {"is_visit_host": "oui"}, format="json").status_code == 400
