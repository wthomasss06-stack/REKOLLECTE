import json
from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import AccessPoint, CheckIn, FormTemplate

ALLOWED_FIELD_TYPES = ("text", "phone", "email", "number", "date", "select", "checkbox", "signature", "photo", "document_scan", "host")
DOCUMENT_TYPES = ("cni", "passport", "free")
DOCUMENT_EXTRACT_FIELDS = ("last_name", "first_names", "document_number", "birth_date", "nationality", "expiry_date")

# Plafonds de l'endpoint de synchronisation (public, sans authentification). Les photos de pièces d'identité peuvent
# peser quelques Mo en base64 : les limites laissent de la marge à l'usage légitime mais bornent l'abus.
MAX_SCHEMA_FIELDS = 60
MAX_SYNC_RESPONSES_KEYS = 120
MAX_SYNC_RESPONSES_CHARS = 6_000_000
MAX_SYNC_SIGNATURE_CHARS = 600_000
# Tolérance sur l'horloge d'un appareil : au-delà, une date « dans le futur » est ramenée à maintenant.
CLIENT_CLOCK_SKEW = timedelta(minutes=10)


class FormFieldSchemaSerializer(serializers.Serializer):
    id = serializers.SlugField()
    type = serializers.ChoiceField(choices=ALLOWED_FIELD_TYPES)
    label = serializers.CharField(max_length=255)
    required = serializers.BooleanField(default=False)
    identity_role = serializers.ChoiceField(
        choices=("full_name", "phone", "email"),
        required=False,
        allow_null=True,
    )
    options = serializers.ListField(child=serializers.CharField(max_length=200), required=False, max_length=100)
    document_type = serializers.ChoiceField(choices=DOCUMENT_TYPES, required=False)
    extract_fields = serializers.ListField(child=serializers.ChoiceField(choices=DOCUMENT_EXTRACT_FIELDS), required=False)
    requires_agent_validation = serializers.BooleanField(required=False, default=True)
    retain_document_image = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        if attrs.get("type") == "host":
            # « Qui venez-vous voir ? » est toujours facultatif, et sa liste vient des membres (jamais saisie à la main).
            attrs["required"] = False
            attrs.pop("options", None)
            attrs.pop("identity_role", None)
        return attrs


class FormTemplateSerializer(serializers.ModelSerializer):
    fields_schema = FormFieldSchemaSerializer(many=True, max_length=MAX_SCHEMA_FIELDS)

    class Meta:
        model = FormTemplate
        fields = ["id", "title", "fields_schema", "version", "is_active", "is_default", "updated_at"]
        read_only_fields = ["id", "version", "updated_at"]


class FormTemplateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormTemplate
        fields = ["title", "fields_schema", "is_active", "is_default"]

    def validate_fields_schema(self, value):
        serializer = FormFieldSchemaSerializer(data=value, many=True, max_length=MAX_SCHEMA_FIELDS)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data


class AccessPointSerializer(serializers.ModelSerializer):
    form_title = serializers.SerializerMethodField()
    public_url = serializers.SerializerMethodField()

    class Meta:
        model = AccessPoint
        fields = ["id", "name", "device_label", "secure_token", "is_active", "last_seen_at", "created_at", "form_template", "form_title", "public_url"]
        read_only_fields = ["id", "secure_token", "last_seen_at", "created_at", "form_title", "public_url"]

    def get_public_url(self, obj):
        return f"/v/{obj.secure_token}"

    def get_form_title(self, obj):
        if obj.secure_token == obj.organization.qr_secure_token:
            template = obj.organization.form_templates.filter(is_default=True).first() or obj.organization.form_templates.filter(is_active=True).first()
            if template:
                return template.title
        return obj.form_template.title


class AccessPointWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessPoint
        fields = ["name", "device_label", "form_template", "is_active"]


class PublicFormSerializer(serializers.Serializer):
    organization_name = serializers.CharField()
    organization_logo_url = serializers.CharField(allow_blank=True)
    visit_reasons = serializers.ListField(child=serializers.CharField())
    fields_schema = serializers.JSONField()
    form_id = serializers.UUIDField()
    form_title = serializers.CharField()
    access_point_id = serializers.UUIDField(allow_null=True)
    access_point_name = serializers.CharField(allow_blank=True)


# Valeur qui remplace une image dans la liste du registre. Même constante côté front : lib/responseDisplay.ts.
IMAGE_PLACEHOLDER = "__image__"


def slim_response_value(value):
    """Réponse allégée pour la LISTE du registre (rafraîchie toutes les 30 s par le dashboard).

    Une photo (data URL base64) et l'image ou le texte OCR brut d'une pièce scannée pèsent plusieurs Mo par fiche : avec
    20 lignes par page, la liste devenait une réponse de dizaines de Mo, que l'interface ne sait de toute façon pas afficher.
    On garde l'information utile (« une photo existe », champs extraits de la pièce) ; les données complètes restent en base."""
    if isinstance(value, str) and value.startswith("data:image/"):
        return IMAGE_PLACEHOLDER
    if isinstance(value, dict) and ("image" in value or "raw_text" in value):
        slim = {key: item for key, item in value.items() if key not in ("image", "raw_text")}
        slim["has_image"] = bool(value.get("image"))
        return slim
    return value


class CheckInSerializer(serializers.ModelSerializer):
    client_id = serializers.UUIDField(read_only=True, allow_null=True)
    client_name = serializers.CharField(source="client.full_name", read_only=True, allow_null=True)

    class Meta:
        model = CheckIn
        fields = ["id", "responses", "signature_blob", "created_at_client", "synced_at", "client_id", "client_name"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        responses = data.get("responses")
        if isinstance(responses, dict):
            data["responses"] = {key: slim_response_value(item) for key, item in responses.items()}
        return data


class CheckInSyncItemSerializer(serializers.Serializer):
    idempotency_key = serializers.UUIDField()
    qr_token = serializers.CharField(max_length=64)
    responses = serializers.DictField()
    signature_blob = serializers.CharField(required=False, allow_blank=True, default="", max_length=MAX_SYNC_SIGNATURE_CHARS)
    created_at_client = serializers.DateTimeField()

    def validate_responses(self, value):
        if len(value) > MAX_SYNC_RESPONSES_KEYS:
            raise serializers.ValidationError("Trop de champs dans la fiche.")
        try:
            size = len(json.dumps(value, ensure_ascii=False))
        except (TypeError, ValueError):
            raise serializers.ValidationError("Réponses illisibles.")
        if size > MAX_SYNC_RESPONSES_CHARS:
            raise serializers.ValidationError("Fiche trop volumineuse.")
        return value

    def validate_created_at_client(self, value):
        # Une tablette dont l'horloge avance ne doit pas ranger ses visites dans le futur (registre et statistiques faussés).
        now = timezone.now()
        return now if value > now + CLIENT_CLOCK_SKEW else value
