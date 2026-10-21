"""Moteur de plans : plan effectif calculé à la lecture, contrôles côté serveur, paiements idempotents.

Règles du brief (Brief_implementation_plans_Rekollecte.md) appliquées ici :
 1. L'application des plans est DÉSACTIVÉE par défaut ; le mode « observer » journalise ce qui serait bloqué (`would_block`).
 2. La collecte des visiteurs n'est JAMAIS bloquée : aucune fonction de ce module n'est appelée pour refuser une synchronisation.
 3. L'export de sortie reste toujours disponible (voir CheckInExportView, `purpose=exit`).
 4. La fenêtre d'historique est une limite d'AFFICHAGE : rien n'est supprimé (la purge est un réglage séparé, voir checkins/privacy.py).
 9. Tout changement de plan et tout paiement passent par le journal d'audit (AuditEvent).
11. Une erreur de plan a toujours le même format (exceptions.PlanRequired)."""
import calendar
import logging
import math
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta

from django.conf import settings
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.accounts.models import AuditEvent

from .exceptions import PaymentConflict, PlanRequired
from .models import Payment, Subscription
from .plans import (
    FLAG_FEATURES, FREE, PLAN_ENTITLEMENTS, PLAN_LABELS, Entitlements, required_plan_for_flag, required_plan_for_history, required_plan_for_limit,
)

logger = logging.getLogger("qr_register.billing")

FEATURE_LABELS = {
    "export_csv": "L’export CSV du registre",
    "ocr": "La lecture des pièces d’identité",
    "phone": "Le champ téléphone du formulaire",
    "karnet": "REKOLLECTE+ (clients, réservations, rappels)",
    "access_points": "Les points d’accueil supplémentaires",
    "forms": "Les formulaires supplémentaires",
    "members": "Les membres supplémentaires",
    "history_window": "L’historique au-delà de la fenêtre du plan",
}


def enforcement_mode(now: datetime | None = None) -> str:
    """« enforce » seulement après ENFORCEMENT_STARTS_AT ; sinon « observe » (journalise sans rien bloquer), ou « off »."""
    starts_at = getattr(settings, "PLAN_ENFORCEMENT_STARTS_AT", None)
    if starts_at and (now or timezone.now()) >= starts_at:
        return "enforce"
    return "observe" if getattr(settings, "PLAN_OBSERVE_MODE", True) else "off"


@dataclass(frozen=True)
class EffectivePlan:
    plan: str  # plan dont les droits s'appliquent MAINTENANT
    state: str  # free | trialing | active | grace | expired | founder
    trial_ends_at: datetime | None = None
    trial_days_left: int | None = None
    period_end: datetime | None = None
    grace_until: datetime | None = None

    @property
    def entitlements(self) -> Entitlements:
        return PLAN_ENTITLEMENTS[self.plan]


def _subscription(organization) -> Subscription | None:
    try:
        return organization.subscription
    except Subscription.DoesNotExist:
        return None


def effective_plan(organization, now: datetime | None = None) -> EffectivePlan:
    """Plan en vigueur à l'instant `now`, calculé à la lecture (jamais par une tâche planifiée). Fin d'essai, impayé ou
    abonnement échu : retour au plan Gratuit ; les données ne sont jamais touchées."""
    now = now or timezone.now()
    sub = _subscription(organization)
    if sub is None:
        return EffectivePlan(plan=FREE, state="free")
    if sub.status == Subscription.Status.FOUNDER and (sub.founder_limits_from is None or now < sub.founder_limits_from):
        return EffectivePlan(plan=sub.plan, state="founder", period_end=sub.current_period_end)
    if sub.status == Subscription.Status.TRIALING:
        if sub.trial_ends_at and now <= sub.trial_ends_at:
            days_left = max(1, math.ceil((sub.trial_ends_at - now).total_seconds() / 86400))
            return EffectivePlan(plan=sub.plan, state="trialing", trial_ends_at=sub.trial_ends_at, trial_days_left=days_left)
        return EffectivePlan(plan=FREE, state="expired", trial_ends_at=sub.trial_ends_at)
    end = sub.current_period_end
    if end and now <= end:
        return EffectivePlan(plan=sub.plan, state="active", period_end=end)
    if end and sub.status != Subscription.Status.CANCELED:
        grace_until = end + timedelta(days=sub.grace_days)
        if now <= grace_until:
            return EffectivePlan(plan=sub.plan, state="grace", period_end=end, grace_until=grace_until)
    return EffectivePlan(plan=FREE, state="expired", period_end=end)


# ---------------------------------------------------------------------------------------------------------------------
# Contrôles. Une seule porte de sortie (`_deny`) : en « enforce » on refuse, en « observe » on journalise et on laisse passer.
# ---------------------------------------------------------------------------------------------------------------------

