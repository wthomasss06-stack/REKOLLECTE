from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Client, Reservation, Resource


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ["id", "full_name", "phone", "email", "note", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_full_name(self, value):
        return value.strip()

    def validate_phone(self, value):
        from .services import normalize_phone

        return normalize_phone(value)


class ClientDetailSerializer(ClientSerializer):
    """Fiche client complète (phase 7) et ligne de la liste REKOLLECTE+ : ajoute les
    compteurs utiles sans que l'appelant ait à recouper plusieurs requêtes
    lui-même. Attend un client issu de `Client.objects.with_activity()`."""

    checkins_count = serializers.IntegerField(read_only=True)
    reservations_count = serializers.IntegerField(read_only=True)
    last_visit_at = serializers.SerializerMethodField()

    class Meta(ClientSerializer.Meta):
        fields = ClientSerializer.Meta.fields + ["checkins_count", "reservations_count", "last_visit_at"]

    @extend_schema_field(serializers.DateTimeField(allow_null=True))
    def get_last_visit_at(self, client):
        # La dernière visite est la plus récente entre un passage à l'accueil et
        # une réservation : un client qui ne fait que réserver reste « actif ».
        moments = [moment for moment in (client.last_checkin_at, client.last_reservation_at) if moment]
        return serializers.DateTimeField().to_representation(max(moments)) if moments else None


class ResourceSerializer(serializers.ModelSerializer):
    unit_display = serializers.CharField(source="get_unit_display", read_only=True)
    billing_unit_display = serializers.CharField(source="get_billing_unit_display", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = Resource
        fields = [
            "id", "name", "unit", "unit_display", "price", "is_active", "created_at",
            "category", "category_display", "resource_type", "billing_unit", "billing_unit_display",
            "code", "description", "capacity", "location", "duration_label", "equipment",
        ]
        read_only_fields = ["id", "unit_display", "billing_unit_display", "category_display", "created_at"]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Le prix ne peut pas être négatif.")
        return value

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        is_active = attrs.get("is_active", getattr(self.instance, "is_active", True))
        # Un brouillon (créé depuis un modèle du catalogue, prix pas encore saisi)
        # peut avoir un prix nul tant qu'il est inactif : il ne se réserve nulle
        # part. Une ressource active doit avoir un prix > 0, sinon le montant figé
        # à la création d'une réservation serait faux.
        if is_active and price is not None and price <= 0:
            raise serializers.ValidationError({"price": "Le prix doit être supérieur à 0."})
        return attrs

    def validate_capacity(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("La capacité doit être supérieure à 0.")
        return value


class ReservationSerializer(serializers.ModelSerializer):
    """Lecture — inclut les libellés utiles à l'affichage sans requête supplémentaire."""

    client_name = serializers.CharField(source="client.full_name", read_only=True)
    client_phone = serializers.CharField(source="client.phone", read_only=True)
    resource_name = serializers.CharField(source="resource.name", read_only=True)
    resource_unit = serializers.CharField(source="resource.unit", read_only=True)
    reminder_due = serializers.BooleanField(read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id", "number", "client", "client_name", "client_phone", "resource", "resource_name", "resource_unit",
            "quantity", "unit_price", "total_amount", "starts_at", "ends_at", "status",
            "is_paid", "paid_at", "reminder_acknowledged", "reminder_due", "created_at",
        ]
        read_only_fields = fields


class ReservationCreateSerializer(serializers.Serializer):
    """Écriture — accepte soit un client existant, soit de quoi en créer un à la
    volée (cas le plus courant : le visiteur devient client au moment de réserver)."""

    client = serializers.UUIDField(required=False)
    client_name = serializers.CharField(max_length=255, required=False)
    client_phone = serializers.CharField(max_length=32, required=False, allow_blank=True, default="")
    resource = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, default=1)
    starts_at = serializers.DateTimeField(required=False)

    def validate(self, attrs):
        if not attrs.get("client") and not (attrs.get("client_name") or "").strip():
            raise serializers.ValidationError("Indique un client existant (client) ou un nom pour en créer un (client_name).")
        return attrs


class ReservationUpdateSerializer(serializers.ModelSerializer):
    """Écriture partielle — seuls le statut, le paiement et l'accusé de rappel sont
    modifiables après coup ; client/ressource/montant restent un historique figé."""

    class Meta:
        model = Reservation
        fields = ["status", "is_paid", "reminder_acknowledged"]
