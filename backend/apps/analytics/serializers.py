from rest_framework import serializers

from .services import ACTION_TYPES


class ConsentSerializer(serializers.Serializer):
    accepted = serializers.BooleanField()


class CollectSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=["page", "action"])
    path = serializers.CharField(max_length=300)
    referrer = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    source = serializers.CharField(max_length=60, required=False, allow_blank=True, default="")
    action = serializers.ChoiceField(choices=sorted(ACTION_TYPES), required=False)

    def validate(self, attrs):
        if attrs["kind"] == "action" and not attrs.get("action"):
            raise serializers.ValidationError({"action": "Action manquante."})
        return attrs
