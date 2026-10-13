"""Administration de la plateforme : comparaison des secrets, session renouvelable, validation des créations."""
import pytest
from django.test import override_settings
from rest_framework.test import APIClient

from apps.accounts.models import RefreshSession, User

ADMIN = {"PLATFORM_ADMIN_EMAIL": "admin@example.com", "PLATFORM_ADMIN_PASSWORD": "a" * 20}


@pytest.mark.django_db
def test_non_ascii_credentials_are_a_clean_401_not_a_500():
    """`secrets.compare_digest` sur des str non ASCII lève TypeError : l'admin répondait 500 à un mot de passe accentué."""
    with override_settings(**ADMIN):
        response = APIClient().post("/api/v1/admin/login/", {"email": "admin@example.com", "password": "é" * 20}, format="json")
        accented_email = APIClient().post("/api/v1/admin/login/", {"email": "adminé@example.com", "password": "a" * 20}, format="json")
    assert response.status_code == 401
    assert accented_email.status_code == 401


@pytest.mark.django_db
def test_platform_admin_session_can_be_refreshed():
    """Sans RefreshSession, le cookie de l'admin était refusé : reconnexion obligatoire toutes les 10 minutes."""
    with override_settings(**ADMIN):
        client = APIClient()
        login = client.post("/api/v1/admin/login/", {"email": "admin@example.com", "password": "a" * 20}, format="json")
        assert login.status_code == 200
        assert RefreshSession.objects.filter(user__email="admin@example.com").count() == 1
        refreshed = client.post("/api/v1/auth/token/refresh/")
    assert refreshed.status_code == 200 and refreshed.data["access"]


@pytest.mark.django_db
def test_admin_login_has_its_own_strict_throttle():
    with override_settings(**ADMIN):
        client = APIClient()
        codes = [client.post("/api/v1/admin/login/", {"email": "admin@example.com", "password": "mauvais"}, format="json").status_code for _ in range(14)]
    assert codes[0] == 401 and 429 in codes


def _admin_client():
    client = APIClient()
    login = client.post("/api/v1/admin/login/", {"email": "admin@example.com", "password": "a" * 20}, format="json")
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return client


@pytest.mark.django_db
def test_admin_member_creation_validates_role_organization_and_duplicates(organization, boss_user):
    with override_settings(**ADMIN):
        client = _admin_client()
        assert client.post("/api/v1/admin/members/", {"email": "x@example.com", "role": "ROOT"}, format="json").status_code == 400
        assert client.post("/api/v1/admin/members/", {"email": "x@example.com", "organization_id": "pas-un-uuid"}, format="json").status_code == 400
        assert client.post("/api/v1/admin/members/", {"email": boss_user.email}, format="json").status_code == 409
        created = client.post("/api/v1/admin/members/", {"email": "x@example.com", "role": "STAFF", "organization_id": str(organization.id)}, format="json")
    assert created.status_code == 201
    assert User.objects.get(email="x@example.com").organization_id == organization.id
