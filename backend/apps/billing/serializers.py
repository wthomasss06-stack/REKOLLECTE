from rest_framework import serializers

from .models import PLAN_CHOICES, Payment, Subscription
from .plans import PLAN_LABELS

PAID_PLANS = [choice for choice in PLAN_CHOICES if choice[0] != "free"]


class PaymentSerializer(serializers.ModelSerializer):
    plan_label = serializers.SerializerMethodField()
    # « Reçu interne, non fiscal » tant qu'aucune facture électronique n'est émise : jamais « facture » sans référence FNE.
    document_label = serializers.CharField(read_only=True)

    class Meta:
        model = Payment
        fields = ["id", "reference", "amount", "currency", "method", "plan", "plan_label", "period_start", "period_end", "paid_at", "fne_reference", "document_label", "note"]
        read_only_fields = fields

    def get_plan_label(self, payment):
        return PLAN_LABELS.get(payment.plan, payment.plan)


class SubscriptionAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ["plan", "status", "trial_ends_at", "current_period_end", "grace_days", "founder_notice_sent_at", "founder_limits_from"]


class SubscriptionAdminUpdateSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=PLAN_CHOICES, required=False)
    status = serializers.ChoiceField(choices=Subscription.Status.choices, required=False)
    trial_ends_at = serializers.DateTimeField(required=False, allow_null=True)
    current_period_end = serializers.DateTimeField(required=False, allow_null=True)
    grace_days = serializers.IntegerField(min_value=0, max_value=90, required=False)
    founder_notice_sent_at = serializers.DateTimeField(required=False, allow_null=True)
    founder_limits_from = serializers.DateTimeField(required=False, allow_null=True)


class RecordPaymentSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=PAID_PLANS)
    amount = serializers.IntegerField(min_value=1, max_value=100_000_000)
    method = serializers.ChoiceField(choices=Payment.Method.choices)
    reference = serializers.CharField(max_length=120)
    months = serializers.IntegerField(min_value=1, max_value=36, required=False, default=1)
    paid_at = serializers.DateTimeField(required=False)
    fne_reference = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    note = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")

    def validate_reference(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("La référence du paiement est obligatoire.")
        return value
