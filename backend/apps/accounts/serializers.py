from rest_framework import serializers

from .models import AuditEvent, StaffInvitation, User


class UserSerializer(serializers.ModelSerializer):
    organization_id = serializers.UUIDField(source="organization.id", read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    manager_id = serializers.UUIDField(source="manager.id", read_only=True, allow_null=True)
    manager_name = serializers.CharField(source="manager.full_name", read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "avatar_url", "role", "manager_id", "manager_name", "organization_id", "organization_name", "is_active", "is_visit_host", "access_revoked_at", "access_revoked_reason"]
        read_only_fields = fields


class StaffInvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffInvitation
        fields = ["id", "email", "role", "accepted_at", "revoked_at", "revoked_reason", "created_at"]
        read_only_fields = fields


class AuditEventSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True)
    actor_name = serializers.CharField(source="actor.full_name", read_only=True, allow_null=True)
    target_email = serializers.EmailField(source="target_user.email", read_only=True, allow_null=True)
    target_name = serializers.CharField(source="target_user.full_name", read_only=True, allow_null=True)

    class Meta:
        model = AuditEvent
        fields = ["id", "action", "actor_name", "actor_email", "target_name", "target_email", "metadata", "created_at"]
        read_only_fields = fields


class UserProfileUpdateSerializer(serializers.Serializer):
    """Volontairement restreint a full_name/avatar_url : le role ne se change JAMAIS
    par cette voie (uniquement via une invitation, cf. services.resolve_or_create_user) —
    une auto-promotion serait une faille de privilege escalation."""

    full_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    avatar_url = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate_avatar_url(self, value: str) -> str:
        """Une photo de profil est une adresse https (Cloudinary, Google…) : jamais `javascript:`, `data:` ni une adresse non chiffrée,
        puisqu'elle est affichée aux autres membres de l'établissement (équipe, journal)."""
        value = value.strip()
        if value and not value.lower().startswith("https://"):
            raise serializers.ValidationError("L’adresse de la photo doit commencer par https://.")
        return value

    def validate_full_name(self, value: str) -> str:
        return " ".join(value.split())


class GoogleAuthSerializer(serializers.Serializer):
    credential = serializers.CharField()


class InviteStaffSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=["GERANT", "STAFF"], default="STAFF", required=False)
