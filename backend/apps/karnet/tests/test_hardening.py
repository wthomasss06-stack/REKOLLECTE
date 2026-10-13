"""Réservations, filtres, suppression d'établissement : correctifs d'audit."""
from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.karnet.models import Client, Reservation, Resource
from apps.testing_utils import auth_client

from .helpers import enable_karnet, make_resource

RESERVATIONS_URL = "/api/v1/karnet/reservations/"


def book(api, resource, **payload):
    body = {"client_name": "Ange", "resource": str(resource.id), "quantity": 1, **payload}
    return api.post(RESERVATIONS_URL, body, format="json")


@pytest.mark.parametrize("query", ["resource=pas-un-uuid", "client=12345"])
def test_reservation_list_filters_with_bad_ids_are_a_400(db, staff_user, organization, query):
    enable_karnet(organization)
    assert auth_client(staff_user).get(f"{RESERVATIONS_URL}?{query}").status_code == 400


def test_reservation_quantity_is_bounded(db, staff_user, organization):
    """Une quantité énorme faisait déborder `timedelta` ou la colonne du montant (500)."""
    enable_karnet(organization)
    room = make_resource(organization, unit=Resource.Unit.JOUR, price=Decimal("30000"))
    api = auth_client(staff_user)

    assert book(api, room, quantity=10**12).status_code == 400
    assert book(api, room, quantity=10_001).status_code == 400
    assert Reservation.objects.count() == 0


def test_reservation_amount_overflow_is_a_400(db, staff_user, organization):
    enable_karnet(organization)
    pricey = make_resource(organization, unit=Resource.Unit.UNITE, name="Lingot", price=Decimal("9999999999.00"))

    response = book(auth_client(staff_user), pricey, quantity=5)

    assert response.status_code == 400
    assert Reservation.objects.count() == 0


def test_reservation_start_date_must_be_plausible(db, staff_user, organization):
    enable_karnet(organization)
    room = make_resource(organization, unit=Resource.Unit.JOUR)
    api = auth_client(staff_user)

    assert book(api, room, starts_at="9999-12-31T00:00:00Z").status_code == 400
    assert book(api, room, starts_at="1999-01-01T00:00:00Z").status_code == 400
    assert book(api, room, starts_at=(timezone.now() + timedelta(days=30)).isoformat()).status_code == 201


def test_double_booking_of_the_same_slot_is_still_refused(db, staff_user, organization):
    enable_karnet(organization)
    room = make_resource(organization, unit=Resource.Unit.JOUR)
    api = auth_client(staff_user)
    start = (timezone.now() + timedelta(days=2)).isoformat()

    assert book(api, room, starts_at=start, quantity=2).status_code == 201
    assert book(api, room, starts_at=start, quantity=1).status_code == 409


def test_boss_can_delete_an_establishment_that_has_reservations(db, boss_user, organization):
    """`Reservation.client` et `.resource` sont en PROTECT : la suppression en cascade ne doit pas finir en 500."""
    enable_karnet(organization)
    room = make_resource(organization)
    client_record = Client.objects.create(organization=organization, full_name="Ange")
    Reservation.objects.create(organization=organization, client=client_record, resource=room, quantity=1, unit_price=room.price, total_amount=room.price)

    response = auth_client(boss_user).delete("/api/v1/org/me/lifecycle/")

    assert response.status_code == 204
    assert not Reservation.objects.exists() and not Client.objects.exists() and not Resource.objects.exists()
