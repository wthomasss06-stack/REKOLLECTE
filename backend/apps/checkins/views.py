import csv
import io
import re
import secrets
import uuid
from collections import Counter
from datetime import UTC, datetime, time

from django.db import IntegrityError, transaction
from django.http import StreamingHttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import generics, serializers, status, throttling
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsBoss, IsBossOrGerant, IsOrgMember
from apps.common.responses import error_response
from apps.organizations.models import Organization

from .alerts import build_alert_payload, public_fields_schema
from .models import AccessPoint, CheckIn, FormTemplate
from .ocr_utils import OCR_FIELDS, run_document_ocr
from .serializers import AccessPointSerializer, AccessPointWriteSerializer, CheckInSerializer, CheckInSyncItemSerializer, FormTemplateCreateSerializer, FormTemplateSerializer, PublicFormSerializer
from .services import default_template, resolve_target, sync_single_checkin

# Une seule règle pour « quel formulaire sert ce QR » : celle de la synchronisation (services.resolve_target).
resolve_public_target = resolve_target


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
        with transaction.atomic():
            # `AccessPoint.form_template` est en CASCADE : supprimer le formulaire supprimait AUSSI ses points d'accueil,
            # donc leurs QR Codes déjà imprimés cessaient de fonctionner sans prévenir. On les rattache à un autre formulaire.
            replacement = (
                request.user.organization.form_templates.exclude(id=template.id).filter(is_default=True).first()
                or request.user.organization.form_templates.exclude(id=template.id).filter(is_active=True).order_by("updated_at", "id").first()
                or request.user.organization.form_templates.exclude(id=template.id).order_by("updated_at", "id").first()
            )
            AccessPoint.objects.filter(form_template=template).update(form_template=replacement)
            if template.is_default and not replacement.is_default:
                replacement.is_default = True
                replacement.save(update_fields=["is_default"])
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
        name = serializer.validated_data["name"].strip()
        if request.user.organization.access_points.filter(name__iexact=name).exists():
            return error_response("Un point d’accueil porte déjà ce nom.", status.HTTP_400_BAD_REQUEST)
        try:
            point = serializer.save(organization=request.user.organization, secure_token=secrets.token_urlsafe(24))
        except IntegrityError:  # deux créations simultanées avec le même nom
            return error_response("Un point d’accueil porte déjà ce nom.", status.HTTP_400_BAD_REQUEST)
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
        new_name = serializer.validated_data.get("name")
        if new_name is not None and request.user.organization.access_points.filter(name__iexact=new_name.strip()).exclude(id=point.id).exists():
            return error_response("Un point d’accueil porte déjà ce nom.", status.HTTP_400_BAD_REQUEST)
        try:
            serializer.save()
        except IntegrityError:
            return error_response("Un point d’accueil porte déjà ce nom.", status.HTTP_400_BAD_REQUEST)
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
        data = {"organization_name": organization.name, "organization_logo_url": organization.logo_url, "visit_reasons": organization.visit_reasons or [], "fields_schema": public_fields_schema(template, organization), "form_id": template.id, "form_title": template.title, "access_point_id": access_point.id if access_point else None, "access_point_name": access_point.name if access_point else "Accueil principal"}
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
            if not isinstance(raw, dict):
                processed.append({"idempotency_key": None, "status": "invalid", "errors": {"non_field_errors": ["Fiche illisible."]}})
                continue
            serializer = CheckInSyncItemSerializer(data=raw)
            if not serializer.is_valid():
                processed.append({"idempotency_key": raw.get("idempotency_key"), "status": "invalid", "errors": serializer.errors})
                continue
            processed.append(sync_single_checkin(serializer.validated_data).as_dict())
        return Response({"synced_count": len(processed), "processed": processed})


class CheckInAlertsView(APIView):
    """Alertes d'arrivée pour l'espace connecté (interrogé toutes les quelques secondes tant que le tableau de bord est ouvert).

    `since` = le `cursor` renvoyé par l'appel précédent. Sans `since`, rien n'est renvoyé que le premier curseur : un tableau de
    bord qui s'ouvre ne rejoue pas tout l'historique. Le curseur est une heure SERVEUR (pas l'horloge du navigateur)."""

    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request):
        raw = request.query_params.get("since")
        since = None
        if raw:
            since = parse_datetime(raw)
            if since is None:
                return error_response("Paramètre « since » invalide (date ISO 8601 attendue).", status.HTTP_400_BAD_REQUEST)
            if timezone.is_naive(since):
                since = since.replace(tzinfo=UTC)
        return Response(build_alert_payload(request.user, since))


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


