"""Critères d'acceptation du brief : essai, plan effectif, mode observer, mode appliqué, collecte jamais bloquée, export de sortie."""
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.models import AuditEvent, StaffInvitation, User
from apps.billing.models import Subscription
from apps.billing.services import billing_payload, effective_plan, enforcement_mode
from apps.checkins.models import AccessPoint, CheckIn, FormTemplate
from apps.karnet.tests.helpers import enable_karnet
from apps.organizations.models import Organization
from apps.testing_utils import auth_client, valid_checkin_payload

from .helpers import enforce_plans, free_plan, set_subscription

SCHEMA_WITH_PHONE = [
    {"id": "nom", "type": "text", "label": "Nom", "required": True},
    {"id": "telephone", "type": "phone", "label": "Téléphone", "required": True},
    {"id": "signature", "type": "signature", "label": "Signature", "required": True},
]


# --- essai et plan effectif ----------------------------------------------------------------------------------------

def test_a_new_organization_starts_a_14_day_trial_of_plus(db, organization):
    plan = effective_plan(organization)
    assert (plan.plan, plan.state, plan.trial_days_left) == ("plus", "trialing", 14)


def test_trial_end_falls_back_to_free_without_touching_data(db, organization, form_template):
    CheckIn.objects.create(organization=organization, form_template=form_template, idempotency_key="00000000-0000-0000-0000-000000000001",
                           responses={"nom": "A"}, created_at_client=timezone.now())
    set_subscription(organization, plan="plus", status="trialing", trial_ends_at=timezone.now() - timedelta(minutes=1))

    plan = effective_plan(organization)

    assert (plan.plan, plan.state) == ("free", "expired")
    assert CheckIn.objects.filter(organization=organization).count() == 1


def test_active_then_grace_then_expired(db, organization):
    end = timezone.now() - timedelta(days=1)
    set_subscription(organization, plan="essentiel", status="active", current_period_end=end + timedelta(days=30))
    assert effective_plan(organization).state == "active"
    set_subscription(organization, plan="essentiel", status="active", current_period_end=end, grace_days=7)
    grace = effective_plan(organization)
    assert (grace.plan, grace.state) == ("essentiel", "grace")
    set_subscription(organization, plan="essentiel", status="active", current_period_end=end - timedelta(days=10), grace_days=7)
    assert (effective_plan(organization).plan, effective_plan(organization).state) == ("free", "expired")


def test_founder_keeps_everything_until_limits_date_is_set(db, organization):
    set_subscription(organization, plan="plus", status="founder")
    assert (effective_plan(organization).plan, effective_plan(organization).state) == ("plus", "founder")
    set_subscription(organization, plan="plus", status="founder", founder_limits_from=timezone.now() - timedelta(days=1))
    assert effective_plan(organization).plan == "free"


def test_existing_accounts_become_founders_via_the_migration_rule(db, organization):
    """La migration 0002 marque les établissements existants « fondateur » ; ici on vérifie le comportement de ce statut."""
    set_subscription(organization, plan="plus", status="founder")
    assert billing_payload(organization)["state"] == "founder"


# --- mode observer (par défaut) -------------------------------------------------------------------------------------

def test_default_mode_is_observe_and_nothing_is_blocked(db, settings, organization, form_template, boss_user):
    free_plan(organization)
    assert enforcement_mode() == "observe"

    second_form = auth_client(boss_user).post("/api/v1/form-templates/", {"title": "Deuxième", "fields_schema": SCHEMA_WITH_PHONE}, format="json")
    csv = auth_client(boss_user).get("/api/v1/checkins/export/")

    assert second_form.status_code == 201
    assert csv.status_code == 200
    would_block = AuditEvent.objects.filter(organization=organization, action="plan.would_block")
    assert {event.metadata["feature"] for event in would_block} >= {"forms", "export_csv"}


def test_observe_mode_does_not_show_locks_in_the_interface(db, organization, boss_user):
    free_plan(organization)
    payload = auth_client(boss_user).get("/api/v1/org/me/").data["billing"]
    assert payload["enforcement"] == "observe"
    assert not any(payload["locked"].values())


