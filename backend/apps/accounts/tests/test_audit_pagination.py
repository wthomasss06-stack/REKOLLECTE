from apps.accounts.models import AuditEvent

from apps.testing_utils import auth_client


def test_audit_log_is_paginated_newest_first(db, boss_user, staff_user, organization):
    """L'ancien endpoint renvoyait un tableau brut plafonné à 100 lignes sans le
    signaler et sans moyen de remonter dans l'historique au-delà. Il suit
    désormais le même contrat de pagination que le registre (`page`,
    `page_size`, `count`, `next`, `previous`)."""
    for i in range(25):
        AuditEvent.objects.create(organization=organization, actor=staff_user, action="auth.login", metadata={"i": i})

    first_page = auth_client(boss_user).get("/api/v1/auth/audit/")
    assert first_page.status_code == 200
    assert first_page.data["count"] == 25
    assert len(first_page.data["results"]) == 20  # page_size par défaut
    assert first_page.data["next"] is not None
    # Le plus récent (i=24, dernier créé) doit arriver en premier.
    assert first_page.data["results"][0]["metadata"]["i"] == 24

    second_page = auth_client(boss_user).get("/api/v1/auth/audit/?page=2")
    assert second_page.status_code == 200
    assert len(second_page.data["results"]) == 5
    assert second_page.data["next"] is None


def test_audit_log_is_boss_only(db, gerant_user, staff_user):
    assert auth_client(gerant_user).get("/api/v1/auth/audit/").status_code == 403
    assert auth_client(staff_user).get("/api/v1/auth/audit/").status_code == 403
