from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.common.views import HealthCheckView

urlpatterns = [
    path("api/v1/health/", HealthCheckView.as_view(), name="health"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/org/", include("apps.organizations.urls")),
    path("api/v1/", include("apps.checkins.urls")),
    path("api/v1/", include("apps.feedback.urls")),
    path("api/v1/karnet/", include("apps.karnet.urls")),
    path("api/v1/analytics/", include("apps.analytics.urls")),
]

if settings.DJANGO_ADMIN_URL:
    urlpatterns.insert(0, path(settings.DJANGO_ADMIN_URL, admin.site.urls))

# Schéma et Swagger décrivent toute l'API (routes, champs, rôles) : pas de vitrine publique en production.
if settings.EXPOSE_API_DOCS:
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    ]