# --- mode appliqué ----------------------------------------------------------------------------------------------------

def test_enforced_free_plan_refuses_extra_form_and_access_point_with_the_standard_error(db, settings, organization, form_template, boss_user):
    free_plan(organization)
    enforce_plans(settings)
    client = auth_client(boss_user)

    form = client.post("/api/v1/form-templates/", {"title": "Deuxième", "fields_schema": SCHEMA_WITH_PHONE}, format="json")

    assert form.status_code == 403
    assert (form.data["code"], form.data["feature"], form.data["required_plan"]) == ("plan_required", "forms", "essentiel")
    assert form.data["error"]["message"]

    AccessPoint.objects.create(organization=organization, form_template=form_template, name="Accueil")
    point = client.post("/api/v1/access-points/", {"name": "Garage", "form_template": str(form_template.id)}, format="json")
    assert point.status_code == 403 and point.data["feature"] == "access_points"


def test_enforced_free_plan_limits_team_members(db, settings, organization, boss_user, staff_user):
    free_plan(organization)
    enforce_plans(settings)  # Gratuit = 2 membres : le patron et l'agent sont déjà là

    response = auth_client(boss_user).post("/api/v1/auth/invite/", {"email": "nouveau@example.com", "role": "STAFF"}, format="json")

    assert response.status_code == 403 and response.data["feature"] == "members"
    assert not StaffInvitation.objects.filter(organization=organization, email="nouveau@example.com").exists()


def test_enforced_recurring_export_is_locked_but_exit_export_always_works(db, settings, organization, form_template, boss_user):
    free_plan(organization)
    enforce_plans(settings)
    client = auth_client(boss_user)

    locked = client.get("/api/v1/checkins/export/")
    exit_export = client.get("/api/v1/checkins/export/?purpose=exit")

    assert locked.status_code == 403 and locked.data["feature"] == "export_csv" and locked.data["required_plan"] == "essentiel"
    assert exit_export.status_code == 200
    assert AuditEvent.objects.filter(organization=organization, action="export.exit").exists()


def test_exit_export_still_works_after_trial_end_and_unpaid(db, settings, organization, form_template, boss_user):
    set_subscription(organization, plan="plus", status="trialing", trial_ends_at=timezone.now() - timedelta(days=30))
    enforce_plans(settings)
    assert auth_client(boss_user).get("/api/v1/checkins/export/?purpose=exit").status_code == 200


def test_enforced_free_plan_removes_phone_from_the_public_form(db, settings, organization, api_client):
    FormTemplate.objects.create(organization=organization, title="Registre", fields_schema=SCHEMA_WITH_PHONE)
    free_plan(organization)
    enforce_plans(settings)

    form = api_client.get(f"/api/v1/public/forms/{organization.qr_secure_token}/")

    assert form.status_code == 200
    assert [field["id"] for field in form.data["fields_schema"]] == ["nom", "signature"]


def test_paid_plan_keeps_phone_in_the_public_form(db, settings, organization, api_client):
    FormTemplate.objects.create(organization=organization, title="Registre", fields_schema=SCHEMA_WITH_PHONE)
    set_subscription(organization, plan="essentiel", status="active", current_period_end=timezone.now() + timedelta(days=10))
    enforce_plans(settings)

    form = api_client.get(f"/api/v1/public/forms/{organization.qr_secure_token}/")

    assert [field["id"] for field in form.data["fields_schema"]] == ["nom", "telephone", "signature"]


def test_retired_document_scan_field_is_never_served_to_visitors(db, settings, organization, api_client):
    legacy = [*SCHEMA_WITH_PHONE[:2], {"id": "piece", "type": "document_scan", "label": "Pièce d'identité", "required": True}, SCHEMA_WITH_PHONE[2]]
    FormTemplate.objects.create(organization=organization, title="Registre", fields_schema=legacy)
    set_subscription(organization, plan="essentiel", status="active", current_period_end=timezone.now() + timedelta(days=10))
    enforce_plans(settings)

    form = api_client.get(f"/api/v1/public/forms/{organization.qr_secure_token}/")

    assert "piece" not in [field["id"] for field in form.data["fields_schema"]]


