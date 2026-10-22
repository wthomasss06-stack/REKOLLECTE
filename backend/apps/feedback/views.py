import secrets
import uuid
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, throttling
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import AuditEvent, User
from apps.analytics.models import SiteSession
from apps.checkins.models import CheckIn
from apps.organizations.models import Organization
from apps.organizations.services import delete_organization
from apps.accounts.cookies import set_refresh_cookie
from apps.accounts.services import register_refresh_session

from .models import Feedback
from .serializers import AdminMemberSerializer, AdminOrganizationSerializer, FeedbackAdminSerializer, FeedbackAdminUpdateSerializer, FeedbackCreateSerializer, PlatformAuditEventSerializer


def is_platform_admin(request):
    return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsPlatformAdmin(IsAuthenticated):
    message = "Accès réservé à l’administration de la plateforme."

    def has_permission(self, request, view):
        return super().has_permission(request, view) and is_platform_admin(request)


def _same_secret(given: str, expected: str) -> bool:
    """Comparaison à temps constant. En octets : `compare_digest` sur des `str` non ASCII lève TypeError (→ 500)."""
    return secrets.compare_digest(given.encode("utf-8"), expected.encode("utf-8"))


class PlatformAdminLoginView(APIView):
    permission_classes = [AllowAny]
    # Limiteur dédié, bien plus strict que le limiteur anonyme général : c'est la porte d'entrée du compte le plus puissant.
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "admin_login"

    def post(self, request):
        expected_email = getattr(settings, "PLATFORM_ADMIN_EMAIL", "").strip().lower()
        expected_password = getattr(settings, "PLATFORM_ADMIN_PASSWORD", "")
        email = str(request.data.get("email", "")).strip().lower()
        password = str(request.data.get("password", ""))
        # Les deux comparaisons sont toujours évaluées (pas de court-circuit qui révélerait si l'e-mail est le bon).
        email_ok = _same_secret(email, expected_email)
        password_ok = _same_secret(password, expected_password)
        if not expected_email or len(expected_password) < 20 or not (email_ok and password_ok):
            return Response({"detail": "Identifiants admin invalides."}, status=status.HTTP_401_UNAUTHORIZED)
        user, _ = User.objects.get_or_create(email=expected_email, defaults={"full_name": "Administration AKATech"})
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.organization = None
        user.role = User.Role.BOSS
        user.set_password(expected_password)
        user.save(update_fields=["is_staff", "is_superuser", "is_active", "organization", "role", "password"])
        refresh = RefreshToken.for_user(user)
        # Sans RefreshSession, le renouvellement silencieux refusait ce cookie (« session invalide ») : l'admin devait
        # se reconnecter toutes les 10 minutes, à chaque expiration du jeton d'accès.
        register_refresh_session(user, refresh, request, audit=False)
        response = Response({"access": str(refresh.access_token), "user": {"email": user.email, "full_name": user.full_name, "is_platform_admin": True}})
        set_refresh_cookie(response, refresh)
        return response


class PublicFeedbackView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [throttling.AnonRateThrottle]

    def post(self, request):
        serializer = FeedbackCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        feedback = serializer.save(
            user=request.user if request.user.is_authenticated else None,
            organization=request.user.organization if request.user.is_authenticated and request.user.organization_id else None,
        )
        return Response({"id": str(feedback.id), "detail": "Merci pour votre retour."}, status=status.HTTP_201_CREATED)


class PlatformOverviewView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        since = timezone.now() - timedelta(days=30)
        return Response({
            "organizations": Organization.objects.count(),
            "users": User.objects.filter(is_superuser=False).count(),
            "active_users": User.objects.filter(is_superuser=False, is_active=True).count(),
            "checkins_total": CheckIn.objects.count(),
            "checkins_30_days": CheckIn.objects.filter(created_at_client__gte=since).count(),
            "feedback_total": Feedback.objects.count(),
            "feedback_new": Feedback.objects.filter(status=Feedback.Status.NEW).count(),
            # Vitrine publique : uniquement les personnes ayant accepté la mesure d'audience.
            "site_sessions_7_days": SiteSession.objects.filter(started_at__gte=timezone.now() - timedelta(days=7)).count(),
            "site_live_now": SiteSession.objects.filter(last_activity_at__gte=timezone.now() - timedelta(minutes=5)).count(),
        })


class PlatformAuditListView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        events = AuditEvent.objects.select_related("organization", "actor", "target_user")[:1000]
        return Response(PlatformAuditEventSerializer(events, many=True).data)


