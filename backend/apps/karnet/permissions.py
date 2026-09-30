"""Permission propre à karnet, en complément de celles de apps.common."""
from rest_framework.permissions import BasePermission


class HasKarnetEnabled(BasePermission):
    """Autorise uniquement si l'établissement a activé le Niveau 2 KARNET.
    Complète IsOrgMember : celle-ci vérifie le rôle, celle-ci vérifie le palier —
    même un membre valide de l'organisation ne peut pas contourner l'activation
    en appelant l'API directement."""

    message = "REKOLLECTE+ n'est pas activé pour cet établissement."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.organization_id
            and request.user.organization.karnet_enabled
        )
