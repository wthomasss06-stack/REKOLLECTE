"""Liste Karn3t (clients avec leur activité) et ressources créées en brouillon
depuis le catalogue de modèles."""
import uuid
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from apps.accounts.models import User
from apps.checkins.models import CheckIn
from apps.karnet.models import Client, Reservation
from apps.organizations.models import Organization
from apps.testing_utils import auth_client

from .helpers import enable_karnet, make_resource

CLIENTS_URL = "/api/v1/karnet/clients/"
RESOURCES_URL = "/api/v1/karnet/resources/"


def add_checkin(organization, client_record, when):
    return CheckIn.objects.create(organization=organization, client=client_record, idempotency_key=uuid.uuid4(), created_at_client=when)


def add_reservation(organization, client_record, resource, starts_at):
    return Reservation.objects.create(
        organization=organization, client=client_record, resource=resource, quantity=1,
        unit_price=resource.price, total_amount=resource.price, starts_at=starts_at,
    )


def test_client_list_exposes_activity_without_double_counting(db, staff_user, organization):
    """2 passages x 3 réservations : les deux jointures ne doivent pas se multiplier."""
    enable_karnet(organization)
    room = make_resource(organization)
    ange = Client.objects.create(organization=organization, full_name="Ange")
    now = timezone.now()
    for days_ago in (5, 2):
        add_checkin(organization, ange, now - timedelta(days=days_ago))
    for days_ago in (9, 7, 1):
        add_reservation(organization, ange, room, now - timedelta(days=days_ago))
    Client.objects.create(organization=organization, full_name="Bella")

    response = auth_client(staff_user).get(CLIENTS_URL)

    assert response.status_code == 200
    by_name = {item["full_name"]: item for item in response.data}
    assert by_name["Ange"]["checkins_count"] == 2
    assert by_name["Ange"]["reservations_count"] == 3
    assert by_name["Ange"]["last_visit_at"] is not None
    assert by_name["Bella"]["checkins_count"] == 0
    assert by_name["Bella"]["reservations_count"] == 0
    assert by_name["Bella"]["last_visit_at"] is None


def test_client_last_visit_is_the_most_recent_of_passage_and_reservation(db, staff_user, organization):
    enable_karnet(organization)
    room = make_resource(organization)
    ange = Client.objects.create(organization=organization, full_name="Ange")
    now = timezone.now()
    add_checkin(organization, ange, now - timedelta(days=4))
    add_reservation(organization, ange, room, now - timedelta(days=1))

    detail = auth_client(staff_user).get(f"{CLIENTS_URL}{ange.id}/")

    expected = (now - timedelta(days=1)).replace(microsecond=0)
    assert detail.data["last_visit_at"].startswith(expected.strftime("%Y-%m-%dT%H:%M"))


def test_client_list_only_contains_the_callers_organization(db, staff_user, organization):
    enable_karnet(organization)
    other = Organization.objects.create(name="Autre hôtel", qr_secure_token="other-token", karnet_enabled=True)
    Client.objects.create(organization=organization, full_name="Ange")
    Client.objects.create(organization=other, full_name="Client d'ailleurs")

    response = auth_client(staff_user).get(CLIENTS_URL)

    assert [item["full_name"] for item in response.data] == ["Ange"]


def test_client_list_is_blocked_when_karnet_is_not_enabled(db, staff_user, organization):
    assert auth_client(staff_user).get(CLIENTS_URL).status_code == 403


def test_template_resource_can_be_created_as_a_priceless_draft(db, boss_user, organization):
    enable_karnet(organization)
    payload = {"name": "Studio", "category": "accommodation", "resource_type": "Studio", "billing_unit": "night", "price": "0", "is_active": False}

    response = auth_client(boss_user).post(RESOURCES_URL, payload, format="json")

    assert response.status_code == 201
    assert response.data["is_active"] is False
    assert Decimal(response.data["price"]) == 0


def test_active_resource_still_requires_a_positive_price(db, boss_user, organization):
    enable_karnet(organization)
    api = auth_client(boss_user)

    zero = api.post(RESOURCES_URL, {"name": "Studio", "price": "0"}, format="json")
    negative = api.post(RESOURCES_URL, {"name": "Studio", "price": "-5", "is_active": False}, format="json")

    assert zero.status_code == 400
    assert negative.status_code == 400


def test_draft_becomes_bookable_once_priced_and_activated(db, boss_user, staff_user, organization):
    enable_karnet(organization)
    boss = auth_client(boss_user)
    draft = boss.post(RESOURCES_URL, {"name": "Studio", "billing_unit": "night", "price": "0", "is_active": False}, format="json").data

    blocked = auth_client(staff_user).post("/api/v1/karnet/reservations/", {"client_name": "Ange", "resource": draft["id"]}, format="json")
    still_zero = boss.patch(f"{RESOURCES_URL}{draft['id']}/", {"is_active": True}, format="json")
    activated = boss.patch(f"{RESOURCES_URL}{draft['id']}/", {"price": "25000", "is_active": True}, format="json")
    booked = auth_client(staff_user).post("/api/v1/karnet/reservations/", {"client_name": "Ange", "resource": draft["id"]}, format="json")

    assert blocked.status_code == 404  # un brouillon inactif ne se réserve pas
    assert still_zero.status_code == 400  # on ne peut pas l'activer sans prix
    assert activated.status_code == 200
    assert booked.status_code == 201
    assert booked.data["total_amount"] == "25000.00"


def test_staff_cannot_create_resources_even_as_drafts(db, staff_user, organization):
    enable_karnet(organization)

    response = auth_client(staff_user).post(RESOURCES_URL, {"name": "Studio", "price": "0", "is_active": False}, format="json")

    assert response.status_code == 403
