"""Numéro de réservation, paiement à la réservation et créneaux de rappel.

Modèle métier : on paie avant de consommer. La réservation est donc encaissée dès
sa création, et son créneau (début -> fin) alimente Rappels sans autre geste : à
l'échéance l'équipe tranche entre « Payé » (créneau terminé) et « Annuler »."""
from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.accounts.models import User
from apps.karnet.models import Client, Reservation, Resource
from apps.organizations.models import Organization
from apps.testing_utils import auth_client

from .helpers import enable_karnet, make_resource

RESERVATIONS_URL = "/api/v1/karnet/reservations/"


def book(api, resource, **payload):
    body = {"client_name": "Ange", "resource": str(resource.id), "quantity": 1, **payload}
    return api.post(RESERVATIONS_URL, body, format="json")


def due_ids(api):
    return [reservation["id"] for reservation in api.get(f"{RESERVATIONS_URL}?reminder_due=true").data]


def test_reservation_numbers_are_sequential_and_independent_per_organization(db, staff_user, organization):
    enable_karnet(organization)
    other = Organization.objects.create(name="Autre hôtel", qr_secure_token="other-token", karnet_enabled=True)
    other_staff = User.objects.create_user(email="autre@example.com", role=User.Role.STAFF, organization=other)
    drink = make_resource(organization, unit=Resource.Unit.UNITE, name="Boisson", price=Decimal("500"))
    other_drink = make_resource(other, unit=Resource.Unit.UNITE, name="Boisson", price=Decimal("500"))

    numbers = [book(auth_client(staff_user), drink).data["number"] for _ in range(3)]
    other_first = book(auth_client(other_staff), other_drink).data["number"]

    assert numbers == [1, 2, 3]
    assert other_first == 1  # chaque établissement repart de 1


def test_reservation_number_is_not_reused_after_a_cancellation(db, staff_user, organization):
    enable_karnet(organization)
    drink = make_resource(organization, unit=Resource.Unit.UNITE, name="Boisson", price=Decimal("500"))
    api = auth_client(staff_user)
    book(api, drink)
    second = book(api, drink)
    api.patch(f"{RESERVATIONS_URL}{second.data['id']}/", {"status": "annulee"}, format="json")

    assert book(api, drink).data["number"] == 3


def test_reservation_created_outside_the_api_still_gets_a_number(db, organization):
    resource = make_resource(organization)
    client_record = Client.objects.create(organization=organization, full_name="Ange")

    reservation = Reservation.objects.create(
        organization=organization, client=client_record, resource=resource, quantity=1,
        unit_price=resource.price, total_amount=resource.price,
    )

    assert reservation.number == 1


def test_reservation_is_paid_automatically_at_creation(db, staff_user, organization):
    enable_karnet(organization)
    room = make_resource(organization, price=Decimal("50000"))

    response = book(auth_client(staff_user), room)

    assert response.status_code == 201
    assert response.data["is_paid"] is True
    assert response.data["paid_at"] is not None


def test_daily_reservation_gets_a_slot_that_comes_due_once_elapsed(db, staff_user, organization):
    """Une chambre à 50 000 F la journée : réservée pour 1 jour, son créneau se
    termine 24 h plus tard — c'est là que la sonnerie doit prévenir l'équipe."""
    enable_karnet(organization)
    room = make_resource(organization, unit=Resource.Unit.JOUR, price=Decimal("50000"))
    api = auth_client(staff_user)

    running = book(api, room)
    assert running.data["ends_at"] is not None
    assert running.data["reminder_due"] is False
    assert due_ids(api) == []

    Reservation.objects.filter(id=running.data["id"]).update(
        starts_at=timezone.now() - timedelta(days=1, hours=1), ends_at=timezone.now() - timedelta(hours=1)
    )
    assert due_ids(api) == [running.data["id"]]


def test_unit_reservation_has_no_slot_and_never_rings(db, staff_user, organization):
    enable_karnet(organization)
    drink = make_resource(organization, unit=Resource.Unit.UNITE, name="Boisson", price=Decimal("500"))
    api = auth_client(staff_user)
    book(api, drink)

    slots = api.get(f"{RESERVATIONS_URL}?status=en_cours&has_slot=true")

    assert slots.status_code == 200
    assert slots.data == []
    assert due_ids(api) == []


def test_has_slot_filter_lists_hourly_and_daily_reservations(db, staff_user, organization):
    enable_karnet(organization)
    room = make_resource(organization, unit=Resource.Unit.JOUR, name="Chambre 1")
    table = make_resource(organization, unit=Resource.Unit.HEURE, name="Salle A", price=Decimal("5000"))
    api = auth_client(staff_user)
    book(api, room)
    book(api, table)

    slots = api.get(f"{RESERVATIONS_URL}?status=en_cours&has_slot=true")

    assert sorted(item["resource_name"] for item in slots.data) == ["Chambre 1", "Salle A"]


@pytest.mark.parametrize("outcome", ["terminee", "annulee"])
def test_choosing_an_outcome_closes_the_due_slot(db, staff_user, organization, outcome):
    enable_karnet(organization)
    room = make_resource(organization)
    api = auth_client(staff_user)
    reservation = book(api, room, starts_at=(timezone.now() - timedelta(days=2)).isoformat())
    assert due_ids(api) == [reservation.data["id"]]

    result = api.patch(f"{RESERVATIONS_URL}{reservation.data['id']}/", {"status": outcome, "reminder_acknowledged": True}, format="json")

    assert result.status_code == 200
    assert result.data["status"] == outcome
    assert due_ids(api) == []


def test_unpaid_legacy_reservation_can_be_paid_while_closing_its_slot(db, staff_user, organization):
    """Réservations d'avant le paiement automatique : « Payé » solde aussi l'encaissement."""
    enable_karnet(organization)
    room = make_resource(organization)
    legacy = Reservation.objects.create(
        organization=organization, client=Client.objects.create(organization=organization, full_name="Ange"),
        resource=room, quantity=1, unit_price=room.price, total_amount=room.price,
        starts_at=timezone.now() - timedelta(days=2), ends_at=timezone.now() - timedelta(days=1),
    )
    assert legacy.is_paid is False

    result = auth_client(staff_user).patch(
        f"{RESERVATIONS_URL}{legacy.id}/", {"status": "terminee", "reminder_acknowledged": True, "is_paid": True}, format="json"
    )

    assert result.status_code == 200
    assert result.data["is_paid"] is True
    assert result.data["paid_at"] is not None
