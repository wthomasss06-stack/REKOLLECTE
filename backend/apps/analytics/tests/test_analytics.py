from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.analytics import services
from apps.analytics.models import ConsentTally, SiteAction, SitePageView, SiteSession, SiteVisitor
from apps.testing_utils import auth_client

CHROME_DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
SAFARI_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"


def collect(client, path="/", kind="page", ua=CHROME_DESKTOP, **extra):
    return client.post("/api/v1/analytics/collect/", {"kind": kind, "path": path, **extra}, format="json", HTTP_USER_AGENT=ua)


def platform_admin():
    return User.objects.create_user(email="root@example.com", is_superuser=True, is_staff=True)


# --- règles pures ------------------------------------------------------------------------------------------------
def test_clean_path_strips_query_and_fragment_and_rejects_private_zones():
    assert services.clean_path("/tarifs/?utm_source=x#top") == "/tarifs"
    assert services.clean_path("/") == "/"
    assert services.clean_path("//evil.com/x") is None
    assert services.clean_path("https://evil.com/") is None
    for blocked in ("/dashboard", "/dashboard/visiteurs", "/admin", "/v/abc123", "/onboarding", "/api/v1/x", "/connexion/callback"):
        assert services.clean_path(blocked) is None, blocked
    assert services.clean_path("/" + "a" * 250) is None


def test_clean_source_prefers_utm_then_external_referrer_never_full_url():
    assert services.clean_source("Facebook", "https://google.com/search?q=secret") == "facebook"
    assert services.clean_source("", "https://www.google.com/search?q=secret") == "google.com"
    assert services.clean_source("", "") == "direct"
    assert services.clean_source("", "not a url") == "direct"


def test_user_agent_parsing_and_bot_detection():
    assert services.parse_user_agent(CHROME_DESKTOP) == ("desktop", "Chrome", "Windows", False)
    device, browser, system, bot = services.parse_user_agent(SAFARI_IPHONE)
    assert (device, browser, system, bot) == ("mobile", "Safari", "iOS", False)
    assert services.parse_user_agent(GOOGLEBOT)[3] is True
    assert services.parse_user_agent("")[3] is True


# --- collecte ----------------------------------------------------------------------------------------------------
@pytest.mark.django_db
def test_consent_refusal_is_anonymous_tally_only_and_sets_no_cookie():
    client = APIClient()
    response = client.post("/api/v1/analytics/consent/", {"accepted": False}, format="json")
    assert response.status_code == 204
    assert "rk_vid" not in response.cookies or not response.cookies["rk_vid"].value
    assert ConsentTally.objects.get().rejected == 1
    assert not SiteVisitor.objects.exists()


@pytest.mark.django_db
def test_first_page_view_sets_httponly_scoped_cookies_and_records_a_visit():
    client = APIClient()
    response = collect(client, "/tarifs", referrer="https://www.google.com/search?q=x")
    assert response.status_code == 204
    for name in ("rk_vid", "rk_sid"):
        cookie = response.cookies[name]
        assert cookie["httponly"] is True
        assert cookie["path"] == "/api/v1/analytics/"
        assert cookie["samesite"] == "Lax"
    visit = SiteSession.objects.get()
    assert (visit.landing_path, visit.source, visit.device, visit.browser, visit.os) == ("/tarifs", "google.com", "desktop", "Chrome", "Windows")
    assert SitePageView.objects.filter(path="/tarifs").count() == 1
    assert SiteVisitor.objects.get().visit_count == 1


@pytest.mark.django_db
def test_same_browser_keeps_one_visitor_and_one_session_within_30_minutes():
    client = APIClient()
    collect(client, "/")
    collect(client, "/tarifs")
    collect(client, "/", kind="action", action="cta_click")
    assert SiteVisitor.objects.count() == 1
    assert SiteSession.objects.count() == 1
    session = SiteSession.objects.get()
    assert session.page_count == 2
    assert SiteAction.objects.get().type == "cta_click"


@pytest.mark.django_db
def test_idle_session_starts_a_new_visit_for_the_same_visitor():
    client = APIClient()
    collect(client, "/")
    SiteSession.objects.update(last_activity_at=timezone.now() - timedelta(minutes=45))
    collect(client, "/")
    assert SiteVisitor.objects.count() == 1
    assert SiteSession.objects.count() == 2
    assert SiteVisitor.objects.get().visit_count == 2


@pytest.mark.django_db
def test_forged_cookies_never_attach_to_someone_elses_data():
    other = SiteVisitor.objects.create(key="11111111-1111-4111-8111-111111111111")
    client = APIClient()
    client.cookies["rk_vid"] = "not-a-uuid"
    collect(client, "/")
    assert SiteVisitor.objects.count() == 2
    assert SiteVisitor.objects.exclude(pk=other.pk).get().key != "not-a-uuid"


@pytest.mark.django_db
def test_bots_and_private_zones_are_not_recorded_and_get_no_cookie():
    client = APIClient()
    assert collect(client, "/", ua=GOOGLEBOT).status_code == 204
    response = collect(client, "/dashboard/visiteurs")
    assert response.status_code == 204
    assert not response.cookies
    assert not SiteSession.objects.exists() and not SiteVisitor.objects.exists()


