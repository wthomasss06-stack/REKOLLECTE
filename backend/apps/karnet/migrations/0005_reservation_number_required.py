from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("karnet", "0004_backfill_reservation_numbers"),
    ]

    operations = [
        migrations.AlterField(
            model_name="reservation",
            name="number",
            field=models.PositiveIntegerField(editable=False),
        ),
        migrations.AddConstraint(
            model_name="reservation",
            constraint=models.UniqueConstraint(fields=("organization", "number"), name="karnet_reservation_number_unique_per_org"),
        ),
    ]
