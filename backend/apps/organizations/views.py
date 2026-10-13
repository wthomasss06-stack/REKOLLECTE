import hashlib
import secrets
import time

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AuditEvent
from apps.common.permissions import IsBoss, IsOrgMember
from apps.common.responses import error_response

from .serializers import OrganizationKarnetUpdateSerializer, OrganizationSerializer, OrganizationUpdateSerializer
from .services import delete_organization


class MyOrganizationView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request):
        return Response(OrganizationSerializer(request.user.organization).data)

    def patch(self, request):
        self.check_object_permissions(request, request.user.organization)
        if request.user.role != "BOSS":
            self.permission_denied(request, message=IsBoss.message)

        serializer = OrganizationUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        organization = request.user.organization
        for field, value in serializer.validated_data.items():
            setattr(organization, field, value.strip() if isinstance(value, str) else value)
        if serializer.validated_data:
            organization.save(update_fields=list(serializer.validated_data.keys()))
        return Response(OrganizationSerializer(organization).data)


class RegenerateQRTokenView(APIView):
    permission_classes = [IsAuthenticated, IsBoss]

    def post(self, request):
        organization = request.user.organization
        organization.qr_secure_token = secrets.token_urlsafe(16)
        organization.save(update_fields=["qr_secure_token"])
        return Response(OrganizationSerializer(organization).data)


class CloudinarySignatureView(APIView):
    """Signe un upload image côté serveur sans exposer le secret Cloudinary."""

    permission_classes = [IsAuthenticated, IsOrgMember]

    def post(self, request):
        upload_kind = str(request.data.get("kind") or "branding").strip().lower()
        if upload_kind not in {"avatar", "branding"}:
            return error_response("Type d’image invalide.", status.HTTP_400_BAD_REQUEST)
        # La photo de profil est modifiable par tout membre actif. Le logo de
        # l’entreprise reste strictement réservé au Patron.
        if upload_kind == "branding" and request.user.role != "BOSS":
            self.permission_denied(request, message=IsBoss.message)
        cloud_name = getattr(settings, "CLOUDINARY_CLOUD_NAME", "").strip().strip("\"'")
        api_key = getattr(settings, "CLOUDINARY_API_KEY", "").strip().strip("\"'")
        api_secret = getattr(settings, "CLOUDINARY_API_SECRET", "").strip().strip("\"'")
        if not cloud_name or not api_key or not api_secret:
            return error_response("Cloudinary n’est pas configuré sur le serveur.", status.HTTP_503_SERVICE_UNAVAILABLE)
        timestamp = int(time.time())
        folder = f"qr-register/{request.user.organization_id}/{'avatars' if upload_kind == 'avatar' else 'branding'}"
        params = {"folder": folder, "timestamp": timestamp}
        # Cloudinary signe les paramètres triés sans URL-encoder le slash du
        # dossier : `folder=qr-register/<org>&timestamp=<unix>`. Utiliser
        # urlencode() ici transforme `/` en `%2F` et produit une signature
        # différente de celle recalculée par Cloudinary.
        string_to_sign = "&".join(f"{key}={value}" for key, value in sorted(params.items()))
        signature = hashlib.sha1(f"{string_to_sign}{api_secret}".encode("utf-8")).hexdigest()
        return Response({
            "cloud_name": cloud_name,
            "api_key": api_key,
            "timestamp": timestamp,
            "folder": folder,
            "signature": signature,
            "upload_url": f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload",
        })


class OrganizationLifecycleView(APIView):
    permission_classes = [IsAuthenticated, IsBoss]

    def patch(self, request):
        organization = request.user.organization
        organization.is_suspended = bool(request.data.get("is_suspended", not organization.is_suspended))
        organization.save(update_fields=["is_suspended"])
        return Response(OrganizationSerializer(organization).data)

    def delete(self, request):
        delete_organization(request.user.organization)
        return Response(status=204)


class OrganizationKarnetView(APIView):
    """Active/desactive le Niveau 2 KARNET et ses sous-capacites pour l'etablissement.
    Reserve au BOSS. Le frontend consomme uniquement `capabilities` dans la reponse —
    il ne decide jamais lui-meme de l'etat (cf. plan de bascule Niveau 1 -> Niveau 2)."""

    permission_classes = [IsAuthenticated, IsBoss]

    def patch(self, request):
        organization = request.user.organization
        serializer = OrganizationKarnetUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        update_fields = []

        if "karnet_enabled" in data and data["karnet_enabled"] != organization.karnet_enabled:
            previous = organization.karnet_enabled
            organization.karnet_enabled = data["karnet_enabled"]
            update_fields.append("karnet_enabled")
            AuditEvent.objects.create(
                organization=organization,
                actor=request.user,
                action="organization.karnet_enabled" if organization.karnet_enabled else "organization.karnet_disabled",
                metadata={"previous": previous, "next": organization.karnet_enabled},
            )

        if "capabilities" in data:
            previous_capabilities = dict(organization.karnet_capabilities)
            merged = {**organization.karnet_capabilities, **data["capabilities"]}
            if merged != organization.karnet_capabilities:
                organization.karnet_capabilities = merged
                update_fields.append("karnet_capabilities")
                AuditEvent.objects.create(
                    organization=organization,
                    actor=request.user,
                    action="organization.karnet_capability_updated",
                    metadata={"previous": previous_capabilities, "next": merged},
                )

        if update_fields:
            organization.save(update_fields=update_fields)
        return Response(OrganizationSerializer(organization).data)