@pytest.mark.django_db
def test_unknown_action_and_missing_action_are_rejected():
    client = APIClient()
    assert collect(client, "/", kind="action", action="steal_password").status_code == 400
    assert collect(client, "/", kind="action").status_code == 400
    assert not SiteAction.objects.exists()


@pytest.mark.django_db
def test_withdrawing_consent_erases_the_visitor_and_clears_cookies():
    client = APIClient()
    collect(client, "/")
    collect(client, "/tarifs")
    response = client.post("/api/v1/analytics/consent/", {"accepted": False}, format="json")
    assert response.status_code == 204
    assert not SiteVisitor.objects.exists() and not SiteSession.objects.exists() and not SitePageView.objects.exists()
    assert response.cookies["rk_vid"]["max-age"] == 0


@pytest.mark.django_db
def test_forget_endpoint_erases_the_visitor():
    client = APIClient()
    collect(client, "/")
    assert client.post("/api/v1/analytics/forget/").status_code == 204
    assert not SiteVisitor.objects.exists()


@pytest.mark.django_db
def test_collect_is_rate_limited_per_address(monkeypatch):
    from rest_framework.throttling import ScopedRateThrottle
    monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, "analytics", "3/min")  # restauré à la fin du test
    client = APIClient()
    codes = [collect(client, "/").status_code for _ in range(5)]
    assert codes[:3] == [204, 204, 204] and 429 in codes[3:]


# --- purge -------------------------------------------------------------------------------------------------------
@pytest.mark.django_db
def test_purge_removes_only_data_older_than_retention():
    client = APIClient()
    collect(client, "/")
    old_visitor = SiteVisitor.objects.create(key="22222222-2222-4222-8222-222222222222", last_seen_at=timezone.now() - timedelta(days=500))
    old_session = SiteSession.objects.create(key="33333333-3333-4333-8333-333333333333", visitor=old_visitor, last_activity_at=timezone.now() - timedelta(days=500))
    result = services.purge_old()
    assert result["visitors"] >= 1
    assert not SiteSession.objects.filter(pk=old_session.pk).exists()
    assert SiteVisitor.objects.count() == 1 and SiteSession.objects.count() == 1


# --- vue d'administration ------------------------------------------------------------------------------------------
@pytest.mark.django_db
def test_traffic_endpoint_is_platform_admin_only(boss_user):
    assert APIClient().get("/api/v1/admin/traffic/").status_code == 401
    assert auth_client(boss_user).get("/api/v1/admin/traffic/").status_code == 403


@pytest.mark.django_db
def test_traffic_snapshot_aggregates_without_exposing_identifiers():
    for ua, path, referrer in ((CHROME_DESKTOP, "/", ""), (SAFARI_IPHONE, "/", "https://www.google.com/"), (SAFARI_IPHONE, "/tarifs", "")):
        client = APIClient()
        collect(client, path, ua=ua, referrer=referrer)
        collect(client, "/connexion", ua=ua)
        collect(client, "/", kind="action", action="cta_click", ua=ua)
    APIClient().post("/api/v1/analytics/consent/", {"accepted": True}, format="json")
    APIClient().post("/api/v1/analytics/consent/", {"accepted": False}, format="json")

    response = auth_client(platform_admin()).get("/api/v1/admin/traffic/?days=7")
    assert response.status_code == 200
    data = response.data
    assert data["totals"]["visitors"] == 3 and data["totals"]["sessions"] == 3
    assert data["totals"]["page_views"] == 6 and data["totals"]["actions"] == 3
    assert data["totals"]["new_visitors"] == 3 and data["totals"]["pages_per_session"] == 2.0
    assert data["consent"] == {"accepted": 1, "rejected": 1, "rate": 50}
    assert data["live_now"] == 3
    assert len(data["daily"]) == 7 and data["daily"][-1]["sessions"] == 3
    assert {row["label"]: row["count"] for row in data["devices"]} == {"mobile": 2, "desktop": 1}
    assert {row["label"]: row["count"] for row in data["sources"]} == {"direct": 2, "google.com": 1}
    assert data["actions"] == [{"label": "cta_click", "count": 3}]
    assert data["top_pages"][0] == {"label": "/connexion", "count": 3} or data["top_pages"][0]["count"] == 3
    blob = str(data)
    assert "rk_" not in blob and "key" not in {k for row in data["recent"] for k in row}


@pytest.mark.django_db
def test_traffic_days_are_clamped_and_bad_input_defaults():
    admin_client = auth_client(platform_admin())
    assert len(admin_client.get("/api/v1/admin/traffic/?days=9999").data["daily"]) == 90
    assert len(admin_client.get("/api/v1/admin/traffic/?days=abc").data["daily"]) == 7


@pytest.mark.django_db
def test_overview_includes_site_figures():
    collect(APIClient(), "/")
    response = auth_client(platform_admin()).get("/api/v1/admin/overview/")
    assert response.data["site_sessions_7_days"] == 1 and response.data["site_live_now"] == 1
