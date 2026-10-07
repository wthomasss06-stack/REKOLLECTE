import pytest
from django.db import IntegrityError, transaction

from apps.accounts.models import AuthIdentity, StaffInvitation, User
from apps.accounts.services import (
    EmailRequiredError,
    IdentityConflictError,
    LastIdentityError,
    ProviderProfile,
    resolve_login,
    unlink_identity,
)
from apps.organizations.models import Organization


def profile(provider, subject, email="", verified=True, private=False, name="Awa Koné"):
    return ProviderProfile(provider=provider, subject=subject, email=email, email_verified=verified,
                           is_private_email=private, name=name)


def test_google_then_facebook_with_same_email_is_one_account(db):
    user_g, created_g = resolve_login(profile("google", "g-1", "awa@example.com"))
    user_f, created_f = resolve_login(profile("facebook", "fb-9", "awa@example.com"))

    assert created_g is True and created_f is False
    assert user_f.id == user_g.id
    assert User.objects.count() == 1 and Organization.objects.count() == 1
    assert set(user_g.identities.values_list("provider", flat=True)) == {"google", "facebook"}


def test_facebook_then_google_is_the_same_account_too(db):
    user_f, _ = resolve_login(profile("facebook", "fb-9", "awa@example.com"))
    user_g, created = resolve_login(profile("google", "g-1", "awa@example.com"))

    assert created is False and user_g.id == user_f.id and User.objects.count() == 1


def test_email_case_does_not_create_a_duplicate(db):
    first, _ = resolve_login(profile("google", "g-1", "Awa.Kone@Example.com"))
    second, created = resolve_login(profile("apple", "ap-1", "awa.kone@example.COM"))

    assert created is False and second.id == first.id and User.objects.count() == 1
    assert first.email == "awa.kone@example.com"  # toujours stocké en minuscules


def test_known_identity_wins_even_if_email_changed_or_hidden(db):
    first, _ = resolve_login(profile("facebook", "fb-9", "awa@example.com"))

    # Plus tard Facebook ne renvoie plus d'e-mail (ou un autre) : c'est le MÊME compte.
    again, created = resolve_login(profile("facebook", "fb-9", ""))
    other, created_other = resolve_login(profile("facebook", "fb-9", "autre@example.com"))

    assert not created and not created_other
    assert again.id == other.id == first.id and User.objects.count() == 1


def test_no_email_creates_nothing(db):
    with pytest.raises(EmailRequiredError) as exc:
        resolve_login(profile("facebook", "fb-phone", ""))

    assert exc.value.code == "email_missing"
    assert User.objects.count() == 0 and AuthIdentity.objects.count() == 0 and Organization.objects.count() == 0


def test_apple_private_relay_creates_nothing(db):
    with pytest.raises(EmailRequiredError) as exc:
        resolve_login(profile("apple", "ap-1", "x7k2@privaterelay.appleid.com", private=True))

    assert exc.value.code == "email_private_relay" and User.objects.count() == 0


def test_unverified_email_is_never_used_to_match_an_account(db):
    victim, _ = resolve_login(profile("google", "g-1", "victime@example.com"))

    with pytest.raises(EmailRequiredError) as exc:
        resolve_login(profile("facebook", "fb-attacker", "victime@example.com", verified=False))

    assert exc.value.code == "email_unverified"
    assert victim.identities.count() == 1 and User.objects.count() == 1


def test_link_mode_attaches_a_private_relay_apple_identity_to_the_logged_in_user(db):
    user, _ = resolve_login(profile("google", "g-1", "awa@example.com"))

    linked, created = resolve_login(profile("apple", "ap-1", "x7k2@privaterelay.appleid.com", private=True), link_to=user)
    assert created is False and linked.id == user.id

    # Et désormais, se connecter avec Apple retrouve le même compte sans passer par l'e-mail.
    via_apple, _ = resolve_login(profile("apple", "ap-1", "x7k2@privaterelay.appleid.com", private=True))
    assert via_apple.id == user.id and User.objects.count() == 1


def test_link_mode_refuses_an_identity_owned_by_another_account(db):
    alice, _ = resolve_login(profile("google", "g-alice", "alice@example.com"))
    bob, _ = resolve_login(profile("google", "g-bob", "bob@example.com"))

    with pytest.raises(IdentityConflictError):
        resolve_login(profile("google", "g-alice", "alice@example.com"), link_to=bob)

    assert alice.identities.count() == 1 and bob.identities.count() == 1


def test_one_identity_per_provider_per_account(db):
    user, _ = resolve_login(profile("facebook", "fb-1", "awa@example.com"))

    with pytest.raises(IdentityConflictError):
        resolve_login(profile("facebook", "fb-2", "awa@example.com"), link_to=user)
    with pytest.raises(IdentityConflictError):  # même e-mail, mais autre compte Facebook
        resolve_login(profile("facebook", "fb-2", "awa@example.com"))
    assert User.objects.count() == 1


def test_staff_invitation_still_attaches_through_a_verified_facebook_email(db, boss_user):
    StaffInvitation.objects.create(organization=boss_user.organization, email="Agent@Example.com",
                                   role=User.Role.STAFF, token="tok-1", invited_by=boss_user)

    staff, created = resolve_login(profile("facebook", "fb-agent", "agent@example.com"))

    assert created is True and staff.organization_id == boss_user.organization_id and staff.role == User.Role.STAFF
    assert Organization.objects.count() == 1  # pas de nouvel espace patron créé par erreur


def test_database_refuses_duplicate_identities_even_if_code_races(db):
    user, _ = resolve_login(profile("google", "g-1", "awa@example.com"))
    other = User.objects.create_user(email="other@example.com")

    with pytest.raises(IntegrityError), transaction.atomic():
        AuthIdentity.objects.create(user=other, provider="google", subject="g-1")


def test_cannot_unlink_the_last_identity_but_can_unlink_one_of_two(db):
    user, _ = resolve_login(profile("google", "g-1", "awa@example.com"))
    resolve_login(profile("facebook", "fb-1", "awa@example.com"))

    unlink_identity(user, "facebook")
    assert set(user.identities.values_list("provider", flat=True)) == {"google"}
    with pytest.raises(LastIdentityError):
        unlink_identity(user, "google")


def test_legacy_account_with_mixed_case_email_is_still_matched(db, organization):
    # Compte créé avant la normalisation : la casse du début d'adresse a été conservée en base.
    legacy = User.objects.create_user(email="Awa.Kone@example.com", role=User.Role.BOSS, organization=organization)

    resolved, created = resolve_login(profile("facebook", "fb-1", "awa.kone@example.com"))

    assert created is False and resolved.id == legacy.id and User.objects.count() == 1
