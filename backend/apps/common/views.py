from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    """Sonde de disponibilite — verifie que l'API et la base de donnees repondent.
    Utilisee par le monitoring de la plateforme d'hebergement (Render/Railway)."""
    permission_classes = [AllowAny]
    # Sonde appelée en boucle par le frontend (réveil du serveur, relance de la synchronisation) et par Render :
    # ni authentification (un jeton périmé ne doit pas la faire échouer en 401) ni limiteur de débit (un 429 sur
    # une IP partagée était pris pour « serveur éteint » et bloquait l'application jusqu'à 3 minutes).
    authentication_classes = []
    throttle_classes = []

    def get(self, request):
        try:
            connection.ensure_connection()
            db_ok = True
        except Exception:
            db_ok = False
        status_code = 200 if db_ok else 503
        return Response({"status": "ok" if db_ok else "degraded", "database": db_ok}, status=status_code)
