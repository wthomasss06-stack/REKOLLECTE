from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import AuthIdentity, User
from apps.accounts.services import ProviderProfile

FRONT = "https://rekollecte-ci.vercel.app"


@pytest.fixture(autouse=True)
def settings_for_flow(settings):
    cache.clear()  # le limiteur de débit anonyme est partagé entre tests : repartir de zéro
    settings.FRONTEND_URL = FRONT
    settings.FACEBOOK_APP_ID, settings.FACEBOOK_APP_SECRET = "123", "secret"
    settings.APPLE_SERVICES_ID = "ci.rekollecte.web"
    settings.APPLE_TEAM_ID, settings.APPLE_KEY_ID, settings.APPLE_PRIVATE_KEY = "TEAM123456", "KEY1234567", "pem"


def fb(subject="fb-1", email="awa@example.com", verified=True):
    return ProviderProfile(provider="facebook", subject=subject, email=email, email_verified=verified, name="Awa Koné")


def apple(subject="ap-1", email="awa@example.com", verified=True, private=False):
    return ProviderProfile(provider="apple", subject=subject, email=email, email_verified=verified, is_private_email=private)


def start(client, provider):
    response = client.get(f"/api/v1/auth/{provider}/start/")
    assert response.status_code == 302
    query = parse_qs(urlparse(response["Location"]).query)
    return response, query["state"][0]


def where(response):
    parsed = urlparse(response["Location"])
    return parsed.path, {k: v[0] for k, v in parse_qs(parsed.query).items()}


def test_start_redirects_to_facebook_with_signed_state_and_cookie():
    client = APIClient()
    response, state = start(client, "facebook")

    assert response["Location"].startswith("https://www.facebook.com/v25.0/dialog/oauth?")
    query = parse_qs(urlparse(response["Location"]).query)
    assert query["redirect_uri"] == [f"{FRONT}/api/v1/auth/facebook/callback"] and query["scope"] == ["public_profile,email"]
    cookie = response.cookies["qr_oauth_state"]
    assert cookie["httponly"] and cookie["path"] == "/api/v1/auth/" and state


def test_start_redirects_to_apple_with_form_post_and_nonce():
    response, _ = start(APIClient(), "apple")
    query = parse_qs(urlparse(response["Location"]).query)

    assert response["Location"].startswith("https://appleid.apple.com/auth/authorize?")
    assert query["response_mode"] == ["form_post"] and query["scope"] == ["name email"]
    assert query["nonce"] and query["client_id"] == ["ci.rekollecte.web"]


def test_unknown_provider_is_404():
    assert APIClient().get("/api/v1/auth/myspace/start/").status_code == 404


def test_full_facebook_login_creates_account_and_sets_refresh_cookie(db):
    client = APIClient()
    _, state = start(client, "facebook")

    with patch("apps.accounts.oauth.facebook_profile", return_value=fb()) as exchange:
        response = client.get("/api/v1/auth/facebook/callback/", {"state": state, "code": "abc"})

    exchange.assert_called_once_with("abc")
    assert response.status_code == 302
    assert where(response) == ("/connexion/callback", {"new": "1"})
    assert response.cookies["qr_refresh_token"].value  # la session reprend via le refresh cookie existant
    assert User.objects.count() == 1 and AuthIdentity.objects.filter(provider="facebook").count() == 1
    assert response.cookies["qr_oauth_state"]["max-age"] == 0  # cookie nonce à usage unique


def test_same_person_via_facebook_then_apple_then_google_is_one_account(db):
    from apps.accounts.services import resolve_login

    results = []
    for provider, make in (("facebook", fb), ("apple", apple)):
        client = APIClient()
        _, state = start(client, provider)
        with patch(f"apps.accounts.oauth.{provider}_profile", return_value=make()):
            if provider == "apple":  # Apple revient en POST form_post
                response = client.post("/api/v1/auth/apple/callback/", {"state": state, "code": "abc", "user": ""}, format="multipart")
            else:
                response = client.get("/api/v1/auth/facebook/callback/", {"state": state, "code": "abc"})
        results.append(where(response)[1]["new"])

    google_user, created = resolve_login(ProviderProfile("google", "g-1", "awa@example.com", True))

    assert results == ["1", "0"] and created is False
    assert User.objects.count() == 1
    assert set(google_user.identities.values_list("provider", flat=True)) == {"facebook", "apple", "google"}


