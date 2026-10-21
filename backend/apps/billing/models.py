import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from .plans import ENTREPRISE, ESSENTIEL, FREE, PLUS, PLAN_LABELS

PLAN_CHOICES = [(FREE, "Gratuit"), (ESSENTIEL, "Essentiel"), (PLUS, "REKOLLECTE+"), (ENTREPRISE, "Entreprise")]

RECEIPT_LABEL = "Reçu interne, non fiscal"
INVOICE_LABEL = "Facture électronique (FNE)"


class Subscription(models.Model):
    """Abonnement d'un établissement. Seul l'état « de référence » est stocké ; l'état EFFECTIF (essai fini, impayé, délai de
    grâce) se calcule à la lecture (services.effective_plan) : aucune tâche planifiée, donc rien qui puisse rater une échéance."""

    class Status(models.TextChoices):
        TRIALING = "trialing", "Essai"
        ACTIVE = "active", "Actif"
        FOUNDER = "founder", "Fondateur"
        CANCELED = "canceled", "Résilié (valable jusqu'à la fin de la période)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.OneToOneField("organizations.Organization", on_delete=models.CASCADE, related_name="subscription")
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default=FREE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIALING)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    grace_days = models.PositiveSmallIntegerField(default=7)
    # Comptes existants : « fondateur » = aucune limitation avant cette date. Elle n'est posée qu'APRÈS l'envoi du préavis écrit.
    founder_notice_sent_at = models.DateTimeField(null=True, blank=True)
    founder_limits_from = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.organization.name} — {PLAN_LABELS.get(self.plan, self.plan)} ({self.status})"


class Payment(models.Model):
    """Paiement encaissé. Conservé 10 ans, SÉPARÉMENT de la purge des visites : aucune purge n'y touche, et l'établissement
    peut disparaître (SET_NULL) sans emporter ses paiements, d'où les copies de son nom et de son identifiant."""

    class Method(models.TextChoices):
        WAVE = "wave", "Wave"
        ORANGE_MONEY = "orange_money", "Orange Money"
        MTN_MOMO = "mtn_momo", "MTN MoMo"
        MOOV_MONEY = "moov_money", "Moov Money"
        BANK_TRANSFER = "bank_transfer", "Virement"
        CASH = "cash", "Espèces"
        OTHER = "other", "Autre"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.SET_NULL, null=True, related_name="payments")
    organization_name = models.CharField(max_length=255)
    organization_ref = models.CharField(max_length=36)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES)
    amount = models.PositiveIntegerField(help_text="Montant en FCFA (XOF).")
    currency = models.CharField(max_length=3, default="XOF")
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.OTHER)
    # Référence de l'opérateur ou du virement. UNIQUE : c'est la clé d'idempotence (la même référence ne compte qu'une fois).
    reference = models.CharField(max_length=120, unique=True)
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    paid_at = models.DateTimeField(default=timezone.now)
    # Vide tant qu'aucune facture électronique n'est émise : le document s'appelle alors « reçu interne, non fiscal ».
    fne_reference = models.CharField(max_length=120, blank=True, default="")
    note = models.CharField(max_length=255, blank=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="recorded_payments")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-paid_at"]
        indexes = [models.Index(fields=["organization", "paid_at"])]

    @property
    def document_label(self) -> str:
        """Jamais « facture » sans référence FNE."""
        return INVOICE_LABEL if self.fne_reference else RECEIPT_LABEL

    def __str__(self):
        return f"{self.organization_name} — {self.amount} {self.currency} ({self.reference})"