def _log_would_block(organization, feature: str, required_plan: str) -> None:
    """Journalise (au plus une fois par heure et par fonction) ce qui SERAIT bloqué si les plans étaient appliqués."""
    try:
        if not cache.add(f"would-block:{organization.id}:{feature}", 1, 3600):
            return
        current = effective_plan(organization)
        logger.warning("plan.would_block org=%s feature=%s plan=%s required=%s", organization.id, feature, current.plan, required_plan)
        AuditEvent.objects.create(
            organization=organization, action="plan.would_block",
            metadata={"feature": feature, "plan": current.plan, "state": current.state, "required_plan": required_plan, "mode": "observe"},
        )
    except Exception:  # la journalisation d'observation ne doit JAMAIS casser une requête
        logger.exception("plan.would_block: journalisation impossible")


def _message(feature: str, required_plan: str) -> str:
    return f"{FEATURE_LABELS.get(feature, feature)} : disponible à partir du plan {PLAN_LABELS[required_plan]}."


def _deny(organization, feature: str, required_plan: str, message: str | None = None) -> bool:
    mode = enforcement_mode()
    if mode == "enforce":
        raise PlanRequired(feature, required_plan, message or _message(feature, required_plan))
    if mode == "observe":
        _log_would_block(organization, feature, required_plan)
    return False


def feature_available(organization, feature: str) -> bool:
    """La fonction est-elle utilisable ? Vrai si le plan l'inclut ; en « observe » et « off » aussi (avec journal d'observation)."""
    if getattr(effective_plan(organization).entitlements, feature):
        return True
    mode = enforcement_mode()
    if mode == "enforce":
        return False
    if mode == "observe":
        _log_would_block(organization, feature, required_plan_for_flag(feature))
    return True


def enforce_feature(organization, feature: str, message: str | None = None) -> None:
    if not feature_available(organization, feature):
        raise PlanRequired(feature, required_plan_for_flag(feature), message or _message(feature, required_plan_for_flag(feature)))


def enforce_limit(organization, feature: str, current_count: int, message: str | None = None) -> None:
    """Refuse la création d'un élément de plus quand `current_count` a déjà atteint la limite du plan."""
    plan = effective_plan(organization)
    limit = getattr(plan.entitlements, feature)
    if current_count < limit:
        return
    required = required_plan_for_limit(feature, current_count + 1)
    _deny(organization, feature, required, message or f"Limite du plan {PLAN_LABELS[plan.plan]} atteinte ({limit}). {_message(feature, required)}")


def apply_history_window(queryset, organization, field: str = "created_at_client"):
    """Fenêtre d'AFFICHAGE du registre. Masquer n'est pas supprimer : les lignes restent en base et dans l'export de sortie."""
    days = effective_plan(organization).entitlements.history_days
    if days is None:
        return queryset
    cutoff = timezone.now() - timedelta(days=days)
    mode = enforcement_mode()
    if mode == "enforce":
        return queryset.filter(**{f"{field}__gte": cutoff})
    if mode == "observe" and cache.get(f"would-block:{organization.id}:history_window") is None and queryset.filter(**{f"{field}__lt": cutoff}).exists():
        _log_would_block(organization, "history_window", required_plan_for_history())
    return queryset


def karnet_active(organization) -> bool:
    """REKOLLECTE+ est utilisable : activé par l'exploitation (karnet_enabled) ET inclus dans le plan (quand les plans s'appliquent)."""
    return bool(organization.karnet_enabled) and feature_available(organization, "karnet")


def _is_phone_field(field: dict) -> bool:
    return field.get("type") == "phone" or field.get("identity_role") == "phone"


def blocked_field_ids(fields, organization) -> set[str]:
    """Champs du formulaire que le plan n'autorise pas (OCR de pièce, téléphone) : ils déclenchent une formalité légale."""
    blocked: set[str] = set()
    for field in fields or []:
        if not isinstance(field, dict) or not field.get("id"):
            continue
        if field.get("type") == "document_scan" and not feature_available(organization, "ocr"):
            blocked.add(field["id"])
        elif _is_phone_field(field) and not feature_available(organization, "phone"):
            blocked.add(field["id"])
    return blocked


def apply_entitlements_to_schema(fields, organization) -> list:
    """Schéma servi aux visiteurs : les champs non inclus dans le plan sont RETIRÉS (pas seulement masqués dans l'interface)."""
    blocked = blocked_field_ids(fields, organization)
    return [field for field in (fields or []) if not (isinstance(field, dict) and field.get("id") in blocked)]


# ---------------------------------------------------------------------------------------------------------------------
# Exposition (/org/me/, /billing/subscription/)
# ---------------------------------------------------------------------------------------------------------------------

def members_in_use(organization) -> int:
    active = organization.members.filter(is_active=True, is_superuser=False, access_revoked_at__isnull=True).count()
    pending = organization.invitations.filter(accepted_at__isnull=True, revoked_at__isnull=True).count()
    return active + pending


