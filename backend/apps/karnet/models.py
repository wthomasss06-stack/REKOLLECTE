import uuid

from django.db import models, transaction
from django.db.models import Count, Max
from django.utils import timezone


class ClientQuerySet(models.QuerySet):
    def with_activity(self):
        """Ajoute passages, réservations et dernière activité : ce que la liste
        REKOLLECTE+ et la fiche client affichent, calculé en une seule requête plutôt
        que N requêtes par client."""
        return self.annotate(
            checkins_count=Count("checkins", distinct=True),
            reservations_count=Count("reservations", distinct=True),
            last_checkin_at=Max("checkins__created_at_client"),
            last_reservation_at=Max("reservations__starts_at"),
        )


class Client(models.Model):
    """Un visiteur devenu client suivi : fiche + historique, au-delà d'un simple
    passage au registre. Toujours rattaché à un seul établissement."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="karnet_clients")
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = ClientQuerySet.as_manager()

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return f"{self.full_name} — {self.organization.name}"


class Resource(models.Model):
    """Une ressource facturable de l'établissement : chambre, table, équipement ou
    article. Le prix est déclaré par l'établissement (pas de paiement réel pour
    l'instant) et sert de base au calcul automatique du montant dû à chaque
    réservation/consommation.

    `billing_unit` est ce que Patron/Gérant choisissent dans ResourceBuilder (par
    nuit, par séance, forfait mensuel…) : c'est l'information affichée. `unit` en
    est dérivé automatiquement (voir Resource.unit_for_billing) et reste le seul
    champ que le moteur de réservation connaît pour calculer `ends_at` et détecter
    les conflits de créneau — on ne complique pas cette mécanique déjà validée à
    chaque nouveau mode de tarification métier."""

    class Unit(models.TextChoices):
        JOUR = "jour", "Par jour"
        HEURE = "heure", "Par heure"
        UNITE = "unite", "Par unité"

    class BillingUnit(models.TextChoices):
        HOUR = "hour", "Par heure"
        SESSION = "session", "Par séance"
        DAY = "day", "Par jour"
        NIGHT = "night", "Par nuit"
        MONTH = "month", "Par mois"
        FIXED = "fixed", "Forfait fixe"

    class Category(models.TextChoices):
        ACCOMMODATION = "accommodation", "Hébergement"
        BEAUTY = "beauty", "Beauté et soins"
        WORKSPACE = "workspace", "Espaces professionnels"
        EVENTS = "events", "Événementiel et restauration"
        PARKING = "parking", "Stationnement"
        LEISURE = "leisure", "Sport et loisirs"
        OTHER = "other", "Autre ressource"

    # hour/session -> HEURE (quantité = nombre d'heures) ; day/night -> JOUR
    # (quantité = nombre de jours/nuits) ; month/fixed -> UNITE (vente/forfait
    # sans créneau à bloquer — pas de détection de conflit pour ces deux-là).
    BILLING_TO_UNIT = {
        BillingUnit.HOUR: Unit.HEURE,
        BillingUnit.SESSION: Unit.HEURE,
        BillingUnit.DAY: Unit.JOUR,
        BillingUnit.NIGHT: Unit.JOUR,
        BillingUnit.MONTH: Unit.UNITE,
        BillingUnit.FIXED: Unit.UNITE,
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="karnet_resources")
    name = models.CharField(max_length=255)
    unit = models.CharField(max_length=10, choices=Unit.choices, default=Unit.UNITE)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Champs ResourceBuilder (catalogue par catégorie/type — hôtel, beauté, coworking…).
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER, blank=True)
    resource_type = models.CharField(max_length=100, blank=True)
    billing_unit = models.CharField(max_length=10, choices=BillingUnit.choices, blank=True, default="")
    code = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    capacity = models.PositiveIntegerField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    duration_label = models.CharField(max_length=100, blank=True)
    equipment = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.get_unit_display()}) — {self.organization.name}"

    def save(self, *args, **kwargs):
        # `unit` reste dérivé de `billing_unit` : jamais désynchronisé, même si
        # l'appelant ne l'envoie pas explicitement.
        if self.billing_unit:
            self.unit = self.BILLING_TO_UNIT.get(self.billing_unit, self.unit)
        super().save(*args, **kwargs)


class Reservation(models.Model):
    """Une réservation ou consommation d'une ressource par un client. Le montant est
    calculé et figé à la création (quantité × prix unitaire de la ressource à cet
    instant) : un changement de tarif ultérieur ne modifie jamais l'historique déjà
    facturé. Pour les ressources à l'heure comme au jour, `ends_at` est la fin du
    créneau : elle sert à la détection de conflit et au rappel de fin de créneau
    (voir `reminder_due`) ; pour les articles à l'unité, il reste `None` (vente
    immédiate, pas de créneau à réserver)."""

    class Status(models.TextChoices):
        EN_COURS = "en_cours", "En cours"
        TERMINEE = "terminee", "Terminée"
        ANNULEE = "annulee", "Annulée"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="karnet_reservations")
    # Numéro lisible et séquentiel par établissement (1, 2, 3…) : celui que l'équipe
    # dicte au téléphone ou retrouve dans l'historique d'un client. L'UUID reste
    # l'identifiant technique ; le numéro est attribué à la création (voir save()).
    number = models.PositiveIntegerField(editable=False)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="reservations")
    resource = models.ForeignKey(Resource, on_delete=models.PROTECT, related_name="reservations")
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.EN_COURS)
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    reminder_acknowledged = models.BooleanField(default=False)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="karnet_reservations_created")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-starts_at"]
        indexes = [
            models.Index(fields=["organization", "-starts_at"]),
            models.Index(fields=["resource", "status", "starts_at"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["organization", "number"], name="karnet_reservation_number_unique_per_org"),
        ]

    def __str__(self):
        return f"{self.resource.name} — {self.client.full_name} ({self.organization.name})"

    def save(self, *args, **kwargs):
        if self.number is None:
            with transaction.atomic():
                self.number = self._next_number()
                super().save(*args, **kwargs)
            return
        super().save(*args, **kwargs)

    def _next_number(self) -> int:
        # Le verrou sur la ligne de l'établissement sérialise les créations
        # simultanées : sans lui, deux réservations lisent le même « dernier
        # numéro » et l'une échoue sur la contrainte d'unicité.
        organization_model = self._meta.get_field("organization").related_model
        organization_model.objects.select_for_update().get(pk=self.organization_id)
        last_number = Reservation.objects.filter(organization_id=self.organization_id).aggregate(last=Max("number"))["last"]
        return (last_number or 0) + 1

    @property
    def reminder_due(self) -> bool:
        """Vrai si le créneau de cette réservation (à l'heure ou au jour) est écoulé
        et pas encore traité — c'est ce qui déclenche la sonnerie côté Rappels.
        Une réservation à l'unité n'a pas de `ends_at` : elle n'a jamais de rappel."""
        return bool(
            self.status == self.Status.EN_COURS
            and not self.reminder_acknowledged
            and self.ends_at is not None
            and self.ends_at <= timezone.now()
        )
