"""Facebook et Apple : flux « code d'autorisation » 100 % côté serveur.

Le navigateur ne fournit jamais d'identité : il revient avec un `code` à usage unique que le
serveur échange lui-même (secret du fournisseur à l'appui) puis relit chez le fournisseur.
Google reste géré par `verify_google_credential` (jeton d'identité vérifié par signature).
"""
import json
import time
from urllib.parse import urlencode

import jwt
import requests
from django.conf import settings
from jwt import PyJWKClient

from .services import ProviderProfile

TIMEOUT = 10  # secondes : un fournisseur lent ne doit jamais bloquer un worker gunicorn
APPLE_ISSUER = "https://appleid.apple.com"
_apple_jwks = PyJWKClient(f"{APPLE_ISSUER}/auth/keys", cache_keys=True)


class OAuthError(Exception):
    """Réponse invalide, jeton refusé ou fournisseur injoignable."""


def _truthy(value) -> bool:
    return value is True or str(value).lower() == "true"  # Apple envoie parfois "true" en chaîne


def redirect_uri(provider: str) -> str:
    # URL publique (via le rewrite Vercel) : doit être IDENTIQUE, au caractère près, à celle déclarée
    # chez Meta / Apple. Volontairement SANS slash final : ApiTrailingSlashMiddleware la résout en
    # interne, donc aucune redirection ne peut transformer le POST d'Apple en GET.
    return f"{settings.FRONTEND_URL.rstrip('/')}/api/v1/auth/{provider}/callback"


# ------------------------------------------------------------------ Facebook

def facebook_authorize_url(state: str) -> str:
    query = urlencode({
        "client_id": settings.FACEBOOK_APP_ID,
        "redirect_uri": redirect_uri("facebook"),
        "state": state,
        "response_type": "code",
        "scope": "public_profile,email",
    })
    return f"https://www.facebook.com/{settings.FACEBOOK_GRAPH_VERSION}/dialog/oauth?{query}"


def _json(response) -> dict:
    try:
        data = response.json()
    except ValueError as exc:
        raise OAuthError("réponse non JSON") from exc
    if response.status_code >= 400 or "error" in data:
        raise OAuthError(str(data.get("error", response.status_code)))
    return data


def facebook_profile(code: str) -> ProviderProfile:
    graph = f"https://graph.facebook.com/{settings.FACEBOOK_GRAPH_VERSION}"
    try:
        token = _json(requests.get(f"{graph}/oauth/access_token", timeout=TIMEOUT, params={
            "client_id": settings.FACEBOOK_APP_ID,
            "client_secret": settings.FACEBOOK_APP_SECRET,
            "redirect_uri": redirect_uri("facebook"),
            "code": code,
        }))["access_token"]
        # Le jeton est-il bien émis pour NOTRE app, et pour quel utilisateur ?
        debug = _json(requests.get("https://graph.facebook.com/debug_token", timeout=TIMEOUT, params={
            "input_token": token,
            "access_token": f"{settings.FACEBOOK_APP_ID}|{settings.FACEBOOK_APP_SECRET}",
        }))["data"]
        me = _json(requests.get(f"{graph}/me", timeout=TIMEOUT, params={
            "fields": "id,name,email,picture.type(large)",
            "access_token": token,
        }))
    except (requests.RequestException, KeyError) as exc:
        raise OAuthError(str(exc)) from exc

    if not debug.get("is_valid") or str(debug.get("app_id")) != str(settings.FACEBOOK_APP_ID):
        raise OAuthError("jeton Facebook émis pour une autre application")
    if str(me.get("id")) != str(debug.get("user_id")):
        raise OAuthError("identifiant Facebook incohérent")

    email = str(me.get("email") or "")
    return ProviderProfile(
        provider="facebook",
        subject=str(me["id"]),
        email=email,
        # Meta ne fournit aucun champ « email_verified » : l'e-mail n'est renvoyé que s'il est
        # confirmé (comportement constaté). Mets FACEBOOK_EMAIL_TRUSTED=false pour désactiver
        # tout rapprochement automatique par e-mail avec Facebook (voie « Comptes liés » seule).
        email_verified=bool(email) and settings.FACEBOOK_EMAIL_TRUSTED,
        name=str(me.get("name") or ""),
        picture=str((me.get("picture") or {}).get("data", {}).get("url") or ""),
    )


# --------------------------------------------------------------------- Apple

def apple_client_secret() -> str:
    """Le « secret » d'Apple est un JWT signé (ES256) avec ta clé .p8. Générée à la demande et
    valable 5 minutes : plus aucune échéance de 6 mois à renouveler."""
    now = int(time.time())
    return jwt.encode(
        {"iss": settings.APPLE_TEAM_ID, "iat": now, "exp": now + 300, "aud": APPLE_ISSUER, "sub": settings.APPLE_SERVICES_ID},
        settings.APPLE_PRIVATE_KEY.replace("\\n", "\n"),
        algorithm="ES256",
        headers={"kid": settings.APPLE_KEY_ID},
    )


def apple_authorize_url(state: str, nonce: str) -> str:
    query = urlencode({
        "client_id": settings.APPLE_SERVICES_ID,
        "redirect_uri": redirect_uri("apple"),
        "response_type": "code",
        "response_mode": "form_post",  # obligatoire dès qu'on demande name/email
        "scope": "name email",
        "state": state,
        "nonce": nonce,
    })
    return f"{APPLE_ISSUER}/auth/authorize?{query}"


def apple_profile(code: str, nonce: str, user_json: str = "") -> ProviderProfile:
    try:
        tokens = _json(requests.post(f"{APPLE_ISSUER}/auth/token", timeout=TIMEOUT, data={
            "client_id": settings.APPLE_SERVICES_ID,
            "client_secret": apple_client_secret(),
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri("apple"),
        }))
        id_token = tokens["id_token"]
        key = _apple_jwks.get_signing_key_from_jwt(id_token).key
        claims = jwt.decode(
            id_token, key, algorithms=["RS256"], audience=settings.APPLE_SERVICES_ID, issuer=APPLE_ISSUER,
            options={"require": ["exp", "iat", "iss", "aud", "sub"]},
        )
    except (requests.RequestException, KeyError, jwt.PyJWTError) as exc:
        raise OAuthError(str(exc)) from exc

    if claims.get("nonce") != nonce:
        raise OAuthError("nonce Apple invalide")

    # Apple n'envoie le nom (et l'e-mail) dans `user` qu'à la PREMIÈRE autorisation : à lire maintenant.
    first = ""
    try:
        name = (json.loads(user_json).get("name") or {}) if user_json else {}
        first = " ".join(p for p in (name.get("firstName"), name.get("lastName")) if p)
    except ValueError:
        pass

    return ProviderProfile(
        provider="apple",
        subject=str(claims["sub"]),
        email=str(claims.get("email") or ""),
        email_verified=_truthy(claims.get("email_verified")),
        is_private_email=_truthy(claims.get("is_private_email")),
        name=first,
    )
