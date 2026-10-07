"""Doublons de clients (édition, recherche, fusion de l'existant) et compteurs du guide « Premiers pas »."""
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from django.core.management import call_command

from apps.checkins.models import CheckIn
from apps.karnet.models import Client, Reservation
from apps.karnet.services import duplicate_groups, merge_clients
from apps.testing_utils import auth_client

from .helpers import enable_karnet, make_resource


def make_checkin(organization, client):
    return CheckIn.objects.create(
        organization=organization, client=client, idempotency_key=uuid.uuid4(),
        responses={"nom": client.full_name}, created_at_client=datetime.now(UTC),
    )


# ------------------------------------------------------------------ édition : pas de doublon créé

def test_editing_a_phone_to_an_existing_clients_number_is_refused_in_any_format(db, staff_user, organization):
    enable_karnet(organization)
    awa = Client.objects.create(organization=organization, full_name="Awa Kone", phone="0701020304")
    other = Client.objects.create(organization=organization, full_name="Yves Traore", phone="0505050505")

    response = auth_client(staff_user).patch(f"/api/v1/karnet/clients/{other.id}/", {"phone": "+225 07 01 02 03 04"}, format="json")

    assert response.status_code == 409
    assert response.data["error"]["code"] == "client_duplicate"
    assert response.data["existing_client"] == {"id": str(awa.id), "full_name": "Awa Kone"}
    other.refresh_from_db()
    assert other.phone == "0505050505"  # inchangé


def test_editing_an_email_to_an_existing_clients_email_is_refused(db, staff_user, organization):
    enable_karnet(organization)
    Client.objects.create(organization=organization, full_name="Awa Kone", email="awa@example.com")
    other = Client.objects.create(organization=organization, full_name="Yves Traore")

    response = auth_client(staff_user).patch(f"/api/v1/karnet/clients/{other.id}/", {"email": "AWA@example.com"}, format="json")

    assert response.status_code == 409


def test_editing_own_phone_or_a_free_number_still_works_and_is_normalized(db, staff_user, organization):
    enable_karnet(organization)
    awa = Client.objects.create(organization=organization, full_name="Awa Kone", phone="0701020304")
    api = auth_client(staff_user)

    same = api.patch(f"/api/v1/karnet/clients/{awa.id}/", {"phone": "+2250701020304", "note": "VIP"}, format="json")
    free = api.patch(f"/api/v1/karnet/clients/{awa.id}/", {"phone": "07 09 09 09 09"}, format="json")

    assert same.status_code == 200 and same.data["phone"] == "0701020304"
    assert free.status_code == 200 and free.data["phone"] == "0709090909"


def test_duplicate_guard_does_not_cross_establishments(db, staff_user, organization):
    from apps.organizations.models import Organization

    enable_karnet(organization)
    elsewhere = Organization.objects.create(name="Autre", qr_secure_token="other-token")
    Client.objects.create(organization=elsewhere, full_name="Awa Kone", phone="0701020304")
    mine = Client.objects.create(organization=organization, full_name="Awa Kone")

    response = auth_client(staff_user).patch(f"/api/v1/karnet/clients/{mine.id}/", {"phone": "0701020304"}, format="json")

    assert response.status_code == 200


# ------------------------------------------------------------------------- recherche

def test_client_search_finds_by_name_email_and_phone_in_any_format(db, staff_user, organization):
    enable_karnet(organization)
    awa = Client.objects.create(organization=organization, full_name="Awa Kone", phone="0701020304", email="awa@example.com")
    Client.objects.create(organization=organization, full_name="Yves Traore", phone="0505050505")
    api = auth_client(staff_user)

    def ids(term):
        return [c["id"] for c in api.get("/api/v1/karnet/clients/", {"search": term}).data]

    assert ids("awa") == [str(awa.id)]
    assert ids("awa@exam") == [str(awa.id)]
    assert ids("0701020304") == [str(awa.id)]
    assert ids("+2250701020304") == [str(awa.id)]
    assert ids("+225 07 01 02") == [str(awa.id)]
    assert ids("zzz") == []
    assert len(ids("")) == 2


# --------------------------------------------------------------- fusion de l'existant