def test_enforced_free_plan_hides_old_history_but_exit_export_keeps_it(db, settings, organization, form_template, boss_user):
    old = CheckIn.objects.create(organization=organization, form_template=form_template, idempotency_key="00000000-0000-0000-0000-0000000000a1",
                                 responses={"nom": "Ancien Visiteur"}, created_at_client=timezone.now() - timedelta(days=60))
    CheckIn.objects.create(organization=organization, form_template=form_template, idempotency_key="00000000-0000-0000-0000-0000000000a2",
                           responses={"nom": "Récent"}, created_at_client=timezone.now())
    free_plan(organization)
    enforce_plans(settings)
    client = auth_client(boss_user)

    listed = client.get("/api/v1/checkins/")
    exported = b"".join(client.get("/api/v1/checkins/export/?purpose=exit").streaming_content).decode("utf-8")

    assert listed.data["count"] == 1 and listed.data["results"][0]["responses"]["nom"] == "Récent"
    assert "Ancien Visiteur" in exported
    assert CheckIn.objects.filter(id=old.id).exists()  # masquer n'est pas supprimer


def test_enforced_karnet_requires_the_plan_even_when_enabled_by_operations(db, settings, organization, boss_user):
    enable_karnet(organization)
    free_plan(organization)
    enforce_plans(settings)

    response = auth_client(boss_user).get("/api/v1/karnet/resources/")

    assert response.status_code == 403 and response.data["feature"] == "karnet" and response.data["required_plan"] == "plus"
    assert auth_client(boss_user).get("/api/v1/org/me/").data["capabilities"]["karnet"] is False


def test_karnet_unchanged_in_observe_mode(db, organization, boss_user):
    enable_karnet(organization)
    free_plan(organization)
    assert auth_client(boss_user).get("/api/v1/karnet/resources/").status_code == 200


# --- la collecte n'est JAMAIS bloquée ----------------------------------------------------------------------------------

def test_sync_is_never_blocked_by_an_expired_plan_and_drops_non_included_fields(db, settings, api_client, organization):
    FormTemplate.objects.create(organization=organization, title="Registre", fields_schema=SCHEMA_WITH_PHONE)
    set_subscription(organization, plan="plus", status="trialing", trial_ends_at=timezone.now() - timedelta(days=5))
    enforce_plans(settings)
    payload = valid_checkin_payload(organization.qr_secure_token, responses={"nom": "Awa Koné", "telephone": "+2250707070707"})

    response = api_client.post("/api/v1/checkins/sync/", {"checkins": [payload]}, format="json")

    assert response.data["processed"][0]["status"] == "created"
    stored = CheckIn.objects.get(organization=organization)
    assert stored.responses == {"nom": "Awa Koné"}  # téléphone écarté (hors plan), fiche acceptée


def test_sync_accepts_fiches_for_a_suspended_billing_state_in_every_mode(db, settings, api_client, organization, form_template):
    set_subscription(organization, plan="free", status="canceled")
    for mode in ("off", "observe", "enforce"):
        settings.PLAN_OBSERVE_MODE = mode != "off"
        settings.PLAN_ENFORCEMENT_STARTS_AT = timezone.now() - timedelta(days=1) if mode == "enforce" else None
        payload = valid_checkin_payload(organization.qr_secure_token)
        payload["responses"] = {"nom": "Awa", "telephone": "+2250707070707"}
        assert api_client.post("/api/v1/checkins/sync/", {"checkins": [payload]}, format="json").data["processed"][0]["status"] == "created"


# --- fenêtre de grâce : l'organisation sans abonnement reste fonctionnelle ----------------------------------------------

def test_org_without_subscription_row_is_treated_as_free_and_never_crashes(db, boss_user, organization):
    Subscription.objects.filter(organization=organization).delete()
    assert auth_client(boss_user).get("/api/v1/billing/subscription/").data["plan"] == "free"
