from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.checkins.privacy import retention_days_for
from apps.common.permissions import IsBoss, IsOrgMember
from apps.common.responses import error_response
from apps.feedback.views import IsPlatformAdmin
from apps.organizations.models import Organization

from .exceptions import PaymentConflict
from .models import Payment, Subscription
from .serializers import PaymentSerializer, RecordPaymentSerializer, SubscriptionAdminSerializer, SubscriptionAdminUpdateSerializer
from .services import billing_payload, record_payment, update_subscription, usage_payload


class SubscriptionView(APIView):
    """Abonnement de l'établissement : plan en vigueur, échéance, limites et consommation (page Paramètres › Abonnement)."""

    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request):
        organization = request.user.organization
        return Response({**billing_payload(organization), "usage": usage_payload(organization), "retention_visits_days": retention_days_for(organization)})


class PaymentListView(APIView):
    """Reçus de l'établissement (patron seulement). Chaque ligne porte son libellé : « Reçu interne, non fiscal » sans référence FNE."""

    permission_classes = [IsAuthenticated, IsBoss]

    def get(self, request):
        return Response(PaymentSerializer(request.user.organization.payments.all(), many=True).data)


class AdminOrganizationBillingView(APIView):
    permission_classes = [IsPlatformAdmin]

    def _payload(self, organization):
        subscription = Subscription.objects.filter(organization=organization).first()
        return {
            **billing_payload(organization),
            "usage": usage_payload(organization),
            "subscription": SubscriptionAdminSerializer(subscription).data if subscription else None,
            "payments": PaymentSerializer(organization.payments.all(), many=True).data,
        }

    def get(self, request, organization_id):
        return Response(self._payload(get_object_or_404(Organization, id=organization_id)))

    def patch(self, request, organization_id):
        organization = get_object_or_404(Organization, id=organization_id)
        serializer = SubscriptionAdminUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        update_subscription(organization, serializer.validated_data, actor=request.user)
        return Response(self._payload(organization))


class AdminRecordPaymentView(APIView):
    """Bouton « Enregistrer un paiement » de l'administration. Idempotent : rejouer la même référence renvoie le paiement existant."""

    permission_classes = [IsPlatformAdmin]

    def post(self, request, organization_id):
        organization = get_object_or_404(Organization, id=organization_id)
        serializer = RecordPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payment, created = record_payment(organization, recorded_by=request.user, **serializer.validated_data)
        except PaymentConflict as error:
            return error_response(str(error), status.HTTP_409_CONFLICT)
        return Response({**PaymentSerializer(payment).data, "already_recorded": not created}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
