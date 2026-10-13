"""Fixtures partagees entre toutes les apps (racine du projet pytest — auto-decouvert,
pas besoin de les importer explicitement dans les fichiers de test)."""
import pytest
from django.core.cache import cache

from apps.accounts.models import User
from apps.checkins.models import FormTemplate
from apps.organizations.models import Organization

DEFAULT_SCHEMA = [
    {"id": "nom", "type": "text", "label": "Nom & Prénoms", "required": True},
    {"id": "telephone", "type": "phone", "label": "Téléphone", "required": True},
    {"id": "signature", "type": "signature", "label": "Signature", "required": True},
]


@pytest.fixture(autouse=True)
def _clear_cache():
    """Limiteurs de débit et rejeu OAuth vivent dans le cache (mémoire du process) : sans purge, l'état d'un test
    (compteurs de requêtes) fuit dans les suivants et provoque des 429 aléatoires."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def organization(db):
    return Organization.objects.create(name="Cabinet Test", qr_secure_token="test-token-123")


@pytest.fixture
def form_template(db, organization):
    return FormTemplate.objects.create(organization=organization, title="Registre", fields_schema=DEFAULT_SCHEMA)


@pytest.fixture
def boss_user(db, organization):
    return User.objects.create_user(email="patron@example.com", role=User.Role.BOSS, organization=organization)


@pytest.fixture
def gerant_user(db, organization):
    return User.objects.create_user(email="gerant@example.com", role=User.Role.GERANT, organization=organization)


@pytest.fixture
def staff_user(db, organization):
    return User.objects.create_user(email="agent@example.com", role=User.Role.STAFF, organization=organization)


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient

    return APIClient()
