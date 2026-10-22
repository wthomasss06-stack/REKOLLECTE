import csv
import io
import re
import secrets
import uuid
from collections import Counter
from datetime import UTC, datetime, time

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.db.models.fields.json import KeyTextTransform
from django.http import StreamingHttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import generics, serializers, status, throttling
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AuditEvent
from apps.billing.services import apply_history_window, enforce_feature, enforce_limit
from apps.common.permissions import IsBoss, IsBossOrGerant, IsOrgMember
from apps.common.responses import error_response
from apps.organizations.models import Organization

from .alerts import build_alert_payload, public_fields_schema
from .models import AccessPoint, CheckIn, FormTemplate
from .privacy import (
    build_privacy_notice, delete_subject_data, export_subject_data, public_schema, public_visit_reasons, retention_policy,
)
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
        enforce_limit(request.user.organization, "forms", request.user.organization.form_templates.count())
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
        enforce_limit(request.user.organization, "access_points", request.user.organization.access_points.count())
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
        fields = public_schema(template, organization)
        data = {"organization_name": organization.name, "organization_logo_url": organization.logo_url, "visit_reasons": public_visit_reasons(organization), "fields_schema": fields, "privacy_notice": build_privacy_notice(organization, fields), "form_id": template.id, "form_title": template.title, "access_point_id": access_point.id if access_point else None, "access_point_name": access_point.name if access_point else "Accueil principal"}
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


# Types de champ dont la valeur est un texte que le patron peut chercher. Photos, signatures et pièces scannées en sont exclues :
# ce sont des images en base64, sans intérêt pour une recherche et très coûteuses à parcourir.
SEARCHABLE_FIELD_TYPES = ("text", "phone", "email", "number", "date", "select", "host")
MAX_SEARCH_LENGTH = 100
MAX_SEARCH_FIELDS = 40


def _searchable_field_ids(organization: Organization) -> list[str]:
    """Identifiants des champs textuels de TOUS les formulaires de l'établissement (+ la précision d'un choix « Autre »)."""
    ids: list[str] = []
    for schema in organization.form_templates.values_list("fields_schema", flat=True):
        for field in schema or []:
            if not isinstance(field, dict) or field.get("type") not in SEARCHABLE_FIELD_TYPES:
                continue
            field_id = field.get("id")
            if not isinstance(field_id, str) or not field_id:
                continue
            for candidate in (field_id, f"{field_id}_autre") if field.get("type") == "select" else (field_id,):
                if candidate not in ids:
                    ids.append(candidate)
    return ids[:MAX_SEARCH_FIELDS]


def _apply_search(queryset, organization: Organization, term: str):
    """Recherche texte dans le registre : nom du client REKOLLECTE+ et valeurs des champs textuels.

    On cible chaque champ par son identifiant (KeyTextTransform) au lieu de chercher dans tout le JSON : sinon « nom » trouverait
    toutes les fiches (c'est le nom d'une clé), et la recherche parcourrait les photos en base64."""
    aliases = {f"search_{index}": KeyTextTransform(field_id, "responses") for index, field_id in enumerate(_searchable_field_ids(organization))}
    condition = Q(client__full_name__icontains=term)
    for alias in aliases:
        condition |= Q(**{f"{alias}__icontains": term})
    return queryset.annotate(**aliases).filter(condition)


class CheckInListView(generics.ListAPIView):
    serializer_class = CheckInSerializer
    permission_classes = [IsAuthenticated, IsOrgMember]
    pagination_class = CheckInPagination

    def get_queryset(self):
        params = self.request.query_params
        # select_related : le nom du client est lu pour chaque ligne (sinon une requête SQL par fiche affichée).
        queryset = CheckIn.objects.filter(organization=self.request.user.organization).select_related("client")
        queryset = apply_history_window(queryset, self.request.user.organization)  # fenêtre d'AFFICHAGE du plan : rien n'est supprimé
        term = (params.get("q") or "").strip()[:MAX_SEARCH_LENGTH]
        if term:
            queryset = _apply_search(queryset, self.request.user.organization, term)
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
        checkins = list(apply_history_window(CheckIn.objects.filter(organization=organization), organization).select_related("form_template").only("responses", "created_at_client", "form_template__fields_schema"))
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
        if request.query_params.get("purpose") == "exit":
            # Export de SORTIE (réversibilité, droit d'accès) : toujours disponible, quel que soit le plan ou l'état de l'abonnement.
            AuditEvent.objects.create(organization=organization, actor=request.user, action="export.exit", metadata={})
        else:
            enforce_feature(organization, "export_csv")
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
                        value = responses.get(field_id, "")
                        other = responses.get(f"{field_id}_autre") if kind == "select" and value == "Autre" else None
                        if isinstance(other, str) and other.strip():
                            value = f"Autre : {other.strip()}"  # la précision du visiteur n'apparaissait pas dans l'export
                        row.append(_csv_safe(value))
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


class RetentionPolicyView(APIView):
    """Durées de conservation en vigueur pour l'établissement (visites, fiches clients, journaux, paiements)."""

    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request):
        return Response(retention_policy(request.user.organization))


class SubjectExportView(APIView):
    """Export complet des données d'UNE personne (droit d'accès), retrouvée par téléphone ou e-mail exacts. Patron seulement."""

    permission_classes = [IsAuthenticated, IsBoss]
    throttle_classes = [throttling.UserRateThrottle]

    def post(self, request):
        organization = request.user.organization
        try:
            data = export_subject_data(organization, str(request.data.get("phone") or ""), str(request.data.get("email") or ""))
        except ValueError as error:
            return error_response(str(error), status.HTTP_400_BAD_REQUEST)
        AuditEvent.objects.create(organization=organization, actor=request.user, action="privacy.subject_exported",
                                  metadata={"checkins": len(data["checkins"]), "clients": len(data["clients"])})
        response = Response(data)
        response["Cache-Control"] = "no-store"
        return response


class SubjectDeleteView(APIView):
    """Suppression complète des données d'UNE personne (droit à l'effacement). Exige `confirm: true`. Patron seulement."""

    permission_classes = [IsAuthenticated, IsBoss]
    throttle_classes = [throttling.UserRateThrottle]

    def post(self, request):
        if request.data.get("confirm") is not True:
            return error_response("Confirmation requise : la suppression est définitive.", status.HTTP_400_BAD_REQUEST)
        try:
            result = delete_subject_data(request.user.organization, str(request.data.get("phone") or ""), str(request.data.get("email") or ""), actor=request.user)
        except ValueError as error:
            return error_response(str(error), status.HTTP_400_BAD_REQUEST)
        return Response(result)

