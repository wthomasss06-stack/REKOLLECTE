import uuid

from django.db import models


class Organization(models.Model):
    class KarnetCapability(models.TextChoices):
        """Sous-fonctionnalites du Niveau 2 KARNET, deblocables une a une une fois le
        socle active — voir Organization.capabilities."""

        RESERVATIONS = "reservations", "Réservations"
        PAYMENTS = "payments", "Paiements"
        RAPPELS = "rappels", "Rappels"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    logo_url = models.TextField(blank=True)
    is_suspended = models.BooleanField(default=False)
    visit_reasons = models.JSONField(default=list, blank=True)
    qr_secure_token = models.CharField(max_length=64, unique=True, db_index=True)
    karnet_enabled = models.BooleanField(default=False)
    karnet_capabilities = models.JSONField(default=dict, blank=True)
    # --- Confidentialité et conservation (réglables par le patron ; voir checkins/privacy.py) ---
    # Durée de conservation des visites en jours. Vide = durée par défaut de la plateforme (settings.RETENTION_VISITS_DAYS).
    retention_visits_days = models.PositiveIntegerField(null=True, blank=True)
    # Motifs prédéfinis uniquement : retire « Autre » (texte libre) du formulaire, où un visiteur pourrait écrire une donnée de santé.
    restrict_visit_reasons = models.BooleanField(default=False)
    # Numéro de pièce lu par l'OCR : masqué par défaut (seuls les derniers caractères sont gardés). À activer sur besoin démontré.
    store_document_number = models.BooleanField(default=False)
    # Contact « droits des personnes » affiché sur le formulaire. Vide = e-mail du patron.
    privacy_contact = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def capabilities(self) -> dict:
        """Etat effectif des fonctionnalites pour cet etablissement, calcule cote serveur
        uniquement — le frontend ne fait jamais ce calcul lui-meme (cf. plan de bascule
        Niveau 1 -> Niveau 2). `registration` (Renseignement) est le socle permanent,
        toujours actif. Une fois `karnet_enabled`, les sous-capacites KARNET sont
        actives PAR DEFAUT (ce sont des fonctionnalites reelles, pas des ecrans en
        preparation) ; un ops peut desactiver une sous-capacite precise pour un
        etablissement donne via le Django admin en la mettant explicitement a False
        dans karnet_capabilities. Tant que karnet_enabled est False, tout retombe a
        False sans effacer l'etat enregistre : reactiver KARNET restaure exactement
        ce qui etait deja configure."""
        # Le plan compte aussi : REKOLLECTE+ n'est actif que s'il est inclus dans le plan, quand les plans s'appliquent
        # (jamais avant : en mode « observer » le résultat est identique à karnet_enabled).
        from apps.billing.services import karnet_active

        active = karnet_active(self)
        if not active:
            subs = {key: False for key in self.KarnetCapability.values}
        else:
            subs = {key: bool(self.karnet_capabilities.get(key, True)) for key in self.KarnetCapability.values}
        return {"registration": True, "karnet": active, **subs}
