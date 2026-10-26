import csv
import io
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.audit import describe, describe_device
from apps.accounts.models import AuditEvent, RefreshSession, User
from apps.organizations.models import Organization
from apps.testing_utils import auth_client

ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
EDGE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0"


def make_session(user, jti="j1", ua=ANDROID_UA):
    return RefreshSession.objects.create(user=user, jti=jti, user_agent=ua, ip_address="10.0.0.1", expires_at=timezone.now() + timedelta(days=14))


def event(organization, actor, action, target=None, **metadata):
    return AuditEvent.objects.create(organization=organization, actor=actor, target_user=target, action=action, metadata=metadata)


# ---------- libellés, catégories, filtres ----------

def test_every_recorded_action_has_a_label_and_a_category():
    assert describe("member.revoked", {}) == ("equipe", "Membre révoqué", True)
    assert describe("auth.session_revoked", {"reason": "logout"}) == ("connexions", "Déconnexion", False)
    assert describe("auth.session_revoked", {"reason": "boss"})[2] is True
    # Un événement inconnu reste lisible : on affiche son code.
    assert describe("quelque.chose.de.nouveau", {}) == ("autres", "quelque.chose.de.nouveau", False)


def test_audit_list_exposes_label_category_and_sensitive_flag(db, boss_user, organization):
    event(organization, boss_user, "organization.karnet_enabled")
    row = auth_client(boss_user).get("/api/v1/auth/audit/").data["results"][0]
    assert (row["category"], row["label"], row["sensitive"]) == ("offre", "REKOLLECTE+ activé", True)


def test_audit_filters_by_category_search_and_period(db, boss_user, staff_user, organization):
    event(organization, staff_user, "auth.login")
    event(organization, boss_user, "member.revoked", target=staff_user)
    old = event(organization, boss_user, "privacy.subject_deleted")
    AuditEvent.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=40))
    client = auth_client(boss_user)

    assert [row["action"] for row in client.get("/api/v1/auth/audit/?category=equipe").data["results"]] == ["member.revoked"]
    assert client.get("/api/v1/auth/audit/?category=n-importe-quoi").data["count"] == 3  # filtre invalide ignoré
    assert client.get("/api/v1/auth/audit/?q=agent@").data["count"] == 2  # auteur ou cible : l'agent
    assert client.get("/api/v1/auth/audit/?sensitive=1").data["count"] == 2
    since = (timezone.localdate() - timedelta(days=7)).isoformat()
    assert client.get(f"/api/v1/auth/audit/?since={since}").data["count"] == 2
    assert client.get(f"/api/v1/auth/audit/?actor={staff_user.id}").data["count"] == 1
    assert client.get("/api/v1/auth/audit/?actor=pas-un-id").data["count"] == 3


def test_audit_never_leaks_another_organization(db, boss_user, organization):
    other = Organization.objects.create(name="Autre", qr_secure_token="other-token")
    stranger = User.objects.create_user(email="etranger@example.com", role=User.Role.BOSS, organization=other)
    event(other, stranger, "member.revoked")
    assert auth_client(boss_user).get("/api/v1/auth/audit/").data["count"] == 0


# ---------- export CSV ----------

def test_audit_export_is_boss_only_csv_safe_and_journalised(db, boss_user, gerant_user, organization):
    victim = User.objects.create_user(email="v@example.com", role=User.Role.STAFF, organization=organization, full_name="=HYPERLINK(\"http://x\")")
    event(organization, boss_user, "member.revoked", target=victim)

    assert auth_client(gerant_user).get("/api/v1/auth/audit/export/").status_code == 403

    response = auth_client(boss_user).get("/api/v1/auth/audit/export/?category=equipe")
    assert response.status_code == 200
    assert response["Content-Type"].startswith("text/csv")
    assert "journal-audit-" in response["Content-Disposition"]
    rows = list(csv.reader(io.StringIO(response.content.decode("utf-8-sig")), delimiter=";"))
    assert rows[0][:3] == ["Date", "Catégorie", "Événement"]
    assert rows[1][1:4] == ["Équipe", "Membre révoqué", "member.revoked"]
    assert rows[1][6].startswith("'=")  # jamais interprété comme une formule par le tableur
    # L'export lui-même est inscrit au journal.
    assert AuditEvent.objects.filter(organization=organization, action="audit.exported", metadata__rows=1).exists()


# ---------- résumé ----------

