import uuid

from django.db import models


class FormTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="form_templates")
    title = models.CharField(max_length=255, default="Registre d'accès")
    fields_schema = models.JSONField(default=list)
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} — {self.organization.name}"


class AccessPoint(models.Model):
    """Un lieu ou appareil d'accueil possède son QR et son formulaire cible."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="access_points")
    form_template = models.ForeignKey(FormTemplate, on_delete=models.CASCADE, related_name="access_points")
    name = models.CharField(max_length=120)
    device_label = models.CharField(max_length=120, blank=True)
    secure_token = models.CharField(max_length=64, unique=True, db_index=True)
    is_active = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["organization", "name"], name="unique_access_point_name_per_org")]

    def __str__(self):
        return f"{self.name} — {self.organization.name}"


class CheckIn(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="checkins")
    form_template = models.ForeignKey(FormTemplate, on_delete=models.SET_NULL, null=True)
    # Une visite peut alimenter une fiche client quand REKOLLECTE+ est actif. La
    # relation reste nullable pour conserver l'historique du Niveau 1.
    client = models.ForeignKey(
        "karnet.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checkins",
    )
    access_point = models.ForeignKey(AccessPoint, on_delete=models.SET_NULL, null=True, blank=True, related_name="checkins")
    idempotency_key = models.UUIDField(unique=True)
    responses = models.JSONField(default=dict)
    signature_blob = models.TextField(blank=True, null=True)
    created_at_client = models.DateTimeField()
    synced_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at_client"]
        indexes = [models.Index(fields=["organization", "-created_at_client"]), models.Index(fields=["access_point", "-created_at_client"])]

    def __str__(self):
        return f"Check-in {self.id} — {self.organization_id}"
