"""Logique metier de l'authentification — separee des views (akatech-backend-architect
Niveau A : "Aucune logique metier dans les views/controllers")."""
import os
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone

from django.db import IntegrityError, transaction
from django.utils import timezone as django_timezone
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from apps.organizations.models import Organization

from .models import AuditEvent, AuthIdentity, RefreshSession, StaffInvitation, User

DEFAULT_FORM_SCHEMA = [
    {"id": "nom", "type": "text", "label": "Nom & Prénoms", "required": True},
    {"id": "telephone", "type": "phone", "label": "Téléphone / WhatsApp", "required": True},
    {
        "id": "motif",
        "type": "select",
        "label": "Motif de la visite",
        "options": ["Rendez-vous", "Livraison", "Autre"],
        "required": False,
    },
    {"id": "signature", "type": "signature", "label": "Signature", "required": True},
]


class InvalidGoogleTokenError(Exception):
    """Le jeton d'identite Google est absent, malforme, expire ou signe pour un autre client."""


class RevokedAccessError(Exception):
    """L’adresse Google est explicitement exclue d’un établissement."""


def verify_google_credential(credential: str) -> dict:
    try:
        return id_token.verify_oauth2_token(
            credential, google_requests.Request(), os.environ.get("GOOGLE_CLIENT_ID")
        )
    except ValueError as exc:
        raise InvalidGoogleTokenError(str(exc)) from exc


@transaction.atomic
def resolve_or_create_user(google_profile: dict) -> tuple[User, bool]:
    """Retourne (user, created). Trois cas :
    1. L'email existe deja -> on renvoie ce compte.
    2. Une invitation Staff non acceptee correspond a cet email -> rattachement STAFF
       a l'organisation qui a invite (le patron a saisi cet email au prealable,
       cf. InviteStaffView : la garantie d'identite vient de Google, pas du token).
    3. Sinon -> nouvel espace BOSS avec organisation, QR token et formulaire par defaut.
    """
    email = google_profile["email"]
    existing = User.objects.filter(email__iexact=email).first()
    if existing:
        # Un compte créé avant l’ajout des avatars peut encore avoir une photo
        # vide. Google reste la source de secours, mais une URL Cloudinary
        # personnalisée ne doit jamais être écrasée par une reconnexion.
        google_picture = str(google_profile.get("picture") or "").strip()
        updates = []
        if not existing.avatar_url and google_picture:
            existing.avatar_url = google_picture
            updates.append("avatar_url")
        if not existing.full_name and google_profile.get("name"):
            existing.full_name = str(google_profile["name"]).strip()
            updates.append("full_name")
        if updates:
            existing.save(update_fields=updates)
        return existing, False

    if StaffInvitation.objects.filter(email__iexact=email, revoked_at__isnull=False).exists():
        raise RevokedAccessError("Vous ne faites plus partie du staff ou de la gestion de cet établissement.")

    invitation = (
        StaffInvitation.objects.filter(email__iexact=email, accepted_at__isnull=True)
        .order_by("-created_at")
        .first()
    )

    if invitation:
        manager = invitation.invited_by if invitation.role == User.Role.STAFF and invitation.invited_by and invitation.invited_by.role == User.Role.GERANT else None
        user = User.objects.create_user(
            email=email,
            full_name=google_profile.get("name", ""),
            avatar_url=google_profile.get("picture", ""),
            role=invitation.role,
            organization=invitation.organization,
            manager=manager,
        )
        invitation.accepted_at = user.created_at
        invitation.save(update_fields=["accepted_at"])
        return user, True

    organization = Organization.objects.create(
        name=google_profile.get("name", "Mon établissement"),
        qr_secure_token=secrets.token_urlsafe(16),
    )
    user = User.objects.create_user(
        email=email,
        full_name=google_profile.get("name", ""),
        avatar_url=google_profile.get("picture", ""),
        role=User.Role.BOSS,
        organization=organization,
    )
    # Import local : evite un cycle apps.accounts <-> apps.checkins au chargement.
    from apps.checkins.models import AccessPoint, FormTemplate

    template = FormTemplate.objects.create(
        organization=organization, title="Registre d'accès", fields_schema=DEFAULT_FORM_SCHEMA, is_default=True
    )
    AccessPoint.objects.create(organization=organization, form_template=template, name="Accueil principal", secure_token=organization.qr_secure_token)
    return user, True


# ---------------------------------------------------------------------------
# Connexion multi-fournisseurs (Google / Facebook / Apple) sans doublon de compte
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ProviderProfile:
    """Ce que le serveur a VÉRIFIÉ chez le fournisseur (jamais ce que le navigateur affirme)."""

    provider: str
    subject: str  # identifiant stable chez le fournisseur : sub (Google/Apple), id (Facebook)
    email: str = ""
    email_verified: bool = False
    is_private_email: bool = False  # Apple « Masquer mon e-mail » (…@privaterelay.appleid.com)
    name: str = ""
    picture: str = ""


