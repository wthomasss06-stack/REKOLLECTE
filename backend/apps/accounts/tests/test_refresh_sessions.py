from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import RefreshSession

REFRESH_URL = "/api/v1/auth/token/refresh/"


def _client_with_session(user):
    """Client portant un cookie de refresh valide + sa RefreshSession en base."""
    refresh = RefreshToken.for_user(user)
    RefreshSession.objects.create(
        user=user,
        jti=str(refresh["jti"]),
        expires_at=timezone.now() + timedelta(days=1),
    )
    client = APIClient()
    client.cookies["qr_refresh_token"] = str(refresh)
    return client, refresh


def _replay_client(refresh):
    """Un second contexte (autre onglet, PWA…) qui présente encore l'ancien cookie."""
    client = APIClient()
    client.cookies["qr_refresh_token"] = str(refresh)
    return client


def test_refresh_token_rotates_and_old_token_is_rejected_after_leeway(db, boss_user):
    client, refresh = _client_with_session(boss_user)

    rotated = client.post(REFRESH_URL)

    assert rotated.status_code == 200
    assert rotated.data["access"]
    assert RefreshSession.objects.filter(user=boss_user, revoked_at__isnull=False).count() == 1
    assert RefreshSession.objects.filter(user=boss_user, revoked_at__isnull=True).count() == 1

    # Hors fenêtre de grâce, rejouer l'ancien token reste refusé (détection de réutilisation).
    RefreshSession.objects.filter(user=boss_user, revoked_at__isnull=False).update(
        rotated_at=timezone.now() - timedelta(minutes=5)
    )
    rejected = _replay_client(refresh).post(REFRESH_URL)

    assert rejected.status_code == 401
    assert rejected.cookies["qr_refresh_token"]["max-age"] == 0  # cookie effacé


def test_simultaneous_refresh_within_leeway_does_not_kill_the_session(db, boss_user):
    """Deux contextes rafraîchissent avec le même cookie : le second doit réussir, sans
    effacer ni remplacer le cookie posé par le premier (bug « 200 puis 401 »)."""
    client, refresh = _client_with_session(boss_user)

    first = client.post(REFRESH_URL)
    second = _replay_client(refresh).post(REFRESH_URL)

    assert first.status_code == 200
    assert "qr_refresh_token" in first.cookies  # le premier pose le nouveau cookie
    assert second.status_code == 200
    assert second.data["access"]
    assert "qr_refresh_token" not in second.cookies  # le retardataire ne touche pas au cookie
    # Aucune session supplémentaire : 1 révoquée (rotation) + 1 active (celle du premier appel).
    assert RefreshSession.objects.filter(user=boss_user).count() == 2
    assert RefreshSession.objects.filter(user=boss_user, revoked_at__isnull=True).count() == 1

    # L'access token délivré au retardataire est pleinement utilisable.
    me = APIClient().get("/api/v1/auth/me/", HTTP_AUTHORIZATION=f"Bearer {second.data['access']}")
    assert me.status_code == 200


def test_leeway_zero_restores_strict_single_use(db, boss_user, settings):
    settings.REFRESH_ROTATION_LEEWAY_SECONDS = 0
    client, refresh = _client_with_session(boss_user)

    assert client.post(REFRESH_URL).status_code == 200
    # Avec une grâce de 0 s, la moindre milliseconde de décalage suffit à refuser le rejeu.
    RefreshSession.objects.filter(user=boss_user, revoked_at__isnull=False).update(
        rotated_at=timezone.now() - timedelta(seconds=1)
    )

    assert _replay_client(refresh).post(REFRESH_URL).status_code == 401


def test_logged_out_token_is_never_replayable_even_within_leeway(db, boss_user):
    client, refresh = _client_with_session(boss_user)

    assert client.post("/api/v1/auth/logout/").status_code == 200
    session = RefreshSession.objects.get(user=boss_user)
    assert session.revoked_at is not None and session.rotated_at is None

    replay = _replay_client(refresh).post(REFRESH_URL)

    assert replay.status_code == 401


def test_revoked_member_cannot_refresh_even_within_leeway(db, boss_user, staff_user):
    client, refresh = _client_with_session(staff_user)
    assert client.post(REFRESH_URL).status_code == 200

    staff_user.is_active = False
    staff_user.save(update_fields=["is_active"])

    assert _replay_client(refresh).post(REFRESH_URL).status_code == 401
