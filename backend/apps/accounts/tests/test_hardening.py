"""Connexion Google, invitations, sessions de rafraîchissement : correctifs d'audit."""
from datetime import timedelta
from unittest import mock

import pytest
from django.test import override_settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import AuditEvent, RefreshSession, StaffInvitation, User
from apps.accounts.services import (
    InvalidGoogleTokenError,
    RevokedAccessError,
    register_refresh_session,
    resolve_or_create_user,
    verify_google_credential,
)
from apps.testing_utils import auth_client

REFRESH_URL = "/api/v1/auth/token/refresh/"


# --- Google : l'audience doit toujours être vérifiée --------------------------------------------------------------

@override_settings(GOOGLE_CLIENT_ID="")
def test_google_verification_refuses_when_client_id_is_not_configured(monkeypatch):
    """Sans audience, google-auth accepte n'importe quel jeton Google valide (émis pour une AUTRE application)."""
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    with mock.patch("apps.accounts.services.id_token.verify_oauth2_token") as verify:
        with pytest.raises(InvalidGoogleTokenError):
            verify_google_credential("jeton")
    verify.assert_not_called()


@override_settings(GOOGLE_CLIENT_ID="mon-client.apps.googleusercontent.com")
def test_google_verification_passes_the_configured_audience():
    with mock.patch("apps.accounts.services.id_token.verify_oauth2_token", return_value={"email": "a@b.c"}) as verify:
        assert verify_google_credential("jeton") == {"email": "a@b.c"}
    assert verify.call_args.args[2] == "mon-client.apps.googleusercontent.com"


# --- Invitations : une invitation en cours passe avant une ancienne révocation ------------------------------------

def test_reinvited_address_can_join_after_an_old_revocation(db, boss_user, organization):
    StaffInvitation.objects.create(organization=organization, email="paul@example.com", invited_by=boss_user, role="STAFF", token="t-old", revoked_at=timezone.now() - timedelta(days=3))
    StaffInvitation.objects.create(organization=organization, email="paul@example.com", invited_by=boss_user, role="STAFF", token="t-new")

    user, created = resolve_or_create_user({"email": "paul@example.com", "name": "Paul"})

    assert created and user.organization_id == organization.id and user.role == "STAFF"


def test_revoked_address_without_new_invitation_stays_blocked(db, boss_user, organization):
    StaffInvitation.objects.create(organization=organization, email="paul@example.com", invited_by=boss_user, role="STAFF", token="t-revoked", revoked_at=timezone.now())

    with pytest.raises(RevokedAccessError):
        resolve_or_create_user({"email": "paul@example.com", "name": "Paul"})
    assert not User.objects.filter(email="paul@example.com").exists()


@override_settings(FRONTEND_URL="https://rekollecte.example.app/")
def test_invite_link_points_to_the_frontend_not_the_api_host(db, boss_user, organization):
    response = auth_client(boss_user).post("/api/v1/auth/invite/", {"email": "nouveau@example.com", "role": "STAFF"}, format="json", HTTP_HOST="api-render.example.com")
    assert response.status_code == 201
    assert response.data["invite_link"].startswith("https://rekollecte.example.app/connexion?invite=")
    assert "api-render" not in response.data["invite_link"]


# --- Journal d'audit : seule une vraie connexion écrit « auth.login » ------------------------------------------------

def _session_client(user):
    from rest_framework.test import APIClient

    refresh = RefreshToken.for_user(user)
    RefreshSession.objects.create(user=user, jti=str(refresh["jti"]), expires_at=timezone.now() + timedelta(days=1))
    client = APIClient()
    client.cookies["qr_refresh_token"] = str(refresh)
    return client


def test_token_refresh_does_not_write_a_login_event(db, boss_user):
    client = _session_client(boss_user)
    for _ in range(3):
        assert client.post(REFRESH_URL).status_code == 200
    assert AuditEvent.objects.filter(action="auth.login").count() == 0


def test_real_login_still_writes_a_login_event(db, boss_user):
    request = mock.Mock(META={"HTTP_USER_AGENT": "pytest", "REMOTE_ADDR": "127.0.0.1"})
    register_refresh_session(boss_user, RefreshToken.for_user(boss_user), request)
    assert AuditEvent.objects.filter(action="auth.login", actor=boss_user).count() == 1


def test_expired_sessions_of_the_user_are_purged_on_new_session(db, boss_user, staff_user):
    old = RefreshSession.objects.create(user=boss_user, jti="vieux", expires_at=timezone.now() - timedelta(days=1))
    other = RefreshSession.objects.create(user=staff_user, jti="autre", expires_at=timezone.now() - timedelta(days=1))
    request = mock.Mock(META={})
    register_refresh_session(boss_user, RefreshToken.for_user(boss_user), request, audit=False)
    assert not RefreshSession.objects.filter(id=old.id).exists()
    assert RefreshSession.objects.filter(id=other.id).exists()  # on ne touche que les sessions de l'utilisateur concerné
