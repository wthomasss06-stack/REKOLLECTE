"""Bascule KARNET (Niveau 2) : reservee au BOSS, capacites calculees cote serveur,
chaque changement trace dans AuditEvent — le frontend ne fait jamais ce calcul."""
from apps.accounts.models import AuditEvent
from apps.testing_utils import auth_client


def test_default_capabilities_are_registration_only(db, boss_user, organization):
    response = auth_client(boss_user).get("/api/v1/org/me/")

    assert response.status_code == 200
    assert response.data["karnet_enabled"] is False
    assert response.data["capabilities"] == {
        "registration": True,
        "karnet": False,
        "reservations": False,
        "payments": False,
        "rappels": False,
    }


def test_boss_can_enable_karnet(db, boss_user, organization):
    response = auth_client(boss_user).patch("/api/v1/org/me/karnet/", {"karnet_enabled": True}, format="json")

    assert response.status_code == 200
    assert response.data["karnet_enabled"] is True
    assert response.data["capabilities"]["karnet"] is True
    assert response.data["capabilities"]["reservations"] is True  # actif par défaut, ce sont de vraies fonctionnalités
    organization.refresh_from_db()
    assert organization.karnet_enabled is True
    event = AuditEvent.objects.get(organization=organization, action="organization.karnet_enabled")
    assert event.actor == boss_user
    assert event.metadata == {"previous": False, "next": True}


def test_boss_can_disable_karnet(db, boss_user, organization):
    client = auth_client(boss_user)
    client.patch("/api/v1/org/me/karnet/", {"karnet_enabled": True}, format="json")

    response = client.patch("/api/v1/org/me/karnet/", {"karnet_enabled": False}, format="json")

    assert response.status_code == 200
    assert response.data["capabilities"]["karnet"] is False
    assert AuditEvent.objects.filter(organization=organization, action="organization.karnet_disabled").exists()


def test_gerant_and_staff_cannot_toggle_karnet(db, gerant_user, staff_user, organization):
    for user in (gerant_user, staff_user):
        response = auth_client(user).patch("/api/v1/org/me/karnet/", {"karnet_enabled": True}, format="json")
        assert response.status_code == 403
    organization.refresh_from_db()
    assert organization.karnet_enabled is False


def test_unauthenticated_cannot_toggle_karnet(db, organization):
    from rest_framework.test import APIClient

    response = APIClient().patch("/api/v1/org/me/karnet/", {"karnet_enabled": True}, format="json")
    assert response.status_code == 401


def test_sub_capability_defaults_to_active_once_karnet_enabled(db, boss_user, organization):
    response = auth_client(boss_user).patch("/api/v1/org/me/karnet/", {"karnet_enabled": True}, format="json")
    assert response.status_code == 200
    assert response.data["capabilities"]["payments"] is True
    assert response.data["capabilities"]["rappels"] is True


def test_sub_capability_can_be_explicitly_disabled(db, boss_user, organization):
    client = auth_client(boss_user)
    client.patch("/api/v1/org/me/karnet/", {"karnet_enabled": True}, format="json")

    response = client.patch("/api/v1/org/me/karnet/", {"capabilities": {"payments": False}}, format="json")

    assert response.status_code == 200
    assert response.data["capabilities"]["payments"] is False
    assert response.data["capabilities"]["reservations"] is True  # inchangée


def test_disabling_karnet_preserves_capability_state(db, boss_user, organization):
    client = auth_client(boss_user)
    client.patch("/api/v1/org/me/karnet/", {"karnet_enabled": True, "capabilities": {"payments": False}}, format="json")

    client.patch("/api/v1/org/me/karnet/", {"karnet_enabled": False}, format="json")

    organization.refresh_from_db()
    assert organization.karnet_capabilities.get("payments") is False  # état conservé
    assert organization.capabilities["payments"] is False  # masqué tant que KARNET est off
    assert organization.capabilities["reservations"] is False  # masqué aussi, bien que jamais désactivée explicitement


def test_reactivating_karnet_restores_capabilities_and_keeps_existing_data(db, boss_user, organization):
    """Recette phase 10 — désactiver puis réactiver REKOLLECTE+ ne doit ni perdre la
    configuration des sous-capacités ni supprimer les fiches déjà créées."""
    from apps.karnet.models import Client

    client_api = auth_client(boss_user)
    client_api.patch("/api/v1/org/me/karnet/", {"karnet_enabled": True, "capabilities": {"rappels": False}}, format="json")
    fiche = Client.objects.create(organization=organization, full_name="David Kouassi")

    client_api.patch("/api/v1/org/me/karnet/", {"karnet_enabled": False}, format="json")
    disabled = client_api.get("/api/v1/karnet/clients/")
    assert disabled.status_code == 403  # Niveau 1 : l'API karnet redevient inaccessible…

    reactivated = client_api.patch("/api/v1/org/me/karnet/", {"karnet_enabled": True}, format="json")
    assert reactivated.status_code == 200
    assert reactivated.data["capabilities"]["reservations"] is True  # jamais touchée : reste active
    assert reactivated.data["capabilities"]["rappels"] is False  # restaurée telle que configurée avant la coupure

    reenabled_clients = client_api.get("/api/v1/karnet/clients/")
    assert reenabled_clients.status_code == 200
    assert any(c["id"] == str(fiche.id) for c in reenabled_clients.data)  # ...et rien n'a été perdu


def test_rejects_unknown_capability_key(db, boss_user, organization):
    response = auth_client(boss_user).patch("/api/v1/org/me/karnet/", {"capabilities": {"invalide": True}}, format="json")
    assert response.status_code == 400


def test_rejects_empty_payload(db, boss_user, organization):
    response = auth_client(boss_user).patch("/api/v1/org/me/karnet/", {}, format="json")
    assert response.status_code == 400