class EmailRequiredError(Exception):
    """Aucun e-mail vérifié exploitable : on ne crée RIEN (ce serait un doublon en puissance)."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code  # email_missing | email_unverified | email_private_relay


class IdentityConflictError(Exception):
    """Cette identité (ou ce fournisseur) est déjà liée à un autre compte."""


class LastIdentityError(Exception):
    """On ne retire jamais la dernière façon de se connecter."""


def normalize_email(value) -> str:
    return str(value or "").strip().lower()


def _create_identity(user: User, profile: ProviderProfile, now) -> AuthIdentity:
    return AuthIdentity.objects.create(
        user=user,
        provider=profile.provider,
        subject=profile.subject,
        email=normalize_email(profile.email),
        email_verified=profile.email_verified,
        last_login_at=now,
    )


def _touch_identity(identity: AuthIdentity, profile: ProviderProfile, now) -> None:
    identity.last_login_at = now
    update = ["last_login_at"]
    email = normalize_email(profile.email)
    if email and (identity.email != email or identity.email_verified != profile.email_verified):
        identity.email, identity.email_verified = email, profile.email_verified
        update += ["email", "email_verified"]
    identity.save(update_fields=update)


def _resolve_login_once(profile: ProviderProfile, link_to: User | None) -> tuple[User, bool]:
    now = django_timezone.now()

    # 1. Identité déjà connue (provider + subject) -> le compte auquel elle est liée.
    #    Prime sur tout : l'e-mail a pu changer, être masqué ou absent chez le fournisseur.
    identity = AuthIdentity.objects.select_related("user").filter(provider=profile.provider, subject=profile.subject).first()
    if identity:
        if link_to and identity.user_id != link_to.id:
            raise IdentityConflictError("identity_belongs_to_other_account")
        _touch_identity(identity, profile, now)
        return identity.user, False

    # 2. Mode « lier » : l'utilisateur est DÉJÀ connecté, aucun rapprochement par e-mail
    #    nécessaire (c'est la voie sûre pour Facebook sans e-mail ou Apple « masqué »).
    if link_to:
        if AuthIdentity.objects.filter(user=link_to, provider=profile.provider).exists():
            raise IdentityConflictError("provider_already_linked")
        _create_identity(link_to, profile, now)
        return link_to, False

    # 3. Nouvelle identité : on ne rapproche d'un compte QUE par un e-mail vérifié.
    email = normalize_email(profile.email)
    if not email:
        raise EmailRequiredError("email_missing")
    if profile.is_private_email:
        raise EmailRequiredError("email_private_relay")
    if not profile.email_verified:
        raise EmailRequiredError("email_unverified")

    # Réutilise tel quel le flux existant : compte existant, invitation Staff, ou nouvel espace patron.
    user, created = resolve_or_create_user({"email": email, "name": profile.name, "picture": profile.picture})
    if AuthIdentity.objects.filter(user=user, provider=profile.provider).exists():
        # Même e-mail, mais un AUTRE compte du même fournisseur est déjà lié à ce compte.
        raise IdentityConflictError("provider_already_linked")
    _create_identity(user, profile, now)
    return user, created


def resolve_login(profile: ProviderProfile, link_to: User | None = None) -> tuple[User, bool]:
    """Point d'entrée unique de TOUTES les connexions. Retourne (user, created).

    Deux premières connexions simultanées (ex. Google + Facebook, même e-mail) peuvent se
    marcher dessus : les contraintes d'unicité tranchent, on relit alors une seule fois.
    """
    for attempt in (1, 2):
        try:
            with transaction.atomic():
                return _resolve_login_once(profile, link_to)
        except IntegrityError:
            if attempt == 2:
                raise
    raise AssertionError("unreachable")


@transaction.atomic
def unlink_identity(user: User, provider: str) -> None:
    identities = list(AuthIdentity.objects.select_for_update().filter(user=user))
    target = next((i for i in identities if i.provider == provider), None)
    if target is None:
        return
    if len(identities) <= 1:
        raise LastIdentityError("last_identity")
    target.delete()


MAX_GERANT_PER_ORG = 5
MAX_STAFF_PER_ORG = 5
ROLE_CAPS = {User.Role.GERANT: MAX_GERANT_PER_ORG, User.Role.STAFF: MAX_STAFF_PER_ORG}


def count_role_usage(organization, role: str) -> int:
    """Compte les membres deja actifs + les invitations encore en attente pour ce
    role, pour ne pas laisser une avalanche d'invitations depasser le plafond une
    fois toutes acceptees."""
    accepted = User.objects.filter(organization=organization, role=role).count()
    pending = StaffInvitation.objects.filter(
        organization=organization, role=role, accepted_at__isnull=True
    ).count()
    return accepted + pending


def create_staff_invitation(organization, email: str, invited_by: User, role: str = User.Role.STAFF) -> StaffInvitation:
    return StaffInvitation.objects.create(
        organization=organization,
        email=email,
        role=role,
        token=secrets.token_urlsafe(24),
        invited_by=invited_by,
    )


def register_refresh_session(user: User, refresh_token, request) -> RefreshSession:
    """Enregistre uniquement le JTI du refresh JWT, jamais le token lui-même."""
    session = RefreshSession.objects.create(
        user=user,
        jti=str(refresh_token["jti"]),
        user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:512],
        ip_address=request.META.get("REMOTE_ADDR"),
        expires_at=datetime.fromtimestamp(int(refresh_token["exp"]), tz=timezone.utc),
    )
    if user.organization_id:
        AuditEvent.objects.create(
            organization=user.organization,
            actor=user,
            action="auth.login",
            metadata={"session_id": str(session.id)},
        )
    return session


def revoke_refresh_session(raw_token: str | None, reason: str = "logout") -> None:
    """Révoque une session par son JTI sans jamais journaliser la valeur du JWT."""
    if not raw_token:
        return
    try:
        from rest_framework_simplejwt.tokens import RefreshToken

        jti = str(RefreshToken(raw_token)["jti"])
    except Exception:
        return
    session = RefreshSession.objects.select_related("user", "user__organization").filter(jti=jti, revoked_at__isnull=True).first()
    if not session:
        return
    session.revoked_at = django_timezone.now()
    session.save(update_fields=["revoked_at"])
    if session.user.organization_id:
        AuditEvent.objects.create(
            organization=session.user.organization,
            actor=session.user,
            action="auth.session_revoked",
            metadata={"session_id": str(session.id), "reason": reason},
        )