class PlatformOrganizationListView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        organizations = Organization.objects.annotate(member_count=Count("members", filter=Q(members__is_superuser=False)), checkin_count=Count("checkins"), feedback_count=Count("feedbacks"))
        return Response([{"id": str(org.id), "name": org.name, "logo_url": org.logo_url, "visit_reasons": org.visit_reasons, "created_at": org.created_at, "member_count": org.member_count, "checkin_count": org.checkin_count, "feedback_count": org.feedback_count, "members": [{"id": str(member.id), "email": member.email, "full_name": member.full_name, "role": member.role, "is_active": member.is_active} for member in org.members.filter(is_superuser=False)]} for org in organizations])

    def post(self, request):
        serializer = AdminOrganizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        organization = Organization.objects.create(name=data["name"].strip(), logo_url=data.get("logo_url", ""), visit_reasons=data.get("visit_reasons", []), qr_secure_token=secrets.token_urlsafe(32))
        return Response({"id": str(organization.id), "name": organization.name}, status=status.HTTP_201_CREATED)


class PlatformOrganizationDetailView(APIView):
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, organization_id):
        organization = Organization.objects.filter(id=organization_id).first()
        if not organization:
            return Response({"detail": "Entreprise introuvable."}, status=404)
        serializer = AdminOrganizationSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(organization, field, value.strip() if field == "name" else value)
        organization.save()
        return Response({"id": str(organization.id), "name": organization.name, "logo_url": organization.logo_url, "visit_reasons": organization.visit_reasons})

    def delete(self, request, organization_id):
        organization = Organization.objects.filter(id=organization_id).first()
        if not organization:
            return Response({"detail": "Entreprise introuvable."}, status=404)
        delete_organization(organization)
        return Response(status=204)


class PlatformMemberListView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        users = User.objects.filter(is_superuser=False).select_related("organization")
        return Response([{"id": str(user.id), "email": user.email, "full_name": user.full_name, "role": user.role, "is_active": user.is_active, "organization_id": str(user.organization_id) if user.organization_id else None, "organization_name": user.organization.name if user.organization else None, "created_at": user.created_at} for user in users])

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        if not email or "@" not in email:
            return Response({"detail": "Email requis."}, status=400)
        role = request.data.get("role", User.Role.STAFF)
        if role not in User.Role.values:
            return Response({"detail": "Rôle invalide."}, status=400)
        organization_id = request.data.get("organization_id")
        try:
            organization = Organization.objects.filter(id=organization_id).first() if organization_id else None
        except (ValueError, TypeError, DjangoValidationError):
            organization = None
        if organization_id and not organization:
            return Response({"detail": "Entreprise introuvable."}, status=400)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "Un compte existe déjà avec cet e-mail."}, status=409)
        user = User.objects.create_user(email=email, full_name=str(request.data.get("full_name", ""))[:255], role=role, organization=organization)
        return Response({"id": str(user.id), "email": user.email}, status=201)


class PlatformMemberDetailView(APIView):
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, user_id):
        user = User.objects.filter(id=user_id, is_superuser=False).first()
        if not user:
            return Response({"detail": "Membre introuvable."}, status=404)
        serializer = AdminMemberSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            if field == "organization_id":
                user.organization_id = value
            else:
                setattr(user, field, value)
        user.save()
        return Response({"id": str(user.id), "email": user.email, "role": user.role, "organization_id": str(user.organization_id) if user.organization_id else None, "is_active": user.is_active})

    def delete(self, request, user_id):
        user = User.objects.filter(id=user_id, is_superuser=False).first()
        if not user:
            return Response(status=404)
        user.delete()
        return Response(status=204)


class PlatformFeedbackListView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        queryset = Feedback.objects.select_related("user", "organization")
        return Response(FeedbackAdminSerializer(queryset, many=True).data)


class PlatformFeedbackDetailView(APIView):
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, feedback_id):
        feedback = Feedback.objects.filter(id=feedback_id).first()
        if not feedback:
            return Response({"detail": "Feedback introuvable."}, status=404)
        serializer = FeedbackAdminUpdateSerializer(feedback, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(FeedbackAdminSerializer(feedback).data)

    def delete(self, request, feedback_id):
        feedback = Feedback.objects.filter(id=feedback_id).first()
        if not feedback:
            return Response(status=404)
        feedback.delete()
        return Response(status=204)
