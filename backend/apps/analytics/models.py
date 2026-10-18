"""Suivi de la vitrine publique (accueil, pages SEO, connexion) — jamais de l'application connectée ni des formulaires visiteurs.

Principe : rien n'est enregistré, et aucun cookie n'est posé, tant que la personne n'a pas accepté la mesure d'audience dans le
bandeau cookies. Un refus n'incrémente qu'un compteur anonyme (`ConsentTally`), sans identifiant. Pas d'adresse IP, pas de
user-agent complet, pas de paramètres d'URL : seulement le chemin, l'appareil, le navigateur et la provenance."""
import uuid

from django.db import models
from django.utils import timezone


class SiteVisitor(models.Model):
    """Un navigateur ayant accepté la mesure d'audience (cookie `rk_vid`, 13 mois)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=36, unique=True)
    first_seen_at = models.DateTimeField(default=timezone.now)
    last_seen_at = models.DateTimeField(default=timezone.now)
    visit_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-last_seen_at"]

    def __str__(self):
        return f"visiteur {self.key[:8]}"


class SiteSession(models.Model):
    """Une visite : glissante, elle se termine après 30 minutes d'inactivité (cookie `rk_sid`)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=36, unique=True)
    visitor = models.ForeignKey(SiteVisitor, on_delete=models.CASCADE, related_name="sessions")
    started_at = models.DateTimeField(default=timezone.now)
    last_activity_at = models.DateTimeField(default=timezone.now)
    device = models.CharField(max_length=10, default="desktop")
    browser = models.CharField(max_length=20, blank=True)
    os = models.CharField(max_length=20, blank=True)
    source = models.CharField(max_length=120, default="direct")
    landing_path = models.CharField(max_length=200, blank=True)
    page_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-started_at"]
        indexes = [models.Index(fields=["started_at"]), models.Index(fields=["last_activity_at"])]


class SitePageView(models.Model):
    session = models.ForeignKey(SiteSession, on_delete=models.CASCADE, related_name="page_views")
    path = models.CharField(max_length=200)
    viewed_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        indexes = [models.Index(fields=["path", "viewed_at"])]


class SiteAction(models.Model):
    """Clic d'action : valeur d'une liste fermée (voir `services.ACTION_TYPES`), jamais un texte libre venu du navigateur."""

    session = models.ForeignKey(SiteSession, on_delete=models.CASCADE, related_name="actions")
    type = models.CharField(max_length=30)
    path = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        indexes = [models.Index(fields=["type", "created_at"])]


class ConsentTally(models.Model):
    """Compteur anonyme des décisions du bandeau, par jour : permet de voir le taux d'acceptation sans identifier personne."""

    day = models.DateField(unique=True)
    accepted = models.PositiveIntegerField(default=0)
    rejected = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-day"]
