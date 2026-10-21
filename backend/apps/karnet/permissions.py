"""Permission propre à karnet, en complément de celles de apps.common."""
from rest_framework.permissions import BasePermission


class HasKarnetEnabled(BasePermission):
    """Autorise uniquement si l'établissement a activé le Niveau 2 KARNET.
    Complète IsOrgMember : celle-ci vérifie le rôle, celle-ci vérifie le palier —
    même un membre valide de l'organisation ne peut pas contourner l'activation
    en appelant l'API directement."""

    message = "REKOLLECTE+ n'est pas activé pour cet établissement."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.organization_id):
            return False
        organization = request.user.organization
        if not organization.karnet_enabled:
            return False
        # Inclus dans le plan ? Quand les plans s'appliquent, lève PlanRequired (403 plan_required) ; sinon laisse passer.
        from apps.billing.services import enforce_feature

        enforce_feature(organization, "karnet")
        return True
