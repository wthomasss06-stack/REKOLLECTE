from datetime import timedelta

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.organizations.models import Organization

from .models import Subscription
from .plans import PLUS


@receiver(post_save, sender=Organization)
def start_trial(sender, instance, created, raw=False, **kwargs):
    """Tout nouvel établissement démarre un essai de REKOLLECTE+ (14 jours par défaut). Fin d'essai = retour au plan Gratuit,
    jamais une suppression de données."""
    if raw or not created:
        return
    Subscription.objects.get_or_create(
        organization=instance,
        defaults={"plan": PLUS, "status": Subscription.Status.TRIALING, "trial_ends_at": timezone.now() + timedelta(days=settings.PLAN_TRIAL_DAYS)},
    )
