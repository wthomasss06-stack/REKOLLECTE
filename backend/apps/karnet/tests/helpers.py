"""Fabriques partagées par les tests karnet (fonctions, pas des fixtures : elles
s'importent explicitement là où elles servent)."""
from decimal import Decimal

from apps.karnet.models import Resource


def enable_karnet(organization):
    organization.karnet_enabled = True
    organization.save(update_fields=["karnet_enabled"])
    return organization


def make_resource(organization, **overrides):
    defaults = {"organization": organization, "name": "Chambre 12", "unit": Resource.Unit.JOUR, "price": Decimal("30000")}
    defaults.update(overrides)
    return Resource.objects.create(**defaults)
