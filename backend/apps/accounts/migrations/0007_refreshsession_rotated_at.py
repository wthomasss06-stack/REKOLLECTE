from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_user_manager"),
    ]

    operations = [
        migrations.AddField(
            model_name="refreshsession",
            name="rotated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