_DATE_ONLY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _query_datetime(raw: str, name: str, *, end_of_day: bool = False):
    """Date ou date-heure ISO d'un paramètre d'URL → datetime aware. Valeur invalide : 400 clair (et non 500).

    Une date seule (« 2026-05-10 ») couvre la journée entière : début de journée pour `from`, fin pour `to`."""
    raw = (raw or "").strip()
    try:
        if _DATE_ONLY_RE.match(raw):
            day = parse_date(raw)
            parsed = datetime.combine(day, time.max if end_of_day else time.min) if day else None
        else:
            parsed = parse_datetime(raw)
    except ValueError:
        parsed = None
    if parsed is None:
        raise serializers.ValidationError({name: "Date invalide (format attendu : AAAA-MM-JJ ou AAAA-MM-JJTHH:MM)."})
    return timezone.make_aware(parsed) if timezone.is_naive(parsed) else parsed


class CheckInListView(generics.ListAPIView):
    serializer_class = CheckInSerializer
    permission_classes = [IsAuthenticated, IsOrgMember]
    pagination_class = CheckInPagination

    def get_queryset(self):
        params = self.request.query_params
        queryset = CheckIn.objects.filter(organization=self.request.user.organization)
        if params.get("from"):
            queryset = queryset.filter(created_at_client__gte=_query_datetime(params["from"], "from"))
        if params.get("to"):
            queryset = queryset.filter(created_at_client__lte=_query_datetime(params["to"], "to", end_of_day=True))
        if params.get("client"):
            # Historique des passages d'une fiche client REKOLLECTE+ (phase 7).
            try:
                client_id = uuid.UUID(params["client"])
            except ValueError:
                raise serializers.ValidationError({"client": "Identifiant client invalide."})
            queryset = queryset.filter(client_id=client_id)
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


_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")
_PLAIN_NUMBER_RE = re.compile(r"^[+\-]?[\d\s().\-]+$")


def _csv_safe(value) -> str:
    """Valeur de cellule CSV sans risque d'injection de formule.

    Les réponses viennent de visiteurs anonymes : un nom saisi « =HYPERLINK(...) » s'exécuterait à l'ouverture du
    fichier dans Excel/Sheets chez le patron. On préfixe d'une apostrophe, sauf pour les numéros (+225 01 02…),
    qui ne contiennent aucune formule exploitable."""
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Oui" if value else "Non"
    if isinstance(value, (list, tuple)):
        value = ", ".join(str(item) for item in value)
    elif isinstance(value, dict):
        value = ", ".join(f"{key}: {item}" for key, item in value.items())
    text = str(value)
    if text.startswith(_FORMULA_PREFIXES) and not _PLAIN_NUMBER_RE.match(text):
        return "'" + text
    return text


def _document_summary(value) -> str:
    """Pièce scannée : seulement les champs extraits validés — ni l'image (base64, plusieurs Mo) ni le texte OCR brut."""
    if not isinstance(value, dict):
        return ""
    extracted = value.get("extracted")
    if not isinstance(extracted, dict):
        return ""
    return ", ".join(f"{key}: {item}" for key, item in extracted.items() if item)


class CheckInExportView(APIView):
    permission_classes = [IsAuthenticated, IsBossOrGerant]

    def get(self, request):
        organization = request.user.organization
        # Colonnes dédupliquées par identifiant de champ : le même champ (« nom ») présent dans plusieurs formulaires
        # produisait autant de colonnes, avec la valeur répétée.
        columns: dict[str, dict] = {}
        for template in organization.form_templates.all():
            for field in template.fields_schema:
                field_id = field.get("id")
                if field_id and field_id not in columns:
                    columns[field_id] = field
        queryset = CheckIn.objects.filter(organization=organization).iterator()

        def rows():
            yield "\ufeff" + _csv_row(["Heure d'arrivée"] + [_csv_safe(f.get("label", f["id"])) for f in columns.values()])  # BOM : accents corrects dans Excel
            for checkin in queryset:
                row = [checkin.created_at_client.strftime("%d/%m/%Y %H:%M")]
                responses = checkin.responses if isinstance(checkin.responses, dict) else {}
                for field_id, field in columns.items():
                    kind = field.get("type")
                    if kind == "signature":
                        row.append("Signé" if checkin.signature_blob else "")
                    elif kind == "photo":
                        row.append("Fourni" if responses.get(field_id) else "")  # jamais d'image dans le CSV
                    elif kind == "document_scan":
                        row.append(_csv_safe(_document_summary(responses.get(field_id))))
                    elif kind == "checkbox":
                        row.append("Oui" if responses.get(field_id) else "")
                    else:
                        row.append(_csv_safe(responses.get(field_id, "")))
                yield _csv_row(row)

        response = StreamingHttpResponse(rows(), content_type="text/csv; charset=utf-8")
        safe_name = "".join(c for c in organization.name if c.isalnum() or c in " -_").strip() or "etablissement"
        response["Content-Disposition"] = f'attachment; filename="registre_{safe_name}.csv"'
        response["Cache-Control"] = "no-store"
        return response


def _csv_row(values: list) -> str:
    buffer = io.StringIO()
    csv.writer(buffer).writerow(values)
    return buffer.getvalue()
