import logging
import re
import time
import uuid

from django.conf import settings
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger("qr_register.request")

_REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9._\-]{1,64}$")


class RequestBodyLimitMiddleware(MiddlewareMixin):
    """Refuse (413) un corps de requête API plus gros que `API_MAX_BODY_BYTES`, avant toute lecture.

    Django ne plafonne pas le corps lu en flux par DRF : sur les endpoints publics anonymes (synchronisation,
    OCR), un seul envoi géant suffisait à saturer la mémoire de l'instance."""

    def process_request(self, request):
        if not request.path.startswith("/api/"):
            return None
        try:
            length = int(request.META.get("CONTENT_LENGTH") or 0)
        except (TypeError, ValueError):
            length = 0
        if length > settings.API_MAX_BODY_BYTES:
            return JsonResponse({"detail": "Requête trop volumineuse.", "code": "payload_too_large"}, status=413)
        return None


class ApiTrailingSlashMiddleware(MiddlewareMixin):
    """Résout les URLs API avec ou sans slash sans rediriger les requêtes.

    Un ancien bundle frontend peut appeler ``/api/v1/auth/google`` alors que
    Django déclare ``/api/v1/auth/google/``. La redirection 301 de
    ``CommonMiddleware`` peut transformer le POST en GET et perdre son corps.
    On normalise donc ``PATH_INFO`` en interne, avant le résolveur.
    """

    def process_request(self, request):
        if (
            request.path.startswith("/api/")
            and request.path != "/api/"
            and not request.path.endswith("/")
        ):
            request.path_info = f"{request.path_info}/"
            request.path = f"{request.path}/"


class RequestCorrelationMiddleware(MiddlewareMixin):
    """Ajoute un identifiant de requête et journalise méthode, route, statut et durée."""

    def process_request(self, request):
        supplied = request.headers.get("X-Request-ID", "")
        # L'identifiant fourni par le client finit dans les logs et dans l'en-tête de réponse : on n'accepte qu'un format sûr.
        request.request_id = supplied if _REQUEST_ID_RE.match(supplied) else str(uuid.uuid4())
        request.request_started_at = time.monotonic()

    def process_response(self, request, response):
        request_id = getattr(request, "request_id", str(uuid.uuid4()))
        elapsed_ms = round((time.monotonic() - getattr(request, "request_started_at", time.monotonic())) * 1000, 2)
        response["X-Request-ID"] = request_id
        logger.info(
            "http_request",
            extra={"request_id": request_id, "method": request.method, "path": request.path, "status": response.status_code, "duration_ms": elapsed_ms},
        )
        return response
