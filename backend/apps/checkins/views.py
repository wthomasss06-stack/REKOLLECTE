import csv
import secrets
from collections import Counter

from django.db import transaction
from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework import generics, status, throttling
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsBoss, IsBossOrGerant, IsOrgMember
from apps.common.responses import error_response
from apps.organizations.models import Organization

from .models import AccessPoint, CheckIn, FormTemplate
from .ocr_utils import OCR_FIELDS, run_document_ocr
from .serializers import AccessPointSerializer, AccessPointWriteSerializer, CheckInSerializer, CheckInSyncItemSerializer, FormTemplateCreateSerializer, FormTemplateSerializer, PublicFormSerializer
from .services import sync_single_checkin


def default_template(organization):
    return organization.form_templates.filter(is_default=True).first() or organization.form_templates.filter(is_active=True).order_by("updated_at").first()


def resolve_public_target(qr_token):
    access_point = AccessPoint.objects.select_related("organization", "form_template").filter(secure_token=qr_token, is_active=True, organization__is_suspended=False).first()
    if access_point:
        # Le point créé automatiquement pour le QR général partage le token
        # de l'organisation : il doit suivre le formulaire par défaut.
        if access_point.secure_token == access_point.organization.qr_secure_token:
            return access_point.organization, default_template(access_point.organization), access_point
        return access_point.organization, access_point.form_template, access_point
    organization = Organization.objects.filter(qr_secure_token=qr_token, is_suspended=False).first()
    if not organization:
        return None, None, None
    return organization, default_template(organization), None


class FormTemplateView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request):
        template = default_template(request.user.organization)
        if not template:
            return error_response("Aucun formulaire configuré pour cet établissement.", status.HTTP_404_NOT_FOUND)
        return Response(FormTemplateSerializer(template).data)

    def put(self, request):
        if request.user.role not in ("BOSS", "GERANT"):
            self.permission_denied(request, message=IsBossOrGerant.message)
        template = default_template(request.user.organization)
        if not template:
            template = FormTemplate.objects.create(organization=request.user.organization, title="Registre d'accès", is_default=True)
        serializer = FormTemplateSerializer(template, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(version=template.version + 1)
        return Response(serializer.data)


class FormTemplateListView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request):
        return Response(FormTemplateSerializer(request.user.organization.form_templates.all(), many=True).data)

    def post(self, request):
        if request.user.role not in ("BOSS", "GERANT"):
            self.permission_denied(request, message=IsBossOrGerant.message)
        serializer = FormTemplateCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if data.get("is_default"):
            request.user.organization.form_templates.update(is_default=False)
        template = serializer.save(organization=request.user.organization)
        return Response(FormTemplateSerializer(template).data, status=status.HTTP_201_CREATED)


class FormTemplateDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember]

    def patch(self, request, form_id):
        if request.user.role not in ("BOSS", "GERANT"):
            self.permission_denied(request, message=IsBossOrGerant.message)
        template = FormTemplate.objects.filter(id=form_id, organization=request.user.organization).first()
        if not template:
            return error_response("Formulaire introuvable.", status.HTTP_404_NOT_FOUND)
        serializer = FormTemplateSerializer(template, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get("is_default"):
            request.user.organization.form_templates.exclude(id=template.id).update(is_default=False)
        serializer.save(version=template.version + 1)
        return Response(serializer.data)

    def delete(self, request, form_id):
        if request.user.role != "BOSS":
            self.permission_denied(request, message=IsBoss.message)
        template = FormTemplate.objects.filter(id=form_id, organization=request.user.organization).first()
        if not template:
            return Response(status=404)
        if request.user.organization.form_templates.count() <= 1:
            return error_response("Un établissement doit conserver au moins un formulaire.", status.HTTP_400_BAD_REQUEST)
        template.delete()
        return Response(status=204)


class AccessPointListView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request):
        return Response(AccessPointSerializer(request.user.organization.access_points.select_related("form_template"), many=True).data)

    def post(self, request):
        if request.user.role not in ("BOSS", "GERANT"):
            self.permission_denied(request, message=IsBossOrGerant.message)
        serializer = AccessPointWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        form = FormTemplate.objects.filter(id=serializer.validated_data["form_template"].id, organization=request.user.organization).first()
        if not form:
            return error_response("Formulaire invalide pour cet établissement.", status.HTTP_400_BAD_REQUEST)
        point = serializer.save(organization=request.user.organization, secure_token=secrets.token_urlsafe(24))
        return Response(AccessPointSerializer(point).data, status=201)


class AccessPointDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember]

    def patch(self, request, point_id):
        if request.user.role not in ("BOSS", "GERANT"):
            self.permission_denied(request, message=IsBossOrGerant.message)
        point = AccessPoint.objects.filter(id=point_id, organization=request.user.organization).first()
        if not point:
            return Response(status=404)
        serializer = AccessPointWriteSerializer(point, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if "form_template" in serializer.validated_data and serializer.validated_data["form_template"].organization_id != request.user.organization.id:
            return error_response("Formulaire invalide pour cet établissement.", status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(AccessPointSerializer(point).data)

    def delete(self, request, point_id):
        if request.user.role != "BOSS":
            self.permission_denied(request, message=IsBoss.message)
        point = AccessPoint.objects.filter(id=point_id, organization=request.user.organization).first()
        if not point:
            return Response(status=404)
        if request.user.organization.access_points.count() <= 1:
            return error_response("Un établissement doit conserver un point d’accueil.", status.HTTP_400_BAD_REQUEST)
        point.delete()
        return Response(status=204)


class PublicFormView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [throttling.AnonRateThrottle]

    def get(self, request, qr_token):
        organization, template, access_point = resolve_public_target(qr_token)
        if not organization:
            return error_response("QR Code invalide ou désactivé.", status.HTTP_404_NOT_FOUND)
        if not template or not template.is_active:
            return error_response("Aucun formulaire actif pour ce point d’accueil.", status.HTTP_404_NOT_FOUND)
        if access_point:
            AccessPoint.objects.filter(id=access_point.id).update(last_seen_at=timezone.now())
        data = {"organization_name": organization.name, "organization_logo_url": organization.logo_url, "visit_reasons": organization.visit_reasons or [], "fields_schema": template.fields_schema, "form_id": template.id, "form_title": template.title, "access_point_id": access_point.id if access_point else None, "access_point_name": access_point.name if access_point else "Accueil principal"}
        return Response(PublicFormSerializer(data).data)


class SyncCheckInsView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [throttling.AnonRateThrottle]
    MAX_BATCH_SIZE = 50

    def post(self, request):
        items = request.data.get("checkins", [])
        if not isinstance(items, list) or len(items) > self.MAX_BATCH_SIZE:
            return error_response(f"Lot invalide (maximum {self.MAX_BATCH_SIZE} fiches par envoi).", status.HTTP_400_BAD_REQUEST)
        processed = []
        for raw in items:
            serializer = CheckInSyncItemSerializer(data=raw)
            if not serializer.is_valid():
                processed.append({"idempotency_key": raw.get("idempotency_key"), "status": "invalid", "errors": serializer.errors})
                continue
            processed.append(sync_single_checkin(serializer.validated_data).as_dict())
        return Response({"synced_count": len(processed), "processed": processed})


class DocumentOcrView(APIView):
    """Lecture OCR côté serveur d'une pièce d'identité (CNI, passeport) envoyée
    par un visiteur au formulaire QR. Remplace tesseract.js côté navigateur
    (trop lent sur les téléphones d'entrée de gamme, voir DocumentScanner.tsx)
    — Tesseract tourne ici sur le serveur, avec un throttle dédié plus strict
    que les autres endpoints publics car chaque appel coûte du CPU."""

    permission_classes = [AllowAny]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "ocr"
    MAX_IMAGE_B64_CHARS = 8_000_000  # ~6 Mo décodés, large marge sur une photo compressée en jpeg

    def post(self, request, qr_token):
        organization, template, _ = resolve_public_target(qr_token)
        if not organization:
            return error_response("QR Code invalide ou désactivé.", status.HTTP_404_NOT_FOUND)

        image = request.data.get("image")
        if not isinstance(image, str) or not image:
            return error_response("Image manquante.", status.HTTP_400_BAD_REQUEST)
        if len(image) > self.MAX_IMAGE_B64_CHARS:
            return error_response("Image trop volumineuse.", status.HTTP_400_BAD_REQUEST)

        fields = request.data.get("fields", [])
        if not isinstance(fields, list):
            fields = []
        fields = [f for f in fields if f in OCR_FIELDS] or list(OCR_FIELDS)

        result = run_document_ocr(image, fields)
        # L'image n'est jamais écrite sur disque ni en base ici : elle n'existe
        # que le temps de cette requête, décodée en mémoire puis jetée avec la
        # réponse HTTP (durée de conservation des documents encore à trancher
        # côté produit — voir le rapport de fusion — donc on ne conserve rien
        # par défaut).
        return Response(result)


class CheckInPagination(PageNumberPagination):
    # La base ne renvoie plus un lot fixe de 100 lignes : le dashboard demande
    # 20 lignes sur desktop et 10 sur mobile, page par page.
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50


class CheckInListView(generics.ListAPIView):
    serializer_class = CheckInSerializer
    permission_classes = [IsAuthenticated, IsOrgMember]
    pagination_class = CheckInPagination

    def get_queryset(self):
        queryset = CheckIn.objects.filter(organization=self.request.user.organization)
        if self.request.query_params.get("from"):
            queryset = queryset.filter(created_at_client__gte=self.request.query_params["from"])
        if self.request.query_params.get("to"):
            queryset = queryset.filter(created_at_client__lte=self.request.query_params["to"])
        if self.request.query_params.get("client"):
            # Historique des passages d'une fiche client REKOLLECTE+ (phase 7).
            queryset = queryset.filter(client_id=self.request.query_params["client"])
        return queryset


class CheckInStatsView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request):
        organization = request.user.organization
        checkins = list(CheckIn.objects.filter(organization=organization).select_related("form_template").only("responses", "created_at_client", "form_template__fields_schema"))
        today, hourly, reasons = timezone.localdate(), Counter(), Counter()
        for checkin in checkins:
            local_date = timezone.localtime(checkin.created_at_client); hourly[local_date.hour] += 1
            for field in (checkin.form_template.fields_schema if checkin.form_template else []):
                if field.get("type") == "select" and any(word in f"{field.get('id', '')} {field.get('label', '')}".lower() for word in ("motif", "raison", "occasion")):
                    value = checkin.responses.get(field["id"])
                    if isinstance(value, str) and value.strip() and value != "Autre": reasons[value.strip()] += 1
        peak_hour = f"{hourly.most_common(1)[0][0]:02d}h–{(hourly.most_common(1)[0][0] + 1) % 24:02d}h" if hourly else None
        return Response({"total": len(checkins), "today": sum(1 for item in checkins if timezone.localtime(item.created_at_client).date() == today), "peak_hour": peak_hour, "hourly": [{"hour": hour, "count": hourly[hour]} for hour in range(24) if hourly[hour]], "frequent_reasons": [{"label": label, "count": count} for label, count in reasons.most_common(8)]})


class CheckInExportView(APIView):
    permission_classes = [IsAuthenticated, IsBossOrGerant]

    def get(self, request):
        organization = request.user.organization
        templates = list(organization.form_templates.all())
        fields = [field for template in templates for field in template.fields_schema]
        queryset = CheckIn.objects.filter(organization=organization).iterator()
        def rows():
            yield _csv_row(["Heure d'arrivée"] + [f["label"] for f in fields])
            for checkin in queryset:
                row = [checkin.created_at_client.strftime("%d/%m/%Y %H:%M")]
                for field in fields:
                    row.append("Signé" if field["type"] == "signature" and checkin.signature_blob else ("Oui" if field["type"] == "checkbox" and checkin.responses.get(field["id"]) else checkin.responses.get(field["id"], "")))
                yield _csv_row(row)
        response = StreamingHttpResponse(rows(), content_type="text/csv; charset=utf-8")
        safe_name = "".join(c for c in organization.name if c.isalnum() or c in " -_").strip() or "etablissement"
        response["Content-Disposition"] = f'attachment; filename="registre_{safe_name}.csv"'
        return response


def _csv_row(values: list) -> str:
    import io
    buffer = io.StringIO(); csv.writer(buffer).writerow(values); return buffer.getvalue()
