from django.urls import path

from .views import (
    ClientDetailView,
    ClientListView,
    KarnetSummaryView,
    ReservationDetailView,
    ReservationListView,
    ResourceDetailView,
    ResourceListView,
)

urlpatterns = [
    path("summary/", KarnetSummaryView.as_view(), name="karnet-summary"),
    path("clients/", ClientListView.as_view(), name="karnet-clients"),
    path("clients/<uuid:pk>/", ClientDetailView.as_view(), name="karnet-client-detail"),
    path("resources/", ResourceListView.as_view(), name="karnet-resources"),
    path("resources/<uuid:pk>/", ResourceDetailView.as_view(), name="karnet-resource-detail"),
    path("reservations/", ReservationListView.as_view(), name="karnet-reservations"),
    path("reservations/<uuid:pk>/", ReservationDetailView.as_view(), name="karnet-reservation-detail"),
]
