from datetime import timedelta

from django.utils import timezone

from apps.billing.models import Subscription


def set_subscription(organization, *, plan="free", status="active", **fields):
    """Fixe l'abonnement d'un établissement de test (le signal en crée un d'essai à sa création)."""
    defaults = {"plan": plan, "status": status, "trial_ends_at": None, "current_period_end": None, "founder_limits_from": None}
    defaults.update(fields)
    sub, _ = Subscription.objects.update_or_create(organization=organization, defaults=defaults)
    organization.refresh_from_db()
    return sub


def free_plan(organization):
    """Plan Gratuit effectif (essai terminé, aucun paiement)."""
    return set_subscription(organization, plan="free", status="active")


def enforce_plans(settings):
    """Les plans s'appliquent pour de bon (date de démarrage dans le passé)."""
    settings.PLAN_ENFORCEMENT_STARTS_AT = timezone.now() - timedelta(days=1)