def test_callback_without_the_state_cookie_is_refused(db):
    _, state = start(APIClient(), "facebook")  # état valide, mais un AUTRE navigateur (sans cookie) revient
    with patch("apps.accounts.oauth.facebook_profile", return_value=fb()) as exchange:
        response = APIClient().get("/api/v1/auth/facebook/callback/", {"state": state, "code": "abc"})

    assert where(response) == ("/connexion", {"auth_error": "state"})
    exchange.assert_not_called() and User.objects.count() == 0


def test_forged_state_and_state_replay_are_refused(db):
    client = APIClient()
    _, state = start(client, "facebook")
    forged = client.get("/api/v1/auth/facebook/callback/", {"state": state + "x", "code": "abc"})
    assert where(forged)[1] == {"auth_error": "state"}

    with patch("apps.accounts.oauth.facebook_profile", return_value=fb()):
        ok = client.get("/api/v1/auth/facebook/callback/", {"state": state, "code": "abc"})
        assert where(ok)[0] == "/connexion/callback"
        replay = client.get("/api/v1/auth/facebook/callback/", {"state": state, "code": "abc"})  # cookie consommé
    assert where(replay)[1] == {"auth_error": "state"}


def test_state_cannot_be_used_on_the_other_provider(db):
    client = APIClient()
    _, state = start(client, "facebook")
    response = client.post("/api/v1/auth/apple/callback/", {"state": state, "code": "abc"}, format="multipart")

    assert where(response)[1] == {"auth_error": "state"}


def test_user_cancelling_at_the_provider(db):
    client = APIClient()
    _, state = start(client, "facebook")
    response = client.get("/api/v1/auth/facebook/callback/", {"state": state, "error": "access_denied"})

    assert where(response)[1] == {"auth_error": "cancelled"}


@pytest.mark.parametrize("make,expected", [
    (lambda: fb(email="", verified=False), "email_missing"),
    (lambda: apple(email="x@privaterelay.appleid.com", private=True), "email_private_relay"),
    (lambda: fb(verified=False), "email_unverified"),
])
def test_unusable_email_redirects_with_a_clear_code_and_creates_nothing(db, make, expected):
    provider = "apple" if make().provider == "apple" else "facebook"
    client = APIClient()
    _, state = start(client, provider)
    with patch(f"apps.accounts.oauth.{provider}_profile", return_value=make()):
        response = client.get(f"/api/v1/auth/{provider}/callback/", {"state": state, "code": "abc"})

    assert where(response)[1] == {"auth_error": expected}
    assert User.objects.count() == 0 and "qr_refresh_token" not in response.cookies


def test_link_flow_attaches_apple_relay_to_the_connected_account(db, boss_user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(boss_user)}")
    link = client.post("/api/v1/auth/apple/link/")
    assert link.status_code == 200 and link.data["url"].startswith("https://appleid.apple.com/auth/authorize?")
    state = parse_qs(urlparse(link.data["url"]).query)["state"][0]

    browser = APIClient()  # le navigateur revient d'Apple (le cookie nonce voyage avec lui)
    browser.cookies["qr_oauth_state"] = link.cookies["qr_oauth_state"].value
    with patch("apps.accounts.oauth.apple_profile", return_value=apple(email="x@privaterelay.appleid.com", private=True)):
        response = browser.post("/api/v1/auth/apple/callback/", {"state": state, "code": "abc"}, format="multipart")

    assert where(response) == ("/dashboard/parametres/connexion", {"linked": "apple"})
    assert boss_user.identities.filter(provider="apple").exists() and User.objects.count() == 1
    assert "qr_refresh_token" not in response.cookies  # lier ne reconnecte personne d'autre


def test_link_flow_refuses_an_identity_already_owned_by_someone_else(db, boss_user, staff_user):
    AuthIdentity.objects.create(user=staff_user, provider="facebook", subject="fb-1")
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(boss_user)}")
    link = client.post("/api/v1/auth/facebook/link/")
    state = parse_qs(urlparse(link.data["url"]).query)["state"][0]

    browser = APIClient(); browser.cookies["qr_oauth_state"] = link.cookies["qr_oauth_state"].value
    with patch("apps.accounts.oauth.facebook_profile", return_value=fb()):
        response = browser.get("/api/v1/auth/facebook/callback/", {"state": state, "code": "abc"})

    assert where(response) == ("/dashboard/parametres/connexion", {"auth_error": "conflict"})
    assert not boss_user.identities.exists()


