from django.db import migrations


def mark_existing_organizations_as_founders(apps, schema_editor):
    """Établissements déjà inscrits : statut « fondateur » = AUCUNE limitation. `founder_limits_from` reste vide : on ne le fixe
    qu'après l'envoi du préavis écrit (founder_notice_sent_at), jamais automatiquement."""
    Organization = apps.get_model("organizations", "Organization")
    Subscription = apps.get_model("billing", "Subscription")
    for organization in Organization.objects.filter(subscription__isnull=True):
        Subscription.objects.create(organization=organization, plan="plus", status="founder")


class Migration(migrations.Migration):
    dependencies = [("billing", "0001_initial"), ("organizations", "0005_organization_privacy_contact_and_more")]
    operations = [migrations.RunPython(mark_existing_organizations_as_founders, migrations.RunPython.noop)]
