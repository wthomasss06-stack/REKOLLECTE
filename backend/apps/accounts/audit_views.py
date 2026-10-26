from datetime import timedelta

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.permissions import IsBoss
from apps.common.responses import error_response

from .audit import CATEGORIES, build_csv, category_actions, describe_device, filter_events, sensitive_q
from .models import AuditEvent, RefreshSession, User

EXPORT_MAX_ROWS = 10_000


def organization_events(user):
    return AuditEvent.objects.filter(organization=user.organization).select_related("actor", "target_user")


def current_session_jti(request) -> str | None:
    """Session de CET appareil (cookie de renouvellement), pour ne jamais la fermer par erreur depuis la liste."""
    raw = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
    if not raw:
        return None
    try:
        return str(RefreshToken(raw)["jti"])
    except Exception:
        return None


def active_sessions(organization):
    """Sessions encore utilisables des membres actifs : ni révoquées, ni expirées, ni remplacées par un renouvellement."""
    return (
        RefreshSession.objects.filter(
            user__organization=organization, user__is_active=True, revoked_at__isnull=True, rotated_at__isnull=True, expires_at__gt=timezone.now()
        )
        .select_related("user")
        .order_by("-last_used_at", "-created_at")
    )


class AuditEventExportView(APIView):
    """Journal filtré (mêmes filtres que la liste) en CSV. L'export est lui-même journalisé."""

    permission_classes = [IsAuthenticated, IsBoss]

    def get(self, request):
        events = list(filter_events(organization_events(request.user), request.query_params)[:EXPORT_MAX_ROWS])
        AuditEvent.objects.create(
            organization=request.user.organization, actor=request.user, action="audit.exported",
            metadata={"rows": len(events), "filters": {key: value for key, value in request.query_params.items() if value}},
        )
        response = HttpResponse(build_csv(events), content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="journal-audit-{timezone.localdate():%Y%m%d}.csv"'
        return response


class AuditSummaryView(APIView):
    """Chiffres de la vue d'ensemble : activité par catégorie sur 7, 30 ou 90 jours, appareils et membres connectés."""

    permission_classes = [IsAuthenticated, IsBoss]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", 7))
        except ValueError:
            days = 7
        days = days if days in (7, 30, 90) else 7
        organization = request.user.organization
        events = AuditEvent.objects.filter(organization=organization, created_at__gte=timezone.now() - timedelta(days=days))
        last_sensitive = AuditEvent.objects.filter(organization=organization).filter(sensitive_q()).order_by("-created_at").values_list("created_at", flat=True).first()
        sessions = active_sessions(organization)
        return Response({
            "days": days,
            "counts": {category: events.filter(action__in=category_actions(category)).count() for category in CATEGORIES},
            "sensitive": events.filter(sensitive_q()).count(),
            "last_sensitive_at": last_sensitive,
            "active_sessions": sessions.count(),
            "connected_members": sessions.values("user").distinct().count(),
            "members": User.objects.filter(organization=organization, is_active=True).count(),
        })


class OrgSessionListView(APIView):
    """Appareils actuellement connectés dans l'établissement (tous les membres)."""

    permission_classes = [IsAuthenticated, IsBoss]

    def get(self, request):
        current = current_session_jti(request)
        results = []
        for session in active_sessions(request.user.organization):
            device, kind = describe_device(session.user_agent)
            results.append({
                "id": str(session.id), "user_id": str(session.user_id), "user_name": session.user.full_name, "user_email": session.user.email,
                "user_role": session.user.role, "device": device, "device_kind": kind, "ip_address": session.ip_address,
                "created_at": session.created_at, "last_used_at": session.last_used_at, "expires_at": session.expires_at, "current": session.jti == current,
            })
        return Response({"results": results})


class OrgSessionRevokeView(APIView):
    """Déconnecte un appareil d'un membre. L'accès déjà émis reste valable au plus 10 minutes (durée du jeton d'accès) : le renouvellement, lui, est refusé."""

    permission_classes = [IsAuthenticated, IsBoss]

    def post(self, request, session_id):
        session = active_sessions(request.user.organization).filter(pk=session_id).first()
        if session is None:
            return error_response("Cet appareil n’est plus connecté.", status.HTTP_404_NOT_FOUND)
        if session.jti == current_session_jti(request):
            return error_response("C’est l’appareil que vous utilisez : utilisez « Se déconnecter ».", status.HTTP_400_BAD_REQUEST)
        session.revoked_at = timezone.now()
        session.save(update_fields=["revoked_at"])
        AuditEvent.objects.create(
            organization=request.user.organization, actor=request.user, target_user=session.user, action="auth.session_revoked",
            metadata={"session_id": str(session.id), "reason": "boss", "device": describe_device(session.user_agent)[0]},
        )
        return Response({"revoked": 1})


class MemberSessionsRevokeView(APIView):
    """Déconnecte tous les appareils d'un membre (hors l'appareil utilisé s'il s'agit du Patron lui-même)."""

    permission_classes = [IsAuthenticated, IsBoss]

    def post(self, request, user_id):
        member = User.objects.filter(pk=user_id, organization=request.user.organization).first()
        if member is None:
            return error_response("Membre introuvable.", status.HTTP_404_NOT_FOUND)
        sessions = active_sessions(request.user.organization).filter(user=member)
        current = current_session_jti(request)
        if current:
            sessions = sessions.exclude(jti=current)
        ids = list(sessions.values_list("pk", flat=True))
        if ids:
            RefreshSession.objects.filter(pk__in=ids).update(revoked_at=timezone.now())
            AuditEvent.objects.create(
                organization=request.user.organization, actor=request.user, target_user=member, action="auth.member_sessions_revoked", metadata={"count": len(ids)},
            )
        return Response({"revoked": len(ids)})
