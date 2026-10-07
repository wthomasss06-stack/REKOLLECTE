import json
import time
from unittest.mock import MagicMock, patch

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa

from apps.accounts import oauth

APP_ID, APP_SECRET, SERVICES_ID = "1234567890", "fb-secret", "ci.rekollecte.web"


@pytest.fixture(autouse=True)
def provider_settings(settings):
    settings.FRONTEND_URL = "https://rekollecte-ci.vercel.app"
    settings.FACEBOOK_APP_ID, settings.FACEBOOK_APP_SECRET = APP_ID, APP_SECRET
    settings.FACEBOOK_GRAPH_VERSION, settings.FACEBOOK_EMAIL_TRUSTED = "v25.0", True
    settings.APPLE_SERVICES_ID, settings.APPLE_TEAM_ID, settings.APPLE_KEY_ID = SERVICES_ID, "TEAM123456", "KEY1234567"


def reply(payload, status=200):
    r = MagicMock(); r.status_code = status; r.json.return_value = payload
    return r


def fake_graph(me, debug_overrides=None):
    debug = {"is_valid": True, "app_id": APP_ID, "user_id": me.get("id")}
    debug.update(debug_overrides or {})

    def get(url, params=None, timeout=None):
        if url.endswith("/oauth/access_token"):
            assert params["code"] == "the-code" and params["client_secret"] == APP_SECRET
            assert params["redirect_uri"] == "https://rekollecte-ci.vercel.app/api/v1/auth/facebook/callback"
            return reply({"access_token": "user-token"})
        if url.endswith("/debug_token"):
            assert params["access_token"] == f"{APP_ID}|{APP_SECRET}"
            return reply({"data": debug})
        if url.endswith("/me"):
            return reply(me)
        raise AssertionError(url)
    return get


def test_facebook_profile_happy_path():
    me = {"id": "fb-42", "name": "Awa Koné", "email": "awa@example.com", "picture": {"data": {"url": "https://x/p.jpg"}}}
    with patch("apps.accounts.oauth.requests.get", side_effect=fake_graph(me)):
        profile = oauth.facebook_profile("the-code")

    assert (profile.provider, profile.subject, profile.email, profile.email_verified) == ("facebook", "fb-42", "awa@example.com", True)
    assert profile.picture == "https://x/p.jpg"


def test_facebook_without_email_is_not_verified():
    with patch("apps.accounts.oauth.requests.get", side_effect=fake_graph({"id": "fb-42", "name": "Awa"})):
        profile = oauth.facebook_profile("the-code")

    assert profile.email == "" and profile.email_verified is False


def test_facebook_email_can_be_distrusted_by_setting(settings):
    settings.FACEBOOK_EMAIL_TRUSTED = False
    with patch("apps.accounts.oauth.requests.get", side_effect=fake_graph({"id": "fb-42", "email": "awa@example.com"})):
        assert oauth.facebook_profile("the-code").email_verified is False


@pytest.mark.parametrize("override", [{"app_id": "999"}, {"is_valid": False}, {"user_id": "someone-else"}])
def test_facebook_token_for_another_app_or_user_is_rejected(override):
    with patch("apps.accounts.oauth.requests.get", side_effect=fake_graph({"id": "fb-42", "email": "a@b.co"}, override)):
        with pytest.raises(oauth.OAuthError):
            oauth.facebook_profile("the-code")


# ----------------------------------------------------------------------- Apple

@pytest.fixture
def apple_keys(settings):
    ec_key = ec.generate_private_key(ec.SECP256R1())
    settings.APPLE_PRIVATE_KEY = ec_key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    ).decode().replace("\n", "\\n")  # comme dans une variable d'environnement
    rsa_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return ec_key, rsa_key


def apple_id_token(rsa_key, **claims):
    now = int(time.time())
    base = {"iss": oauth.APPLE_ISSUER, "aud": SERVICES_ID, "sub": "apple-sub-1", "iat": now, "exp": now + 600,
            "nonce": "nonce-1", "email": "awa@example.com", "email_verified": "true", "is_private_email": "false"}
    base.update(claims)
    return jwt.encode({k: v for k, v in base.items() if v is not None}, rsa_key, algorithm="RS256", headers={"kid": "k1"})


def run_apple(rsa_key, id_token, nonce="nonce-1", user_json=""):
    signing_key = MagicMock(); signing_key.key = rsa_key.public_key()
    with patch("apps.accounts.oauth.requests.post", return_value=reply({"id_token": id_token})) as post, \
         patch.object(oauth._apple_jwks, "get_signing_key_from_jwt", return_value=signing_key):
        profile = oauth.apple_profile("the-code", nonce, user_json)
    return profile, post


def test_apple_client_secret_is_a_valid_short_lived_es256_jwt(apple_keys):
    ec_key, _ = apple_keys
    secret = oauth.apple_client_secret()

    claims = jwt.decode(secret, ec_key.public_key(), algorithms=["ES256"], audience=oauth.APPLE_ISSUER)
    assert claims["iss"] == "TEAM123456" and claims["sub"] == SERVICES_ID
    assert claims["exp"] - claims["iat"] <= 300 < 15777000  # bien en dessous du plafond de 6 mois d'Apple
    assert jwt.get_unverified_header(secret)["kid"] == "KEY1234567"


def test_apple_profile_happy_path_and_first_login_name(apple_keys):
    _, rsa_key = apple_keys
    user_json = json.dumps({"name": {"firstName": "Awa", "lastName": "Koné"}, "email": "awa@example.com"})

    profile, post = run_apple(rsa_key, apple_id_token(rsa_key), user_json=user_json)

    assert (profile.subject, profile.email, profile.email_verified, profile.is_private_email) == ("apple-sub-1", "awa@example.com", True, False)
    assert profile.name == "Awa Koné"
    sent = post.call_args.kwargs["data"]
    assert sent["grant_type"] == "authorization_code" and sent["client_id"] == SERVICES_ID and sent["client_secret"]


def test_apple_private_relay_flag_is_read(apple_keys):
    _, rsa_key = apple_keys
    token = apple_id_token(rsa_key, email="x7@privaterelay.appleid.com", is_private_email=True)
    profile, _ = run_apple(rsa_key, token)

    assert profile.is_private_email is True


@pytest.mark.parametrize("claims", [{"aud": "autre.app"}, {"iss": "https://evil.example"}, {"exp": 1}, {"nonce": "pas-le-bon"}])
def test_apple_rejects_forged_or_stale_tokens(apple_keys, claims):
    _, rsa_key = apple_keys
    with pytest.raises(oauth.OAuthError):
        run_apple(rsa_key, apple_id_token(rsa_key, **claims))


def test_apple_rejects_a_token_signed_by_someone_else(apple_keys):
    _, rsa_key = apple_keys
    attacker = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    with pytest.raises(oauth.OAuthError):
        run_apple(rsa_key, apple_id_token(attacker))