def test_identities_listing_and_unlink_guard(db, boss_user):
    AuthIdentity.objects.create(user=boss_user, provider="google", subject="g-1", email="boss@example.com")
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(boss_user)}")

    assert [i["provider"] for i in client.get("/api/v1/auth/identities/").data["identities"]] == ["google"]
    refused = client.delete("/api/v1/auth/identities/google/")
    assert refused.status_code == 400 and refused.data["error"]["code"] == "last_identity"

    AuthIdentity.objects.create(user=boss_user, provider="facebook", subject="fb-1")
    assert client.delete("/api/v1/auth/identities/facebook/").status_code == 204


# ------------------------------------------------- Google (même résolveur, mêmes règles)

def google_claims(sub="g-1", email="awa@example.com", verified=True):
    return {"sub": sub, "email": email, "email_verified": verified, "name": "Awa Koné", "picture": "https://x/g.jpg"}


def google_login(claims):
    with patch("apps.accounts.views.verify_google_credential", return_value=claims):
        return APIClient().post("/api/v1/auth/google/", {"credential": "jwt"}, format="json")


def test_existing_google_account_gets_its_identity_on_next_login_without_duplicate(db, boss_user):
    # Compte créé avant AuthIdentity : aucune identité enregistrée, on ne connaît pas son `sub`.
    assert not boss_user.identities.exists()

    response = google_login(google_claims(email=boss_user.email.upper()))

    assert response.status_code == 200 and response.data["is_new"] is False
    assert response.data["user"]["id"] == str(boss_user.id)
    assert User.objects.count() == 1
    assert boss_user.identities.get().subject == "g-1"  # rattrapage automatique à la première reconnexion


def test_google_login_after_facebook_login_is_the_same_account(db):
    client = APIClient()
    _, state = start(client, "facebook")
    with patch("apps.accounts.oauth.facebook_profile", return_value=fb()):
        client.get("/api/v1/auth/facebook/callback/", {"state": state, "code": "abc"})

    response = google_login(google_claims())

    assert response.status_code == 200 and response.data["is_new"] is False and User.objects.count() == 1


def test_google_unverified_email_is_refused(db, boss_user):
    response = google_login(google_claims(email=boss_user.email, verified=False))

    assert response.status_code == 400 and "access" not in response.data
    assert not boss_user.identities.exists()


def test_link_flow_for_a_user_deactivated_meanwhile_never_falls_back_to_a_login(db, boss_user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(boss_user)}")
    link = client.post("/api/v1/auth/facebook/link/")
    state = parse_qs(urlparse(link.data["url"]).query)["state"][0]
    User.objects.filter(id=boss_user.id).update(is_active=False)  # désactivé avant le retour de Facebook

    browser = APIClient(); browser.cookies["qr_oauth_state"] = link.cookies["qr_oauth_state"].value
    with patch("apps.accounts.oauth.facebook_profile", return_value=fb(email="nouveau@example.com")):
        response = browser.get("/api/v1/auth/facebook/callback/", {"state": state, "code": "abc"})

    assert where(response) == ("/dashboard/parametres/connexion", {"auth_error": "state"})
    assert "qr_refresh_token" not in response.cookies and User.objects.count() == 1  # aucun compte créé « à la place »


def test_callback_resolves_without_trailing_slash_even_for_apple_post(db):
    """Les URLs enregistrées chez Meta/Apple n'ont pas de slash final : le POST d'Apple doit passer tel quel."""
    client = APIClient()
    _, state = start(client, "apple")
    with patch("apps.accounts.oauth.apple_profile", return_value=apple()):
        response = client.post("/api/v1/auth/apple/callback", {"state": state, "code": "abc"}, format="multipart")

    assert response.status_code == 302 and where(response) == ("/connexion/callback", {"new": "1"})


def test_unconfigured_provider_is_disabled_everywhere(settings, db):
    settings.FACEBOOK_APP_ID = ""

    assert APIClient().get("/api/v1/auth/facebook/start/").status_code == 404
    assert APIClient().get("/api/v1/auth/facebook/callback/", {"state": "x", "code": "y"}).status_code == 404
    assert APIClient().get("/api/v1/auth/apple/start/").status_code == 302  # Apple, lui, est configuré
