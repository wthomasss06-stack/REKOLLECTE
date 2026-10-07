from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsBossOrGerant, IsOrgMember
from apps.common.responses import error_response

from .models import Client, Reservation, Resource
from .permissions import HasKarnetEnabled
from .services import find_matching_client, find_or_create_client, search_clients
from .serializers import (
    ClientDetailSerializer,
    ClientSerializer,
    ReservationCreateSerializer,
    ReservationSerializer,
    ReservationUpdateSerializer,
    ResourceSerializer,
)


def _as_bool(raw: str) -> bool:
    return raw.strip().lower() in ("1", "true", "vrai", "oui")


class ClientListView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember, HasKarnetEnabled]

    def get(self, request):
        clients = Client.objects.filter(organization=request.user.organization).with_activity()
        clients = search_clients(clients, request.query_params.get("search", ""))
        return Response(ClientDetailSerializer(clients, many=True).data)

    def post(self, request):
        serializer = ClientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        client, created = find_or_create_client(
            request.user.organization,
            full_name=serializer.validated_data.get("full_name", ""),
            phone=serializer.validated_data.get("phone", ""),
            email=serializer.validated_data.get("email", ""),
            note=serializer.validated_data.get("note", ""),
        )
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(ClientSerializer(client).data, status=response_status)


class ClientDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember, HasKarnetEnabled]

    def get_object(self, request, pk):
        return Client.objects.filter(id=pk, organization=request.user.organization).first()

    def get(self, request, pk):
        client = Client.objects.filter(id=pk, organization=request.user.organization).with_activity().first()
        if not client:
            return error_response("Client introuvable.", status.HTTP_404_NOT_FOUND)
        # Phase 7 — fiche client complète : compteurs calculés pour l'en-tête,
        # l'historique détaillé (passages, réservations) reste sur ses propres
        # endpoints (/checkins/?client=, /karnet/reservations/?client=) pour
        # profiter de leur pagination et de leurs filtres existants.
        return Response(ClientDetailSerializer(client).data)

    def patch(self, request, pk):
        client = self.get_object(request, pk)
        if not client:
            return error_response("Client introuvable.", status.HTTP_404_NOT_FOUND)
        serializer = ClientSerializer(client, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        # Modifier un numéro ou un e-mail ne doit pas créer un doublon : si une AUTRE fiche porte
        # déjà ce téléphone (sous n'importe quel format) ou cet e-mail, on refuse et on la désigne.
        duplicate = find_matching_client(
            client.organization,
            phone=serializer.validated_data.get("phone", ""),
            email=serializer.validated_data.get("email", ""),
            exclude_id=client.id,
        )
        if duplicate:
            return Response(
                {
                    "error": {"message": f"{duplicate.full_name} a déjà ce téléphone ou cet e-mail.", "code": "client_duplicate", "retryable": False},
                    "existing_client": {"id": str(duplicate.id), "full_name": duplicate.full_name},
                },
                status=status.HTTP_409_CONFLICT,
            )
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        if request.user.role not in ("BOSS", "GERANT"):
            self.permission_denied(request, message=IsBossOrGerant.message)
        client = self.get_object(request, pk)
        if not client:
            return error_response("Client introuvable.", status.HTTP_404_NOT_FOUND)
        if client.reservations.exists():
            return error_response("Ce client a des réservations liées : suppression impossible.", status.HTTP_409_CONFLICT)
        client.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ResourceListView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember, HasKarnetEnabled]

    def get(self, request):
        resources = Resource.objects.filter(organization=request.user.organization)
        if request.query_params.get("is_active"):
            resources = resources.filter(is_active=_as_bool(request.query_params["is_active"]))
        return Response(ResourceSerializer(resources, many=True).data)

    def post(self, request):
        if request.user.role not in ("BOSS", "GERANT"):
            self.permission_denied(request, message=IsBossOrGerant.message)
        serializer = ResourceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resource = serializer.save(organization=request.user.organization)
        return Response(ResourceSerializer(resource).data, status=status.HTTP_201_CREATED)


class ResourceDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember, HasKarnetEnabled]

    def get_object(self, request, pk):
        return Resource.objects.filter(id=pk, organization=request.user.organization).first()

    def get(self, request, pk):
        resource = self.get_object(request, pk)
        if not resource:
            return error_response("Ressource introuvable.", status.HTTP_404_NOT_FOUND)
        return Response(ResourceSerializer(resource).data)

    def patch(self, request, pk):
        if request.user.role not in ("BOSS", "GERANT"):
            self.permission_denied(request, message=IsBossOrGerant.message)
        resource = self.get_object(request, pk)
        if not resource:
            return error_response("Ressource introuvable.", status.HTTP_404_NOT_FOUND)
        serializer = ResourceSerializer(resource, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        if request.user.role not in ("BOSS", "GERANT"):
            self.permission_denied(request, message=IsBossOrGerant.message)
        resource = self.get_object(request, pk)
        if not resource:
            return error_response("Ressource introuvable.", status.HTTP_404_NOT_FOUND)
        if resource.reservations.exists():
            # Historique protégé (PROTECT) : on désactive plutôt que de bloquer sur une erreur d'intégrité.
            resource.is_active = False
            resource.save(update_fields=["is_active"])
            return Response(ResourceSerializer(resource).data)
        resource.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReservationListView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember, HasKarnetEnabled]

    def get_queryset(self, request):
        qs = Reservation.objects.filter(organization=request.user.organization).select_related("client", "resource")
        params = request.query_params
        if params.get("status"):
            qs = qs.filter(status=params["status"])
        if params.get("resource"):
            qs = qs.filter(resource_id=params["resource"])
        if params.get("client"):
            qs = qs.filter(client_id=params["client"])
        if params.get("is_paid"):
            qs = qs.filter(is_paid=_as_bool(params["is_paid"]))
        if params.get("has_slot") and _as_bool(params["has_slot"]):
            qs = qs.filter(ends_at__isnull=False)
        if params.get("reminder_due") and _as_bool(params["reminder_due"]):
            qs = qs.filter(status=Reservation.Status.EN_COURS, reminder_acknowledged=False, ends_at__lte=timezone.now())
        return qs

    def get(self, request):
        return Response(ReservationSerializer(self.get_queryset(request), many=True).data)

    def post(self, request):
        if not request.user.organization.capabilities["reservations"]:
            return error_response("La fonctionnalité Réservations n'est pas activée pour cet établissement.", status.HTTP_403_FORBIDDEN)

        serializer = ReservationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        organization = request.user.organization

        resource = Resource.objects.filter(id=data["resource"], organization=organization, is_active=True).first()
        if not resource:
            return error_response("Ressource introuvable ou inactive.", status.HTTP_404_NOT_FOUND)

        if data.get("client"):
            client = Client.objects.filter(id=data["client"], organization=organization).first()
            if not client:
                return error_response("Client introuvable.", status.HTTP_404_NOT_FOUND)
        else:
            client, _ = find_or_create_client(
                organization,
                full_name=data["client_name"],
                phone=data.get("client_phone", ""),
            )

        quantity = data["quantity"]
        starts_at = data.get("starts_at") or timezone.now()
        if resource.unit == Resource.Unit.HEURE:
            ends_at = starts_at + timedelta(hours=quantity)
        elif resource.unit == Resource.Unit.JOUR:
            ends_at = starts_at + timedelta(days=quantity)
        else:
            ends_at = None

        if ends_at is not None:
            conflict = Reservation.objects.filter(
                organization=organization, resource=resource, status=Reservation.Status.EN_COURS,
                starts_at__lt=ends_at, ends_at__gt=starts_at,
            ).exists()
            if conflict:
                return error_response("Cette ressource est déjà réservée sur ce créneau.", status.HTTP_409_CONFLICT)

        # On paie avant de consommer : l'encaissement est enregistré avec la
        # réservation, l'équipe n'a plus à le marquer à la main. Le créneau de
        # rappel (starts_at -> ends_at) existe dès cet instant : c'est la
        # réservation elle-même qui apparaît dans Rappels à son échéance.
        now = timezone.now()
        reservation = Reservation.objects.create(
            organization=organization, client=client, resource=resource, quantity=quantity,
            unit_price=resource.price, total_amount=resource.price * quantity,
            starts_at=starts_at, ends_at=ends_at, is_paid=True, paid_at=now, created_by=request.user,
        )
        return Response(ReservationSerializer(reservation).data, status=status.HTTP_201_CREATED)


class ReservationDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember, HasKarnetEnabled]

    def get_object(self, request, pk):
        return Reservation.objects.filter(id=pk, organization=request.user.organization).select_related("client", "resource").first()

    def get(self, request, pk):
        reservation = self.get_object(request, pk)
        if not reservation:
            return error_response("Réservation introuvable.", status.HTTP_404_NOT_FOUND)
        return Response(ReservationSerializer(reservation).data)

    def patch(self, request, pk):
        reservation = self.get_object(request, pk)
        if not reservation:
            return error_response("Réservation introuvable.", status.HTTP_404_NOT_FOUND)

        caps = request.user.organization.capabilities
        if "is_paid" in request.data and not caps["payments"]:
            return error_response("La fonctionnalité Paiements n'est pas activée pour cet établissement.", status.HTTP_403_FORBIDDEN)
        if "reminder_acknowledged" in request.data and not caps["rappels"]:
            return error_response("La fonctionnalité Rappels n'est pas activée pour cet établissement.", status.HTTP_403_FORBIDDEN)
        # Phase 9 — règle métier finale : encaisser un paiement reste ouvert à tout
        # membre de l'équipe (c'est le geste d'accueil du quotidien), mais annuler un
        # encaissement déjà enregistré est une correction sensible réservée à
        # Patron/Gérant, pour éviter qu'un Staff ne masque une recette par erreur.
        if request.data.get("is_paid") is False and reservation.is_paid and request.user.role not in ("BOSS", "GERANT"):
            self.permission_denied(request, message=IsBossOrGerant.message)

        serializer = ReservationUpdateSerializer(reservation, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        extra = {}
        if serializer.validated_data.get("is_paid") and not reservation.is_paid:
            extra["paid_at"] = timezone.now()
        serializer.save(**extra)
        return Response(ReservationSerializer(reservation).data)


class KarnetSummaryView(APIView):
    """GET /karnet/summary/ — quatre compteurs pour le guide « Premiers pas » (une requête au
    lieu de charger trois listes complètes juste pour savoir si elles sont vides)."""

    permission_classes = [IsAuthenticated, IsOrgMember, HasKarnetEnabled]

    def get(self, request):
        organization = request.user.organization
        reservations = Reservation.objects.filter(organization=organization).exclude(status=Reservation.Status.ANNULEE)
        return Response({
            "resources": Resource.objects.filter(organization=organization, is_active=True).count(),
            "clients": Client.objects.filter(organization=organization).count(),
            "reservations": reservations.count(),
            "paid_reservations": reservations.filter(is_paid=True).count(),
        })
