"""Paiements : idempotence, libellé non fiscal, droits d'administration, conservation séparée de la purge des visites."""
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.models import AuditEvent, User
from apps.billing.exceptions import PaymentConflict
from apps.billing.models import Payment
from apps.billing.services import effective_plan, record_payment
from apps.checkins.models import CheckIn
from apps.checkins.privacy import purge_expired_visits
from apps.testing_utils import auth_client

from .helpers import set_subscription

PAYLOAD = {"plan": "essentiel", "amount": 3000, "method": "wave", "reference": "WAVE-2026-0001", "months": 1}


@pytest.fixture
def platform_admin(db):
    return User.objects.create_user(email="root@example.com", is_superuser=True, is_staff=True)


def test_record_payment_is_idempotent_on_the_reference(db, organization, boss_user):
    first, created_first = record_payment(organization, recorded_by=boss_user, **PAYLOAD)
    second, created_second = record_payment(organization, recorded_by=boss_user, **PAYLOAD)

    assert created_first is True and created_second is False
    assert first.id == second.id
    assert Payment.objects.filter(reference="WAVE-2026-0001").count() == 1
    assert AuditEvent.objects.filter(organization=organization, action="billing.payment_recorded").count() == 1


def test_a_reference_cannot_be_reused_for_another_amount_or_organization(db, organization):
    record_payment(organization, **PAYLOAD)
    with pytest.raises(PaymentConflict):
        record_payment(organization, **{**PAYLOAD, "amount": 7000})


def test_payment_activates_the_plan_and_extends_from_the_current_period(db, organization):
    set_subscription(organization, plan="free", status="active")
    first, _ = record_payment(organization, **PAYLOAD)
    assert effective_plan(organization).plan == "essentiel"
    assert effective_plan(organization).state == "active"

    second, _ = record_payment(organization, **{**PAYLOAD, "reference": "WAVE-2026-0002"})

    assert second.period_start == first.period_end  # le second mois se greffe sur la fin du premier
    assert second.period_end > first.period_end


def test_document_label_is_never_invoice_without_fne_reference(db, organization):
    receipt, _ = record_payment(organization, **PAYLOAD)
    invoice, _ = record_payment(organization, **{**PAYLOAD, "reference": "WAVE-2026-0003", "fne_reference": "FNE-2026-000123"})

    assert receipt.document_label == "Reçu interne, non fiscal"
    assert invoice.document_label == "Facture électronique (FNE)"


def test_admin_endpoint_records_a_payment_once_and_reports_replays(db, organization, platform_admin):
    client = auth_client(platform_admin)
    url = f"/api/v1/admin/billing/organizations/{organization.id}/payments/"

    first = client.post(url, PAYLOAD, format="json")
    replay = client.post(url, PAYLOAD, format="json")
    conflict = client.post(url, {**PAYLOAD, "amount": 9999}, format="json")

    assert first.status_code == 201 and first.data["already_recorded"] is False and first.data["document_label"] == "Reçu interne, non fiscal"
    assert replay.status_code == 200 and replay.data["already_recorded"] is True
    assert conflict.status_code == 409
    assert Payment.objects.filter(organization=organization).count() == 1


def test_admin_billing_is_reserved_to_the_platform_admin(db, organization, boss_user):
    client = auth_client(boss_user)
    assert client.post(f"/api/v1/admin/billing/organizations/{organization.id}/payments/", PAYLOAD, format="json").status_code == 403
    assert client.get(f"/api/v1/admin/billing/organizations/{organization.id}/").status_code == 403
    assert client.patch(f"/api/v1/admin/billing/organizations/{organization.id}/", {"plan": "plus"}, format="json").status_code == 403


def test_admin_can_change_the_subscription_with_an_audit_trail(db, organization, platform_admin):
    notice = timezone.now().isoformat()
    response = auth_client(platform_admin).patch(f"/api/v1/admin/billing/organizations/{organization.id}/",
                                                  {"status": "founder", "plan": "plus", "founder_notice_sent_at": notice}, format="json")

    assert response.status_code == 200 and response.data["subscription"]["status"] == "founder"
    event = AuditEvent.objects.get(organization=organization, action="billing.subscription_changed")
    assert event.metadata["before"]["status"] == "trialing" and event.metadata["after"]["status"] == "founder"


def test_boss_sees_own_receipts_only_and_staff_cannot(db, organization, boss_user, staff_user):
    record_payment(organization, **PAYLOAD)
    other = type(organization).objects.create(name="Autre", qr_secure_token="autre-token-1")
    record_payment(other, **{**PAYLOAD, "reference": "WAVE-OTHER-1"})

    boss = auth_client(boss_user).get("/api/v1/billing/payments/")
    staff = auth_client(staff_user).get("/api/v1/billing/payments/")

    assert [row["reference"] for row in boss.data] == ["WAVE-2026-0001"]
    assert staff.status_code == 403


def test_purging_visits_never_touches_payments_and_payments_outlive_the_organization(db, organization, form_template):
    CheckIn.objects.create(organization=organization, form_template=form_template, idempotency_key="00000000-0000-0000-0000-0000000000b1",
                           responses={"nom": "Vieux"}, created_at_client=timezone.now() - timedelta(days=800))
    record_payment(organization, **PAYLOAD)

    result = purge_expired_visits(now=timezone.now())
    assert result["deleted"] == 1
    assert Payment.objects.count() == 1

    organization.delete()
    survivor = Payment.objects.get()
    assert survivor.organization is None and survivor.organization_name == "Cabinet Test"  # conservé 10 ans, sans l'établissement
