from rest_framework import serializers

from .models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    capabilities = serializers.SerializerMethodField()
    billing = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id", "name", "logo_url", "visit_reasons", "qr_secure_token", "created_at",
            "is_suspended", "karnet_enabled", "capabilities", "billing",
            "retention_visits_days", "restrict_visit_reasons", "store_document_number", "privacy_contact",
        ]
        # karnet_enabled n'est modifiable que via OrganizationKarnetView (meme logique que
        # is_suspended, reserve a OrganizationLifecycleView) ; capabilities est toujours calcule.
        read_only_fields = ["id", "qr_secure_token", "created_at", "karnet_enabled", "capabilities", "billing"]

    def get_capabilities(self, organization):
        return organization.capabilities

    def get_billing(self, organization):
        from apps.billing.services import billing_payload

        return billing_payload(organization)


class OrganizationUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    logo_url = serializers.CharField(required=False, allow_blank=True)
    visit_reasons = serializers.ListField(
        child=serializers.CharField(max_length=120), required=False, allow_empty=True
    )
    # Conservation et confidentialité : réservées au patron (MyOrganizationView.patch).
    retention_visits_days = serializers.IntegerField(min_value=30, max_value=3650, required=False, allow_null=True)
    restrict_visit_reasons = serializers.BooleanField(required=False)
    store_document_number = serializers.BooleanField(required=False)
    privacy_contact = serializers.CharField(max_length=255, required=False, allow_blank=True)


class RenameOrganizationSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)

    def validate_name(self, value):
        return value.strip()


class OrganizationKarnetUpdateSerializer(serializers.Serializer):
    """Corps de PATCH /org/me/karnet/. Les deux champs sont optionnels mais au moins
    un doit etre fourni ; `capabilities` n'accepte que les sous-cles connues (jamais
    `registration` ni `karnet`, qui sont toujours calcules, jamais saisis)."""

    karnet_enabled = serializers.BooleanField(required=False)
    capabilities = serializers.DictField(child=serializers.BooleanField(), required=False)

    def validate_capabilities(self, value):
        unknown = set(value) - set(Organization.KarnetCapability.values)
        if unknown:
            raise serializers.ValidationError(f"Capacité(s) inconnue(s) : {', '.join(sorted(unknown))}.")
        return value

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Aucune modification fournie.")
        return attrs
