"""Connexion / liaison Facebook et Apple : démarrage puis retour (callback) côté serveur."""
import hmac
import secrets
from urllib.parse import urlencode

from django.conf import settings
from django.core import signing
from django.http import HttpResponseRedirect
from rest_framework import throttling
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from . import oauth
from .cookies import set_refresh_cookie
from .models import AuditEvent, User
from .services import (
    EmailRequiredError,
    IdentityConflictError,
    LastIdentityError,
    RevokedAccessError,
    register_refresh_session,
    resolve_login,
    unlink_identity,
)

PROVIDERS = {"facebook", "apple"}


def provider_enabled(provider: str) -> bool:
    """Un fournisseur non configuré (variables d'environnement vides) répond 404 : on peut donc
    déployer ce code AVANT d'avoir les clés Meta / Apple sans exposer de parcours cassé."""
    if provider == "facebook":
        return bool(settings.FACEBOOK_APP_ID and settings.FACEBOOK_APP_SECRET)
    if provider == "apple":
        return bool(settings.APPLE_SERVICES_ID and settings.APPLE_TEAM_ID and settings.APPLE_KEY_ID and settings.APPLE_PRIVATE_KEY)
    return False

STATE_SALT = "oauth-state"
STATE_MAX_AGE = 600  # 10 minutes pour terminer la connexion chez le fournisseur


def _frontend(path: str, **params) -> str:
    query = f"?{urlencode(params)}" if params else ""
    return f"{settings.FRONTEND_URL.rstrip('/')}{path}{query}"


def _fail(code: str, mode: str = "login", clear: bool = False):
    """Redirige vers le frontend avec un code d'erreur lisible. Le cookie nonce n'est effacé
    qu'une fois le `state` validé : un appel forgé ne doit pas pouvoir casser une connexion en cours."""
    target = _frontend("/dashboard/parametres/connexion", auth_error=code) if mode == "link" else _frontend("/connexion", auth_error=code)
    response = HttpResponseRedirect(target)
    if clear:
        response.delete_cookie(settings.OAUTH_STATE_COOKIE, path=settings.REFRESH_COOKIE_PATH)
    return response


def build_authorize_url(provider: str, mode: str, user: User | None = None):
    """Retourne (url, state, nonce). `state` est signé ; `nonce` va dans un cookie : il lie le
    retour du fournisseur à CE navigateur (anti « login CSRF ») et, pour Apple, au jeton d'identité."""
    nonce = secrets.token_urlsafe(24)
    state = signing.dumps({"p": provider, "n": nonce, "m": mode, "u": str(user.id) if user else None}, salt=STATE_SALT)
    url = oauth.facebook_authorize_url(state) if provider == "facebook" else oauth.apple_authorize_url(state, nonce)
    return url, nonce


def _set_state_cookie(response, nonce: str) -> None:
    # SameSite=None : le retour d'Apple est un POST venant d'un autre site (form_post).
    response.set_cookie(settings.OAUTH_STATE_COOKIE, nonce, max_age=STATE_MAX_AGE, httponly=True,
                        secure=not settings.DEBUG, samesite="None" if not settings.DEBUG else "Lax",
                        path=settings.REFRESH_COOKIE_PATH)


class OAuthStartView(APIView):
    """GET /auth/<facebook|apple>/start/ — connexion : redirige vers le fournisseur."""

    permission_classes = [AllowAny]
    throttle_classes = [throttling.AnonRateThrottle]

    def get(self, request, provider):
        if provider not in PROVIDERS or not provider_enabled(provider):
            return Response(status=404)
        url, nonce = build_authorize_url(provider, "login")
        response = HttpResponseRedirect(url)
        _set_state_cookie(response, nonce)
        return response