def test_audit_summary_counts_activity_and_connected_devices(db, boss_user, staff_user, organization):
    event(organization, staff_user, "auth.login")
    event(organization, staff_user, "auth.login")
    event(organization, boss_user, "member.revoked", target=staff_user)
    make_session(staff_user, "a")
    make_session(staff_user, "b", EDGE_UA)
    make_session(boss_user, "c")
    revoked = make_session(boss_user, "d")
    RefreshSession.objects.filter(pk=revoked.pk).update(revoked_at=timezone.now())

    data = auth_client(boss_user).get("/api/v1/auth/audit/summary/?days=30").data
    assert data["days"] == 30
    assert data["counts"] == {"connexions": 2, "equipe": 1, "donnees": 0, "offre": 0}
    assert data["sensitive"] == 1
    assert data["active_sessions"] == 3 and data["connected_members"] == 2
    assert auth_client(boss_user).get("/api/v1/auth/audit/summary/?days=999").data["days"] == 7


# ---------- appareils ----------

def test_device_description_is_readable_and_not_over_precise():
    assert describe_device(ANDROID_UA) == ("Chrome · Android", "mobile")
    assert describe_device(EDGE_UA) == ("Edge · Windows", "ordinateur")
    assert describe_device("") == ("Navigateur · Appareil inconnu", "ordinateur")


def test_sessions_list_is_boss_only_and_shows_active_devices(db, boss_user, gerant_user, staff_user, organization):
    make_session(staff_user, "a")
    expired = make_session(staff_user, "b")
    RefreshSession.objects.filter(pk=expired.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
    rotated = make_session(staff_user, "c")
    RefreshSession.objects.filter(pk=rotated.pk).update(rotated_at=timezone.now())

    assert auth_client(gerant_user).get("/api/v1/auth/sessions/").status_code == 403
    rows = auth_client(boss_user).get("/api/v1/auth/sessions/").data["results"]
    assert len(rows) == 1
    assert rows[0]["device"] == "Chrome · Android" and rows[0]["user_email"] == "agent@example.com" and rows[0]["current"] is False


def test_boss_can_revoke_a_members_device_and_it_is_journalised(db, boss_user, staff_user, organization):
    session = make_session(staff_user)
    response = auth_client(boss_user).post(f"/api/v1/auth/sessions/{session.id}/revoke/")
    assert response.status_code == 200
    session.refresh_from_db()
    assert session.revoked_at is not None
    log = AuditEvent.objects.get(organization=organization, action="auth.session_revoked")
    assert log.actor == boss_user and log.target_user == staff_user and log.metadata["reason"] == "boss" and log.metadata["device"] == "Chrome · Android"
    assert auth_client(boss_user).post(f"/api/v1/auth/sessions/{session.id}/revoke/").status_code == 404  # déjà déconnecté


def test_session_of_another_organization_cannot_be_revoked(db, boss_user, organization):
    other = Organization.objects.create(name="Autre", qr_secure_token="other-token")
    stranger = User.objects.create_user(email="etranger@example.com", role=User.Role.STAFF, organization=other)
    session = make_session(stranger)
    assert auth_client(boss_user).post(f"/api/v1/auth/sessions/{session.id}/revoke/").status_code == 404
    session.refresh_from_db()
    assert session.revoked_at is None


def test_the_device_in_use_cannot_be_revoked_from_the_list(db, boss_user):
    refresh = RefreshToken.for_user(boss_user)
    session = make_session(boss_user, str(refresh["jti"]))
    client = auth_client(boss_user)
    client.cookies[settings.REFRESH_COOKIE_NAME] = str(refresh)

    assert client.get("/api/v1/auth/sessions/").data["results"][0]["current"] is True
    assert client.post(f"/api/v1/auth/sessions/{session.id}/revoke/").status_code == 400
    session.refresh_from_db()
    assert session.revoked_at is None


def test_boss_can_disconnect_every_device_of_a_member(db, boss_user, staff_user, organization):
    make_session(staff_user, "a")
    make_session(staff_user, "b", EDGE_UA)
    assert auth_client(staff_user).post(f"/api/v1/auth/team/members/{staff_user.id}/sessions/revoke/").status_code == 403

    response = auth_client(boss_user).post(f"/api/v1/auth/team/members/{staff_user.id}/sessions/revoke/")
    assert response.status_code == 200 and response.data["revoked"] == 2
    assert not RefreshSession.objects.filter(user=staff_user, revoked_at__isnull=True).exists()
    assert AuditEvent.objects.filter(organization=organization, action="auth.member_sessions_revoked", metadata__count=2).exists()
