from django.urls import path

from .views import AccessPointDetailView, AccessPointListView, CheckInExportView, CheckInListView, CheckInStatsView, DocumentOcrView, FormTemplateDetailView, FormTemplateListView, FormTemplateView, PublicFormView, SyncCheckInsView

urlpatterns = [
    path("form-template/", FormTemplateView.as_view(), name="form-template"),
    path("form-templates/", FormTemplateListView.as_view(), name="form-templates"),
    path("form-templates/<uuid:form_id>/", FormTemplateDetailView.as_view(), name="form-template-detail"),
    path("access-points/", AccessPointListView.as_view(), name="access-points"),
    path("access-points/<uuid:point_id>/", AccessPointDetailView.as_view(), name="access-point-detail"),
    path("public/forms/<str:qr_token>/", PublicFormView.as_view(), name="public-form"),
    path("public/forms/<str:qr_token>/ocr/", DocumentOcrView.as_view(), name="public-form-ocr"),
    path("checkins/sync/", SyncCheckInsView.as_view(), name="checkins-sync"),
    path("checkins/", CheckInListView.as_view(), name="checkins-list"),
    path("checkins/stats/", CheckInStatsView.as_view(), name="checkins-stats"),
    path("checkins/export/", CheckInExportView.as_view(), name="checkins-export"),
]
