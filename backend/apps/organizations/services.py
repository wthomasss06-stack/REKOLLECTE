"""Opérations métier sur les établissements."""
from django.db import transaction

from apps.karnet.models import Reservation


@transaction.atomic
def delete_organization(organization) -> None:
    """Supprime un établissement et TOUTES ses données (registre, clients, ressources, réservations, équipe).

    `Reservation.client` et `Reservation.resource` sont en PROTECT : supprimer directement l'établissement levait
    `ProtectedError` (500) dès qu'il existait une réservation — le bouton « Supprimer l'entreprise » échouait donc
    pour tout établissement ayant utilisé REKOLLECTE+. Les réservations partent d'abord, le reste suit en cascade."""
    Reservation.objects.filter(organization=organization).delete()
    organization.delete()
