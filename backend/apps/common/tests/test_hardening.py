"""Garde-fous transverses : sonde de santé, taille des requêtes, identifiant de requête, routes d'administration."""
import pytest
from django.test import override_settings
from rest_framework.test import APIClient


def test_health_is_never_throttled(db):
    """Un 429 sur la sonde était pris pour « serveur éteint » par le frontend (blocage jusqu'à 3 min)."""
    client = APIClient()
    codes = {client.get("/api/v1/health/").status_code for _ in range(90)}  # > 60/min (limiteur anonyme)
    assert codes == {200}


def test_health_ignores_a_stale_authorization_header(db):
    """Un jeton périmé dans l'en-tête ne doit pas faire échouer la sonde en 401."""
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION="Bearer jeton.perime.invalide")
    assert client.get("/api/v1/health/").status_code == 200


@override_settings(API_MAX_BODY_BYTES=1_000)
def test_oversized_api_body_is_rejected_before_parsing(db, api_client):
    response = api_client.post("/api/v1/checkins/sync/", {"checkins": [], "padding": "x" * 5_000}, format="json")
    assert response.status_code == 413
    assert response.json()["code"] == "payload_too_large"


def test_normal_sized_body_is_accepted(db, api_client):
    assert api_client.post("/api/v1/checkins/sync/", {"checkins": []}, format="json").status_code == 200


def test_request_id_from_client_is_sanitised(db):
    client = APIClient()
    ok = client.get("/api/v1/health/", HTTP_X_REQUEST_ID="abc-123_x.y")
    assert ok["X-Request-ID"] == "abc-123_x.y"
    bad = client.get("/api/v1/health/", HTTP_X_REQUEST_ID="x" * 200)
    assert bad["X-Request-ID"] != "x" * 200 and len(bad["X-Request-ID"]) == 36  # UUID généré par le serveur
    weird = client.get("/api/v1/health/", HTTP_X_REQUEST_ID="a b<script>")
    assert "<" not in weird["X-Request-ID"]


def test_api_docs_and_django_admin_can_be_unmounted():
    """Le schéma décrit toute l'API (routes, champs, rôles) : pas de vitrine publique en production."""
    import importlib

    from django.urls import NoReverseMatch, clear_url_caches, reverse

    import core.urls

    try:
        with override_settings(EXPOSE_API_DOCS=False, DJANGO_ADMIN_URL=""):
            importlib.reload(core.urls)
            clear_url_caches()
            for name in ("schema", "swagger-ui", "admin:index"):
                with pytest.raises(NoReverseMatch):
                    reverse(name)
            assert reverse("health") == "/api/v1/health/"
        with override_settings(EXPOSE_API_DOCS=True, DJANGO_ADMIN_URL="gestion-interne/"):
            importlib.reload(core.urls)
            clear_url_caches()
            assert reverse("schema") == "/api/schema/"
            assert reverse("admin:index") == "/gestion-interne/"
    finally:
        importlib.reload(core.urls)
        clear_url_caches()