def billing_payload(organization) -> dict:
    plan = effective_plan(organization)
    mode = enforcement_mode()
    entitlements = asdict(plan.entitlements)
    # Les cadenas ne s'affichent QUE quand les plans s'appliquent vraiment : en « observe », l'interface ne montre aucune limite.
    locked = {feature: mode == "enforce" and not entitlements[feature] for feature in FLAG_FEATURES}
    return {
        "plan": plan.plan,
        "plan_label": PLAN_LABELS[plan.plan],
        "state": plan.state,
        "enforcement": mode,
        "trial_ends_at": plan.trial_ends_at,
        "trial_days_left": plan.trial_days_left,
        "period_end": plan.period_end,
        "grace_until": plan.grace_until,
        "entitlements": entitlements,
        "locked": locked,
        "required_plan": {feature: required_plan_for_flag(feature) for feature in FLAG_FEATURES},
        "plan_labels": PLAN_LABELS,
    }


def usage_payload(organization) -> dict:
    return {
        "access_points": organization.access_points.count(),
        "forms": organization.form_templates.count(),
        "members": members_in_use(organization),
    }


# ---------------------------------------------------------------------------------------------------------------------
# Paiements
# ---------------------------------------------------------------------------------------------------------------------

def add_months(moment: datetime, months: int) -> datetime:
    index = moment.month - 1 + months
    year, month = moment.year + index // 12, index % 12 + 1
    return moment.replace(year=year, month=month, day=min(moment.day, calendar.monthrange(year, month)[1]))


def record_payment(organization, *, plan: str, amount: int, method: str, reference: str, months: int = 1, paid_at: datetime | None = None,
                   recorded_by=None, fne_reference: str = "", note: str = "") -> tuple[Payment, bool]:
    """Enregistre un paiement et prolonge l'abonnement. IDEMPOTENT : la même référence ne compte qu'une fois (renvoie le paiement
    existant, created=False). Une référence déjà utilisée pour un autre établissement ou un autre montant lève PaymentConflict.

    Appelée par le bouton « Enregistrer un paiement » de l'administration ; le futur webhook de l'agrégateur appellera la même fonction."""
    reference = (reference or "").strip()
    if not reference:
        raise ValueError("La référence du paiement est obligatoire.")
    if amount <= 0 or months <= 0:
        raise ValueError("Le montant et la durée doivent être positifs.")
    paid_at = paid_at or timezone.now()

    def existing_payment():
        found = Payment.objects.filter(reference=reference).first()
        if found and (found.organization_ref != str(organization.id) or found.amount != amount):
            raise PaymentConflict("Cette référence existe déjà pour un autre établissement ou un autre montant.")
        return found

    with transaction.atomic():
        found = existing_payment()
        if found:
            return found, False
        sub, _ = Subscription.objects.select_for_update().get_or_create(organization=organization, defaults={"plan": FREE})
        now = timezone.now()
        extends = sub.plan == plan and sub.current_period_end and sub.current_period_end > now
        start = sub.current_period_end if extends else now
        end = add_months(start, months)
        try:
            with transaction.atomic():
                payment = Payment.objects.create(
                    organization=organization, organization_name=organization.name, organization_ref=str(organization.id), plan=plan,
                    amount=amount, method=method, reference=reference, period_start=start, period_end=end, paid_at=paid_at,
                    fne_reference=(fne_reference or "").strip(), note=note[:255], recorded_by=recorded_by,
                )
        except IntegrityError:  # deux enregistrements simultanés avec la même référence
            return existing_payment(), False
        sub.plan, sub.status, sub.current_period_end = plan, Subscription.Status.ACTIVE, end
        sub.save(update_fields=["plan", "status", "current_period_end", "updated_at"])
        AuditEvent.objects.create(
            organization=organization, actor=recorded_by, action="billing.payment_recorded",
            metadata={"reference": reference, "amount": amount, "plan": plan, "method": method, "period_end": end.isoformat(), "fne_reference": payment.fne_reference},
        )
        return payment, True


SUBSCRIPTION_ADMIN_FIELDS = ("plan", "status", "trial_ends_at", "current_period_end", "grace_days", "founder_notice_sent_at", "founder_limits_from")


def update_subscription(organization, changes: dict, *, actor=None) -> Subscription:
    """Changement de plan ou d'état par l'administration plateforme, tracé dans le journal d'audit (avant/après)."""
    sub, _ = Subscription.objects.get_or_create(organization=organization, defaults={"plan": FREE})
    before = {field: _jsonable(getattr(sub, field)) for field in SUBSCRIPTION_ADMIN_FIELDS}
    for field, value in changes.items():
        if field in SUBSCRIPTION_ADMIN_FIELDS:
            setattr(sub, field, value)
    sub.save()
    after = {field: _jsonable(getattr(sub, field)) for field in SUBSCRIPTION_ADMIN_FIELDS}
    AuditEvent.objects.create(organization=organization, actor=actor, action="billing.subscription_changed", metadata={"before": before, "after": after})
    return sub


def _jsonable(value):
    return value.isoformat() if isinstance(value, datetime) else value
