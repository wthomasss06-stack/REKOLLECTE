import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0007_refreshsession_rotated_at"),
    ]

    operations = [
        migrations.CreateModel(
            name="AuthIdentity",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("provider", models.CharField(choices=[("google", "Google"), ("facebook", "Facebook"), ("apple", "Apple")], max_length=20)),
                ("subject", models.CharField(max_length=255)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("email_verified", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("last_login_at", models.DateTimeField(blank=True, null=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="identities", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(
            model_name="authidentity",
            constraint=models.UniqueConstraint(fields=("provider", "subject"), name="uniq_authidentity_provider_subject"),
        ),
        migrations.AddConstraint(
            model_name="authidentity",
            constraint=models.UniqueConstraint(fields=("user", "provider"), name="uniq_authidentity_user_provider"),
        ),
    ]
