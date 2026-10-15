"""Paramètres > Moi : le profil se modifie (nom, photo) sans jamais toucher au rôle."""
import pytest

from apps.testing_utils import auth_client

ME_URL = "/api/v1/auth/me/"


@pytest.mark.django_db
def test_user_updates_name_and_photo(boss_user):
    response = auth_client(boss_user).patch(ME_URL, {"full_name": "  Awa   Koné ", "avatar_url": "https://res.cloudinary.com/demo/image/upload/a.jpg"}, format="json")
    assert response.status_code == 200
    boss_user.refresh_from_db()
    assert boss_user.full_name == "Awa Koné"  # espaces superflus retirés
    assert boss_user.avatar_url == "https://res.cloudinary.com/demo/image/upload/a.jpg"
    assert response.data["full_name"] == "Awa Koné"


@pytest.mark.django_db
@pytest.mark.parametrize("bad", ["javascript:alert(1)", "data:image/png;base64,AAAA", "http://exemple.ci/photo.jpg", "//exemple.ci/photo.jpg"])
def test_photo_must_be_https(boss_user, bad):
    before = boss_user.avatar_url
    response = auth_client(boss_user).patch(ME_URL, {"avatar_url": bad}, format="json")
    assert response.status_code == 400
    boss_user.refresh_from_db()
    assert boss_user.avatar_url == before


@pytest.mark.django_db
def test_photo_can_be_removed(boss_user):
    boss_user.avatar_url = "https://res.cloudinary.com/demo/image/upload/a.jpg"
    boss_user.save(update_fields=["avatar_url"])
    response = auth_client(boss_user).patch(ME_URL, {"avatar_url": ""}, format="json")
    assert response.status_code == 200
    boss_user.refresh_from_db()
    assert boss_user.avatar_url == ""


@pytest.mark.django_db
def test_role_and_organization_cannot_be_changed_through_the_profile(boss_user):
    response = auth_client(boss_user).patch(ME_URL, {"full_name": "Awa", "role": "STAFF", "is_visit_host": True, "organization_id": "x"}, format="json")
    assert response.status_code == 200
    boss_user.refresh_from_db()
    assert boss_user.role == "BOSS"
    assert boss_user.is_visit_host is False
