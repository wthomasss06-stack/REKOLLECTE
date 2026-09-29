from django.db import migrations, models


class Migration(migrations.Migration):
    """Numéro de réservation lisible, séquentiel par établissement.

    Livré en trois migrations (colonne nullable -> remplissage de l'historique ->
    contrainte NOT NULL + unicité) : sur PostgreSQL, modifier une table dans la
    même transaction que la mise à jour de ses lignes peut échouer avec « cannot
    ALTER TABLE because it has pending trigger events ».
    """

    dependencies = [
        ("karnet", "0002_resource_builder_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="reservation",
            name="number",
            field=models.PositiveIntegerField(editable=False, null=True),
        ),
    ]
