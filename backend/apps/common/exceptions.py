"""Format d'erreur standard pour tous les endpoints (akatech-backend-architect §Error handling)."""
from rest_framework.views import exception_handler

from apps.billing.exceptions import PlanRequired


def standard_exception_handler(exc, context):
    """Uniformise chaque erreur DRF en {"error": {"message", "retryable"}}.

    "retryable" indique au frontend s'il doit proposer un nouvel essai (5xx, throttle)
    ou rediriger vers une action corrective (401/403/404/400).
    """
    response = exception_handler(exc, context)
    if response is None:
        return None

    detail = response.data
    if isinstance(detail, dict) and "detail" in detail:
        message = str(detail["detail"])
    elif isinstance(detail, dict):
        message = "; ".join(f"{k}: {v}" for k, v in detail.items())
    else:
        message = str(detail)

    if isinstance(exc, PlanRequired):
        # Format unique des erreurs de plan : {code, feature, required_plan} + le message habituel pour l'interface.
        response.data = {
            "code": "plan_required", "feature": exc.feature, "required_plan": exc.required_plan,
            "error": {"message": message, "retryable": False, "code": "plan_required"},
        }
        return response

    response.data = {
        "error": {
            "message": message,
            "retryable": response.status_code >= 500 or response.status_code == 429,
        }
    }
    return response