def test_duplicate_groups_and_merge_keep_every_reservation_and_checkin(db, organization):
    enable_karnet(organization)
    resource = make_resource(organization)
    old = Client.objects.create(organization=organization, full_name="Awa Kone", phone="0701020304")
    legacy = Client.objects.create(organization=organization, full_name="Awa K.", phone="+2250701020304", email="awa@example.com")
    alone = Client.objects.create(organization=organization, full_name="Yves Traore", phone="0505050505")
    for _ in range(3):
        make_checkin(organization, old)  # la fiche la plus active est conservée
    make_checkin(organization, legacy)
    reservation = Reservation.objects.create(
        organization=organization, client=legacy, resource=resource, quantity=1, unit_price=Decimal("30000"),
        total_amount=Decimal("30000"), starts_at=datetime.now(UTC), number=1,
    )

    groups = duplicate_groups(organization)

    assert len(groups) == 1 and {c.id for c in groups[0]} == {old.id, legacy.id}  # Yves n'est dans aucun groupe
    survivor, duplicates = groups[0][0], groups[0][1:]
    assert survivor.id == old.id and duplicates[0].id == legacy.id  # la réservation est sur le DOUBLON : elle doit suivre
    merge_clients(survivor, duplicates)

    assert Client.objects.filter(organization=organization).count() == 2
    survivor.refresh_from_db()
    assert survivor.phone == "0701020304" and survivor.email == "awa@example.com"  # champ vide complété
    reservation.refresh_from_db()
    assert reservation.client_id == survivor.id
    assert CheckIn.objects.filter(client=survivor).count() == 4  # 3 + 1, aucun passage perdu
    assert Client.objects.filter(pk=alone.pk).exists()


def test_dedupe_command_is_a_dry_run_by_default_then_applies(db, organization):
    enable_karnet(organization)
    Client.objects.create(organization=organization, full_name="Awa Kone", phone="0701020304")
    Client.objects.create(organization=organization, full_name="Awa Kone", phone="+2250701020304")
    Client.objects.create(organization=organization, full_name="Yves Traore", phone="05 05 05 05 05")

    call_command("dedupe_karnet_clients")
    assert Client.objects.filter(organization=organization).count() == 3  # simulation : rien ne change
    assert Client.objects.filter(phone="05 05 05 05 05").exists()

    call_command("dedupe_karnet_clients", "--apply")
    assert Client.objects.filter(organization=organization).count() == 2
    assert not Client.objects.filter(phone="05 05 05 05 05").exists()
    assert Client.objects.filter(phone="0505050505").exists()
    call_command("dedupe_karnet_clients", "--apply")  # idempotent
    assert Client.objects.filter(organization=organization).count() == 2


# ------------------------------------------------------------------ compteurs du guide

def test_summary_counts_drive_the_getting_started_guide(db, staff_user, organization):
    enable_karnet(organization)
    api = auth_client(staff_user)
    assert api.get("/api/v1/karnet/summary/").data == {"resources": 0, "clients": 0, "reservations": 0, "paid_reservations": 0}

    resource = make_resource(organization)
    first = api.post("/api/v1/karnet/reservations/", {"client_name": "David", "resource": str(resource.id)}, format="json")
    assert first.status_code == 201
    summary = api.get("/api/v1/karnet/summary/").data
    assert summary["resources"] == 1 and summary["clients"] == 1 and summary["reservations"] == 1
    assert summary["paid_reservations"] == 1  # l'encaissement est enregistré dès la création

    api.patch(f"/api/v1/karnet/reservations/{first.data['id']}/", {"status": "annulee"}, format="json")
    assert api.get("/api/v1/karnet/summary/").data["reservations"] == 0  # une réservation annulée ne compte pas comme « première réservation »


def test_summary_requires_karnet_and_stays_inside_the_establishment(db, staff_user, organization):
    from apps.organizations.models import Organization

    assert auth_client(staff_user).get("/api/v1/karnet/summary/").status_code == 403  # REKOLLECTE+ désactivé
    enable_karnet(organization)
    other = Organization.objects.create(name="Autre", qr_secure_token="other-token-2")
    Client.objects.create(organization=other, full_name="Etranger")

    assert auth_client(staff_user).get("/api/v1/karnet/summary/").data["clients"] == 0
