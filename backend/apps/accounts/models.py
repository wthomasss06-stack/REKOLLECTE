import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class CustomUserManager(BaseUserManager):
    """Auth Google uniquement : aucun mot de passe local n'est jamais defini ni hashe ici."""

    def create_user(self, email, **extra_fields):
        if not email:
            raise ValueError("L'email est obligatoire.")
        user = self.model(email=self.normalize_email(email), **extra_fields)
        user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Reservee a l'acces Django admin (pas au flux produit)."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.BOSS)
        user = self.create_user(email, **extra_fields)
        if password:
            user.set_password(password)
            user.save(using=self._db)
        return user


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        BOSS = "BOSS", "Patron"
        GERANT = "GERANT", "Gérant"
        STAFF = "STAFF", "Agent"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    avatar_url = models.TextField(blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.BOSS)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="members",
        null=True,
        blank=True,
    )
    manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="managed_members",
        null=True,
        blank=True,
        limit_choices_to={"role": Role.GERANT},
    )
    is_active = models.BooleanField(default=True)
    access_revoked_at = models.DateTimeField(null=True, blank=True)
    access_revoked_reason = models.CharField(max_length=255, blank=True)
    is_staff = models.BooleanField(default=False)  # acces Django admin, distinct du role produit STAFF
    created_at = models.DateTimeField(auto_now_add=True)

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        indexes = [models.Index(fields=["organization"])]

    def __str__(self):
        return f"{self.email} ({self.role})"


class StaffInvitation(models.Model):
    """Le rattachement reel se fait par correspondance d'email a la premiere connexion
    Google de l'invite (voir accounts.services.resolve_or_create_user) — ce token ne
    sert qu'a generer un lien partageable, pas a authentifier le rattachement."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="invitations"
    )
    email = models.EmailField()
    role = models.CharField(max_length=10, choices=User.Role.choices, default=User.Role.STAFF)
    token = models.CharField(max_length=64, unique=True)
    invited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["email", "accepted_at"])]

    def __str__(self):
        return f"Invitation {self.email} -> {self.organization.name}"


class AuditEvent(models.Model):
    """Journal append-only des changements d’accès et d’administration d’équipe."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="audit_events")
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="audit_events_created")
    action = models.CharField(max_length=80)
    target_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_events_targeted")
    target_invitation = models.ForeignKey(StaffInvitation, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_events")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["organization", "created_at"])]


class RefreshSession(models.Model):
    """Session refresh indépendante par appareil, révocable sans déconnecter les autres appareils."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="refresh_sessions")
    jti = models.CharField(max_length=64, unique=True)
    user_agent = models.CharField(max_length=512, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    # Posé UNIQUEMENT quand la session est révoquée par rotation (jamais par déconnexion ou
    # révocation manuelle). Sert de fenêtre de grâce : deux refresh simultanés avec le même
    # cookie (onglets multiples, PWA + navigateur) ne doivent pas se faire échouer l'un l'autre.
    rotated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "revoked_at"]),
            models.Index(fields=["expires_at"]),
        ]


class AuthIdentity(models.Model):
    """Une façon de se connecter (Google, Facebook, Apple) rattachée à UN seul compte.

    C'est ce qui évite les doublons : le compte (User) est la personne, l'identité n'est
    qu'une clé d'entrée. Le couple (provider, subject) est l'identifiant STABLE du
    fournisseur (jamais l'e-mail, qui peut changer ou être masqué).
    """

    class Provider(models.TextChoices):
        GOOGLE = "google", "Google"
        FACEBOOK = "facebook", "Facebook"
        APPLE = "apple", "Apple"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="identities")
    provider = models.CharField(max_length=20, choices=Provider.choices)
    subject = models.CharField(max_length=255)
    email = models.EmailField(blank=True)  # e-mail vu chez le fournisseur (information)
    email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_login_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            # Une identité fournisseur n'appartient qu'à un seul compte...
            models.UniqueConstraint(fields=["provider", "subject"], name="uniq_authidentity_provider_subject"),
            # ...et un compte n'a qu'une identité par fournisseur.
            models.UniqueConstraint(fields=["user", "provider"], name="uniq_authidentity_user_provider"),
        ]

    def __str__(self):
        return f"{self.provider}:{self.subject} -> {self.user_id}"

