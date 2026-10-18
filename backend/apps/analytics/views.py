import random
from datetime import timedelta

from django.conf import settings
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import throttling
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.feedback.views import IsPlatformAdmin

from . import services
from .models import ConsentTally, SiteAction, SitePageView, SiteSession, SiteVisitor
from .serializers import CollectSerializer, ConsentSerializer


def _set_cookie(response, name, value, max_age):
    response.set_cookie(
        name, value, max_age=max_age, path=services.COOKIE_PATH, httponly=True,
        secure=not settings.DEBUG, samesite="Lax",
    )


def _clear_cookies(response):
    for name in (services.VISITOR_COOKIE, services.SESSION_COOKIE):
        response.delete_cookie(name, path=services.COOKIE_PATH)


class _PublicAnalyticsView(APIView):
    """Appelée depuis la vitrine : sans compte ni session Django (donc sans CSRF), limitée par adresse."""
    authentication_classes: list = []
    permission_classes = [AllowAny]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "analytics"


class ConsentView(_PublicAnalyticsView):
    """Décision du bandeau. Refus ou retrait : aucun identifiant n'est conservé, les cookies et les données du navigateur sont effacés."""

    def post(self, request):
        serializer = ConsentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        accepted = serializer.validated_data["accepted"]
        services.tally_consent(accepted)
        response = Response(status=204)
        if not accepted:
            services.forget_visitor(request.COOKIES.get(services.VISITOR_COOKIE))
            _clear_cookies(response)
        return response


class CollectView(_PublicAnalyticsView):
    """Page vue ou clic d'action. Les cookies `rk_vid` / `rk_sid` ne sont posés qu'ici, donc seulement après acceptation."""

    def post(self, request):
        serializer = CollectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        path = services.clean_path(data["path"])
        device, browser, system, is_bot = services.parse_user_agent(request.META.get("HTTP_USER_AGENT", ""))
        if not path or is_bot:  # zone non suivie (application, administration) ou robot : on n'enregistre rien
            return Response(status=204)

        visitor, visitor_created = services.ensure_visitor(request.COOKIES.get(services.VISITOR_COOKIE))
        source = services.clean_source(data.get("source"), data.get("referrer"))
        session, _ = services.ensure_session(
            visitor, request.COOKIES.get(services.SESSION_COOKIE),
            device=device, browser=browser, system=system, source=source, landing=path,
        )
        if data["kind"] == "page":
            services.record_page_view(session, path)
        else:
            services.record_action(session, data["action"], path)

        if visitor_created and random.random() < 0.05:  # purge de conservation sans tâche planifiée
            services.purge_old()

        response = Response(status=204)
        _set_cookie(response, services.VISITOR_COOKIE, visitor.key, services.VISITOR_MAX_AGE)
        _set_cookie(response, services.SESSION_COOKIE, session.key, services.SESSION_MAX_AGE)
        return response


class ForgetView(_PublicAnalyticsView):
    """« Effacer mes données de mesure » (depuis le centre de préférences cookies)."""

    def post(self, request):
        services.forget_visitor(request.COOKIES.get(services.VISITOR_COOKIE))
        response = Response(status=204)
        _clear_cookies(response)
        return response


def traffic_snapshot(days: int) -> dict:
    now = timezone.now()
    since = now - timedelta(days=days)
    sessions = SiteSession.objects.filter(started_at__gte=since)
    views = SitePageView.objects.filter(viewed_at__gte=since)
    actions = SiteAction.objects.filter(created_at__gte=since)

    session_count = sessions.count()
    page_count = views.count()
    visitor_ids = set(sessions.values_list("visitor_id", flat=True).distinct())
    new_visitors = SiteVisitor.objects.filter(first_seen_at__gte=since, id__in=visitor_ids).count()

    decisions_rows = list(ConsentTally.objects.filter(day__gte=since.date()).values_list("accepted", "rejected"))
    accepted = sum(row[0] for row in decisions_rows)
    rejected = sum(row[1] for row in decisions_rows)

    sessions_by_day = {row["day"]: row["n"] for row in sessions.annotate(day=TruncDate("started_at")).values("day").annotate(n=Count("id"))}
    views_by_day = {row["day"]: row["n"] for row in views.annotate(day=TruncDate("viewed_at")).values("day").annotate(n=Count("id"))}
    today = timezone.localdate()
    daily = []
    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        daily.append({"date": day.isoformat(), "sessions": sessions_by_day.get(day, 0), "page_views": views_by_day.get(day, 0)})

    def ranked(queryset, field, limit):
        return [{"label": row[field] or "Inconnu", "count": row["n"]} for row in queryset.values(field).annotate(n=Count("id")).order_by("-n")[:limit]]

    recent = [{
        "id": str(session.id), "started_at": session.started_at, "last_activity_at": session.last_activity_at,
        "device": session.device, "browser": session.browser, "os": session.os, "source": session.source,
        "landing_path": session.landing_path, "page_count": session.page_count,
        "returning": session.visitor.visit_count > 1, "visit_number": session.visitor.visit_count,
    } for session in SiteSession.objects.select_related("visitor").order_by("-last_activity_at")[:12]]

    decisions = accepted + rejected
    return {
        "days": days,
        "live_now": SiteSession.objects.filter(last_activity_at__gte=now - timedelta(minutes=5)).count(),
        "totals": {
            "visitors": len(visitor_ids), "new_visitors": new_visitors, "returning_visitors": len(visitor_ids) - new_visitors,
            "sessions": session_count, "page_views": page_count, "actions": actions.count(),
            "pages_per_session": round(page_count / session_count, 1) if session_count else 0,
        },
        "consent": {"accepted": accepted, "rejected": rejected, "rate": round(accepted * 100 / decisions) if decisions else None},
        "daily": daily,
        "top_pages": [{"label": row["path"], "count": row["n"]} for row in views.values("path").annotate(n=Count("id")).order_by("-n")[:8]],
        "sources": ranked(sessions, "source", 8),
        "devices": ranked(sessions, "device", 3),
        "browsers": ranked(sessions, "browser", 6),
        "systems": ranked(sessions, "os", 6),
        "actions": ranked(actions, "type", 5),
        "recent": recent,
    }


class PlatformTrafficView(APIView):
    """Surveillance du site public depuis l'administration."""
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", 7))
        except (TypeError, ValueError):
            days = 7
        return Response(traffic_snapshot(min(max(days, 1), 90)))
