from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, status, throttling
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from apps.common.permissions import IsBoss, IsBossOrGerant
from apps.common.responses import error_response

from .cookies import clear_refresh_cookie, set_refresh_cookie
from .models import AuditEvent, RefreshSession, StaffInvitation, User
from .serializers import AuditEventSerializer, GoogleAuthSerializer, InviteStaffSerializer, StaffInvitationSerializer, UserProfileUpdateSerializer, UserSerializer
from .services import (
    ROLE_CAPS,
    InvalidGoogleTokenError,
    RevokedAccessError,
    count_role_usage,
    create_staff_invitation,
    register_refresh_session,
    resolve_or_create_user,
    revoke_refresh_session,
    verify_google_credential,
)


class GoogleAuthView(APIView):
    """Point d'entree unique de connexion. Aucun mot de passe : l'identite Google
    fait foi. Cree l'espace du patron a la premiere connexion, ou rattache un
    agent invite (voir accounts.services.resolve_or_create_user)."""

    permission_classes = [AllowAny]
    throttle_classes = [throttling.AnonRateThrottle]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            google_profile = verify_google_credential(serializer.validated_data["credential"])
        except InvalidGoogleTokenError:
            return error_response("Jeton Google invalide ou expiré. Reconnecte-toi.", status.HTTP_401_UNAUTHORIZED)

        try:
            user, created = resolve_or_create_user(google_profile)
        except RevokedAccessError as exc:
            return Response({"error": {"message": str(exc), "code": "access_revoked", "retryable": False}}, status=status.HTTP_403_FORBIDDEN)
        if not user.is_active:
            message = user.access_revoked_reason or "Votre compte n’est plus actif dans cet établissement."
            return Response({"error": {"message": message, "code": "access_revoked", "retryable": False}}, status=status.HTTP_403_FORBIDDEN)
        refresh = RefreshToken.for_user(user)

        response = Response(
            {
                "access": str(refresh.access_token),
                "is_new": created,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )
        set_refresh_cookie(response, refresh)
        register_refresh_session(user, refresh, request)
        return response


class CookieTokenRefreshView(APIView):
    """Renouvelle l'access token a partir du refresh token lu dans le cookie httpOnly
    (jamais depuis le corps de la requete). Distinguer 401 (cookie mort -> logout
    legitime) de toute autre erreur reste la responsabilite du frontend
    (skill jwt-auth-resilience) ; ce endpoint ne renvoie que du 200 ou du 401.

    Rotation a chaque appel, avec une fenetre de grace : un refresh token deja tourne
    depuis moins de REFRESH_ROTATION_LEEWAY_SECONDS est rejoue sans erreur (access token
    seul, cookie intact). Deux contextes qui rafraichissent en meme temps (onglets,
    PWA + navigateur, redemarrage a froid du serveur) ne s'invalident donc plus."""

    permission_classes = [AllowAny]

    @staticmethod
    def _reject():
        response = error_response("Session invalide, reconnecte-toi.", status.HTTP_401_UNAUTHORIZED)
        clear_refresh_cookie(response)
        return response

    def post(self, request):
        raw_token = request.COOKIES.get("qr_refresh_token")
        if not raw_token:
            return error_response("Session expirée, reconnecte-toi.", status.HTTP_401_UNAUTHORIZED)
        try:
            with transaction.atomic():
                refresh = RefreshToken(raw_token)
                # Le verrou de ligne sérialise les appels simultanés : le second attend que le
                # premier ait validé sa rotation, puis tombe dans la fenêtre de grâce ci-dessous.
                session = (
                    RefreshSession.objects.select_for_update()
                    .select_related("user")
                    .filter(jti=str(refresh["jti"]))
                    .first()
                )
                now = timezone.now()
                if not session or not session.user.is_active or session.expires_at <= now:
                    return self._reject()
                if session.revoked_at is not None:
                    # Déjà révoquée : seule une rotation récente est rejouable. Une déconnexion ou
                    # une révocation manuelle (rotated_at vide) ne l'est jamais.
                    leeway = timedelta(seconds=settings.REFRESH_ROTATION_LEEWAY_SECONDS)
                    if session.rotated_at is None or now - session.rotated_at > leeway:
                        return self._reject()
                    return Response({"access": str(AccessToken.for_user(session.user))})
                session.revoked_at = now
                session.rotated_at = now
                session.last_used_at = now
                session.save(update_fields=["revoked_at", "rotated_at", "last_used_at"])
                next_refresh = RefreshToken.for_user(session.user)
                register_refresh_session(session.user, next_refresh, request)
        except TokenError:
            return self._reject()
        response = Response({"access": str(next_refresh.access_token)})
        set_refresh_cookie(response, next_refresh)
        return response


class LogoutView(APIView):
    """AllowAny : un access token deja expire ne doit jamais bloquer la deconnexion."""

    permission_classes = [AllowAny]

    def post(self, request):
        revoke_refresh_session(request.COOKIES.get("qr_refresh_token"), reason="logout")
        response = Response({"detail": "Déconnecté."})
        clear_refresh_cookie(response)
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        update_fields = []
        for field in ("full_name", "avatar_url"):
            if field in serializer.validated_data:
                setattr(request.user, field, serializer.validated_data[field])
                update_fields.append(field)
        if update_fields:
            request.user.save(update_fields=update_fields)
        return Response(UserSerializer(request.user).data)


class DeactivateMeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role == "BOSS":
            return error_response("Le patron doit d’abord transférer ou supprimer l’entreprise.", status.HTTP_400_BAD_REQUEST)
        request.user.is_active = False
        request.user.save(update_fields=["is_active"])
        response = Response({"detail": "Compte désactivé."})
        clear_refresh_cookie(response)
        return response


class InviteStaffView(APIView):
    """BOSS et GERANT peuvent tous deux inviter — mais seul BOSS peut accorder le
    role GERANT (un GERANT ne peut inviter que des STAFF, jamais un pair)."""

    permission_classes = [IsAuthenticated, IsBossOrGerant]
    throttle_classes = [throttling.UserRateThrottle]

    def post(self, request):
        serializer = InviteStaffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        requested_role = serializer.validated_data.get("role", "STAFF")
        if requested_role == "GERANT" and request.user.role != "BOSS":
            return error_response(
                "Seul le patron peut inviter un gérant.", status.HTTP_403_FORBIDDEN
            )

        cap = ROLE_CAPS.get(requested_role)
        if cap and count_role_usage(request.user.organization, requested_role) >= cap:
            label = "gérants" if requested_role == "GERANT" else "agents"
            return error_response(
                f"Limite atteinte : {cap} {label} maximum (invitations en attente comprises).",
                status.HTTP_400_BAD_REQUEST,
            )

        invitation = create_staff_invitation(
            organization=request.user.organization,
            email=serializer.validated_data["email"],
            invited_by=request.user,
            role=requested_role,
        )
        invite_link = f"{request.build_absolute_uri('/')[:-1]}?invite={invitation.token}"
        return Response(
            {"invite_link": invite_link, "email": invitation.email, "role": invitation.role},
            status=status.HTTP_201_CREATED,
        )


class TeamAccessView(APIView):
    permission_classes = [IsAuthenticated, IsBossOrGerant]

    def get(self, request):
        organization = request.user.organization
        return Response({
            "members": UserSerializer(organization.members.filter(is_superuser=False).order_by("email"), many=True).data,
            "invitations": StaffInvitationSerializer(organization.invitations.order_by("-created_at"), many=True).data,
        })


class RevokeInvitationView(APIView):
    permission_classes = [IsAuthenticated, IsBoss]

    def post(self, request, invitation_id):
        invitation = StaffInvitation.objects.filter(id=invitation_id, organization=request.user.organization, accepted_at__isnull=True, revoked_at__isnull=True).first()
        if not invitation:
            return error_response("Invitation introuvable ou déjà traitée.", status.HTTP_404_NOT_FOUND)
        reason = str(request.data.get("reason") or "Invitation révoquée par le patron")[:255]
        invitation.revoked_at = timezone.now()
        invitation.revoked_reason = reason
        invitation.save(update_fields=["revoked_at", "revoked_reason"])
        AuditEvent.objects.create(organization=request.user.organization, actor=request.user, action="invitation.revoked", target_invitation=invitation, metadata={"email": invitation.email, "reason": reason})
        return Response(StaffInvitationSerializer(invitation).data)


class RevokeMemberView(APIView):
    permission_classes = [IsAuthenticated, IsBoss]

    def post(self, request, user_id):
        member = User.objects.filter(id=user_id, organization=request.user.organization, is_superuser=False).first()
        if not member or member.role == User.Role.BOSS:
            return error_response("Membre introuvable ou non révocable.", status.HTTP_404_NOT_FOUND)
        reason = str(request.data.get("reason") or "Vous ne faites plus partie du staff ou de la gestion de cet établissement.")[:255]
        member.is_active = False
        member.access_revoked_at = timezone.now()
        member.access_revoked_reason = reason
        member.save(update_fields=["is_active", "access_revoked_at", "access_revoked_reason"])
        AuditEvent.objects.create(organization=request.user.organization, actor=request.user, action="member.revoked", target_user=member, metadata={"role": member.role, "reason": reason})
        return Response(UserSerializer(member).data)


class AuditEventPagination(PageNumberPagination):
    # Le journal d'audit grossit sans limite avec l'activité de l'établissement
    # (connexions, révocations, activation REKOLLECTE+...) ; le `[:100]` d'origine
    # cachait silencieusement tout ce qui précédait les 100 événements les plus
    # récents, sans le signaler ni permettre de remonter dans l'historique.
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50


class AuditEventListView(generics.ListAPIView):
    serializer_class = AuditEventSerializer
    permission_classes = [IsAuthenticated, IsBoss]
    pagination_class = AuditEventPagination

    def get_queryset(self):
        return AuditEvent.objects.filter(organization=self.request.user.organization).select_related("actor", "target_user")
