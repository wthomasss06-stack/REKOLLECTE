from rest_framework import status
from rest_framework.exceptions import APIException


class PlanRequired(APIException):
    """Erreur de plan, TOUJOURS au même format : {code: "plan_required", feature, required_plan} (+ error.message pour l'interface)."""

    status_code = status.HTTP_403_FORBIDDEN
    default_code = "plan_required"

    def __init__(self, feature: str, required_plan: str, message: str):
        super().__init__(detail=message)
        self.feature = feature
        self.required_plan = required_plan


class PaymentConflict(Exception):
    """Une référence de paiement déjà enregistrée pour un autre établissement ou un autre montant."""