class OAuthLinkStartView(APIView):
    """POST /auth/<provider>/link/ (connecté) — renvoie l'URL du fournisseur pour LIER ce compte."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [throttling.UserRateThrottle]

    def post(self, request, provider):
        if provider not in PROVIDERS or not provider_enabled(provider):
            return Response(status=404)
        url, nonce = build_authorize_url(provider, "link", request.user)
        response = Response({"url": url})
        _set_state_cookie(response, nonce)
        return response


class OAuthCallbackView(APIView):
    """Retour du fournisseur : GET (Facebook) ou POST form_post (Apple, depuis un autre site).
    Pas d'authentification de session donc pas de CSRF Django : le `state` signé + le cookie nonce
    jouent ce rôle."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes = [throttling.AnonRateThrottle]

    def get(self, request, provider):
        return self._handle(request, provider, request.query_params)

    def post(self, request, provider):
        return self._handle(request, provider, request.data)

    def _handle(self, request, provider, params):
        if provider not in PROVIDERS or not provider_enabled(provider):
            return Response(status=404)

        # 1. state signé + cookie : prouve que CE navigateur a démarré CE flux, il y a < 10 min.
        try:
            payload = signing.loads(str(params.get("state", "")), salt=STATE_SALT, max_age=STATE_MAX_AGE)
        except signing.BadSignature:
            return _fail("state")
        mode = payload.get("m", "login")
        cookie_nonce = request.COOKIES.get(settings.OAUTH_STATE_COOKIE, "")
        if payload.get("p") != provider or not cookie_nonce or not hmac.compare_digest(cookie_nonce, str(payload.get("n"))):
            return _fail("state", mode)

        if params.get("error") or not params.get("code"):
            return _fail("cancelled", mode, clear=True)  # l'utilisateur a refusé chez le fournisseur

        # 2. le serveur échange le code et relit l'identité chez le fournisseur.
        try:
            if provider == "facebook":
                profile = oauth.facebook_profile(str(params["code"]))
            else:
                profile = oauth.apple_profile(str(params["code"]), payload["n"], str(params.get("user", "")))
        except oauth.OAuthError:
            return _fail("provider", mode, clear=True)

        # 3. résolution anti-doublon (ou liaison si l'utilisateur était connecté).
        link_to = None
        if mode == "link":
            link_to = User.objects.filter(id=payload.get("u"), is_active=True).first()
            if link_to is None:
                return _fail("state", mode, clear=True)
        try:
            user, created = resolve_login(profile, link_to=link_to)
        except EmailRequiredError as exc:
            return _fail(exc.code, mode, clear=True)
        except IdentityConflictError:
            return _fail("conflict", mode, clear=True)
        except RevokedAccessError:
            return _fail("access_revoked", mode, clear=True)
        if not user.is_active:
            return _fail("access_revoked", mode, clear=True)

        if mode == "link":
            if user.organization_id:
                AuditEvent.objects.create(organization=user.organization, actor=user, action="auth.identity_linked",
                                          target_user=user, metadata={"provider": provider})
            response = HttpResponseRedirect(_frontend("/dashboard/parametres/connexion", linked=provider))
            response.delete_cookie(settings.OAUTH_STATE_COOKIE, path=settings.REFRESH_COOKIE_PATH)
            return response

        refresh = RefreshToken.for_user(user)
        response = HttpResponseRedirect(_frontend("/connexion/callback", new="1" if created else "0"))
        set_refresh_cookie(response, refresh)
        register_refresh_session(user, refresh, request)
        response.delete_cookie(settings.OAUTH_STATE_COOKIE, path=settings.REFRESH_COOKIE_PATH)  # usage unique
        return response


class IdentityListView(APIView):
    """GET /auth/identities/ — les façons de se connecter de ce compte."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = request.user.identities.order_by("created_at")
        return Response({"identities": [
            {"provider": i.provider, "email": i.email, "linked_at": i.created_at, "last_login_at": i.last_login_at} for i in rows
        ]})


class IdentityUnlinkView(APIView):
    """DELETE /auth/identities/<provider>/ — retire un fournisseur (jamais le dernier)."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [throttling.UserRateThrottle]

    def delete(self, request, provider):
        try:
            unlink_identity(request.user, provider)
        except LastIdentityError:
            return Response({"error": {"message": "Impossible de retirer ta dernière méthode de connexion.", "code": "last_identity", "retryable": False}}, status=400)
        return Response(status=204)
