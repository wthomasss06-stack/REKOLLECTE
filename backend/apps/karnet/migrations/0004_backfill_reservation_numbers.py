from django.db import migrations

BATCH_SIZE = 500


def number_existing_reservations(apps, schema_editor):
    """Numérote l'historique existant, établissement par établissement, dans
    l'ordre de création — le numéro 1 reste la toute première réservation."""
    Reservation = apps.get_model("karnet", "Reservation")
    organization_ids = list(Reservation.objects.order_by().values_list("organization_id", flat=True).distinct())
    for organization_id in organization_ids:
        history = list(Reservation.objects.filter(organization_id=organization_id).order_by("created_at", "id"))
        for position, reservation in enumerate(history, start=1):
            reservation.number = position
        Reservation.objects.bulk_update(history, ["number"], batch_size=BATCH_SIZE)


class Migration(migrations.Migration):
    dependencies = [
        ("karnet", "0003_reservation_number"),
    ]

    operations = [
        # Retour arrière volontairement vide : la colonne disparaît avec 0003.
        migrations.RunPython(number_existing_reservations, migrations.RunPython.noop),
    ]
